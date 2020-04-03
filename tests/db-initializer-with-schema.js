const _ = require('lodash');
const os = require('os');
const path = require('path');
const Knex = require('knex');
const Promise = require('bluebird');
const objection = require('objection');

const SCHEMA = 'test';

module.exports = {
  initialize: function (knexConfig) {
    const knex = Knex(knexConfig);
    return {
      config: knexConfig,
      models: createModels(knex),
      knex: knex,
    };
  },

  dropDb: function (session) {
    return session.knex.schema
      .dropTableIfExists(`${SCHEMA}.Person_Movie`)
      .dropTableIfExists(`${SCHEMA}.Movie`)
      .dropTableIfExists(`${SCHEMA}.Animal`)
      .dropTableIfExists(`${SCHEMA}.Person`);
  },

  createDb: function (session) {
    return session.knex
      .raw(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`)
      .then(() => {
        return session.knex.schema
          .createTableIfNotExists(`${SCHEMA}.Person`, function (table) {
            table.bigincrements('id').unsigned().primary();
            table.integer('age');
            table.biginteger('pid').unsigned().references('id').on(`${SCHEMA}.Person`).index();
            table.string('firstName');
            table.string('lastName');
          })
          .createTableIfNotExists(`${SCHEMA}.Animal`, function (table) {
            table.bigincrements('id').unsigned().primary();
            table.biginteger('ownerId').unsigned().references('id').on(`${SCHEMA}.Person`).index();
            table.string('name').index();
          })
          .createTableIfNotExists(`${SCHEMA}.Movie`, function (table) {
            table.bigincrements('id').unsigned().primary();
            table.string('name').index();
          })
          .createTableIfNotExists(`${SCHEMA}.Person_Movie`, function (table) {
            table.bigincrements('id').unsigned().primary();
            table.biginteger('actorId').unsigned().references('id').on(`${SCHEMA}.Person`).index();
            table.biginteger('movieId').unsigned().references('id').on(`${SCHEMA}.Movie`).index();
          });
      })
      .then(function () {
        if (session.config.client === 'postgres') {
          // Index to speed up wildcard searches.
          return Promise.join(
            session.knex.raw(
              `CREATE INDEX "movie_name_wildcard_index" ON ${SCHEMA}."Movie" USING btree ("name" varchar_pattern_ops)`
            ),
            session.knex.raw(
              `CREATE INDEX "animal_name_wildcard_index" ON ${SCHEMA}."Animal" USING btree ("name" varchar_pattern_ops)`
            )
          );
        }
      });
  },

  insertData: function (session, counts, progress) {
    progress = progress || _.noop;

    const C = 30;
    const P = counts.persons;
    const A = counts.pets;
    const M = counts.movies;
    const zeroPad = createZeroPad(Math.max(P * A, P * M));

    const persons = _.times(P, function (p) {
      return session.models.Person.fromJson({
        id: p + 1,
        firstName: 'F' + zeroPad(p),
        lastName: 'L' + zeroPad(P - p - 1),
        age: p * 10,

        pets: _.times(A, function (a) {
          const id = p * A + a + 1;
          return { id: id, name: 'P' + zeroPad(id - 1), ownerId: p + 1 };
        }),

        movies: _.times(M, function (m) {
          const id = p * M + m + 1;
          return { id: id, name: 'M' + zeroPad(P * M - id) };
        }),

        personMovies: _.times(M, function (m) {
          const id = p * M + m + 1;
          return { actorId: p + 1, movieId: id };
        }),
      });
    });

    return Promise.all(
      _.map(_.chunk(persons, C), function (personChunk) {
        return session
          .knex(`${SCHEMA}.Person`)
          .insert(pick(personChunk, ['id', 'firstName', 'lastName', 'age']));
      })
    )
      .then(function () {
        return session
          .knex(`${SCHEMA}.Person`)
          .update('pid', session.knex.raw('id - 1'))
          .where('id', '>', 1);
      })
      .then(function () {
        progress('1/4');
        return Promise.all(
          _.map(_.chunk(_.flatten(_.map(persons, 'pets')), C), function (animalChunk) {
            return session.knex(`${SCHEMA}.Animal`).insert(animalChunk);
          })
        );
      })
      .then(function () {
        progress('2/4');
        return Promise.all(
          _.map(_.chunk(_.flatten(_.map(persons, 'movies')), C), function (movieChunk) {
            return session.knex(`${SCHEMA}.Movie`).insert(movieChunk);
          })
        );
      })
      .then(function () {
        progress('3/4');
        return Promise.all(
          _.map(_.chunk(_.flatten(_.map(persons, 'personMovies')), C), function (movieChunk) {
            return session.knex(`${SCHEMA}.Person_Movie`).insert(movieChunk);
          })
        );
      })
      .then(function () {
        progress('4/4');
      });
  },
};

function createModels(knex) {
  class Person extends objection.Model {
    static get tableName() {
      return `${SCHEMA}.Person`;
    }
  }

  class Animal extends objection.Model {
    static get tableName() {
      return `${SCHEMA}.Animal`;
    }
  }

  class Movie extends objection.Model {
    static get tableName() {
      return `${SCHEMA}.Movie`;
    }
  }

  Person.knex(knex);
  Animal.knex(knex);
  Movie.knex(knex);

  Person.prototype.fullName = function () {
    return this.firstName + ' ' + this.lastName;
  };

  Person.relationMappings = {
    parent: {
      relation: objection.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: `${SCHEMA}.Person.pid`,
        to: `${SCHEMA}.Person.id`,
      },
    },

    pets: {
      relation: objection.HasManyRelation,
      modelClass: Animal,
      join: {
        from: `${SCHEMA}.Person.id`,
        to: `${SCHEMA}.Animal.ownerId`,
      },
    },

    movies: {
      relation: objection.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: `${SCHEMA}.Person.id`,
        through: {
          from: `${SCHEMA}.Person_Movie.actorId`,
          to: `${SCHEMA}.Person_Movie.movieId`,
        },
        to: `${SCHEMA}.Movie.id`,
      },
    },
  };

  return {
    Person: Person,
    Animal: Animal,
    Movie: Movie,
  };
}

function createZeroPad(N) {
  // log(x) / log(10) == log10(x)
  const n = Math.ceil(Math.log(N) / Math.log(10));

  return function (num) {
    num = num.toString();

    while (num.length < n) {
      num = '0' + num;
    }

    return num;
  };
}

function pick(arr, picks) {
  return _.map(arr, function (obj) {
    return _.pick(obj, picks);
  });
}
