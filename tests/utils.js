const _ = require('lodash');
const Knex = require('knex');
const Promise = require('bluebird');
const objection = require('objection');

const TestDatabaseConfigs = require('./TestDatabaseConfigs');

module.exports = {
  testDatabaseConfigs: [
    TestDatabaseConfigs.SQLITE_CONFIG,
    TestDatabaseConfigs.POSTGRESQL_CONFIG,
    TestDatabaseConfigs.MYSQL_CONFIG
  ],

  initialize: function(knexConfig) {
    const knex = Knex(knexConfig);
    return {
      config: knexConfig,
      models: createModels(knex),
      knex: knex
    };
  },

  dropDb: function(session) {
    return session.knex.schema
      .dropTableIfExists('Person_Movie')
      .dropTableIfExists('Movie')
      .dropTableIfExists('Animal')
      .dropTableIfExists('Person');
  },

  createDb: function(session) {
    return session.knex.schema
      .createTableIfNotExists('Person', function(table) {
        table
          .bigincrements('id')
          .unsigned()
          .primary();
        table.integer('age');
        table
          .biginteger('pid')
          .unsigned()
          .references('Person.id')
          .index();
        table.string('firstName');
        table.string('lastName');
        table.integer('group');
      })
      .createTableIfNotExists('Animal', function(table) {
        table
          .bigincrements('id')
          .unsigned()
          .primary();
        table
          .biginteger('ownerId')
          .unsigned()
          .references('Person.id')
          .index();
        table.string('name').index();
      })
      .createTableIfNotExists('Movie', function(table) {
        table
          .bigincrements('id')
          .unsigned()
          .primary();
        table.string('name').index();
      })
      .createTableIfNotExists('Person_Movie', function(table) {
        table
          .bigincrements('id')
          .unsigned()
          .primary();
        table
          .biginteger('actorId')
          .unsigned()
          .references('Person.id')
          .index();
        table
          .biginteger('movieId')
          .unsigned()
          .references('Movie.id')
          .index();
      })
      .then(function() {
        if (session.config.client === 'postgres') {
          // Index to speed up wildcard searches.
          return Promise.join(
            session.knex.raw(
              'CREATE INDEX "movie_name_wildcard_index" ON "Movie" USING btree ("name" varchar_pattern_ops)'
            ),
            session.knex.raw(
              'CREATE INDEX "animal_name_wildcard_index" ON "Animal" USING btree ("name" varchar_pattern_ops)'
            )
          );
        }
      });
  },

  insertData: function(session, counts, progress) {
    progress = progress || _.noop;

    const C = 30;
    const P = counts.persons;
    const A = counts.pets;
    const M = counts.movies;
    const zeroPad = createZeroPad(Math.max(P * A, P * M));

    const persons = _.times(P, function(p) {
      return session.models.Person.fromJson({
        id: p + 1,
        firstName: 'F' + zeroPad(p),
        lastName: 'L' + zeroPad(P - p - 1),
        age: p * 10,
        group: p % 3,

        pets: _.times(A, function(a) {
          const id = p * A + a + 1;
          return { id: id, name: 'P' + zeroPad(id - 1), ownerId: p + 1 };
        }),

        movies: _.times(M, function(m) {
          const id = p * M + m + 1;
          return { id: id, name: 'M' + zeroPad(P * M - id) };
        }),

        personMovies: _.times(M, function(m) {
          const id = p * M + m + 1;
          return { actorId: p + 1, movieId: id };
        })
      });
    });

    return Promise.all(
      _.map(_.chunk(persons, C), function(personChunk) {
        return session
          .knex('Person')
          .insert(pick(personChunk, ['id', 'firstName', 'lastName', 'age', 'group']));
      })
    )
      .then(function() {
        return session
          .knex('Person')
          .update('pid', session.knex.raw('id - 1'))
          .where('id', '>', 1);
      })
      .then(function() {
        progress('1/4');
        return Promise.all(
          _.map(_.chunk(_.flatten(_.map(persons, 'pets')), C), function(animalChunk) {
            return session.knex('Animal').insert(animalChunk);
          })
        );
      })
      .then(function() {
        progress('2/4');
        return Promise.all(
          _.map(_.chunk(_.flatten(_.map(persons, 'movies')), C), function(movieChunk) {
            return session.knex('Movie').insert(movieChunk);
          })
        );
      })
      .then(function() {
        progress('3/4');
        return Promise.all(
          _.map(_.chunk(_.flatten(_.map(persons, 'personMovies')), C), function(movieChunk) {
            return session.knex('Person_Movie').insert(movieChunk);
          })
        );
      })
      .then(function() {
        progress('4/4');
      });
  }
};

function createModels(knex) {
  class Person extends objection.Model {
    static get tableName() {
      return 'Person';
    }
  }
  class Animal extends objection.Model {
    static get tableName() {
      return 'Animal';
    }
  }
  class Movie extends objection.Model {
    static get tableName() {
      return 'Movie';
    }
  }

  Person.knex(knex);
  Animal.knex(knex);
  Movie.knex(knex);

  Person.prototype.fullName = function() {
    return this.firstName + ' ' + this.lastName;
  };

  Person.relationMappings = {
    parent: {
      relation: objection.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'Person.pid',
        to: 'Person.id'
      }
    },

    pets: {
      relation: objection.HasManyRelation,
      modelClass: Animal,
      join: {
        from: 'Person.id',
        to: 'Animal.ownerId'
      }
    },

    movies: {
      relation: objection.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: 'Person.id',
        through: {
          from: 'Person_Movie.actorId',
          to: 'Person_Movie.movieId'
        },
        to: 'Movie.id'
      }
    }
  };

  Animal.relationMappings = {
    owner: {
      relation: objection.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'Animal.ownerId',
        to: 'Person.id'
      }
    }
  }

  return {
    Person: Person,
    Animal: Animal,
    Movie: Movie
  };
}

function createZeroPad(N) {
  // log(x) / log(10) == log10(x)
  const n = Math.ceil(Math.log(N) / Math.log(10));

  return function(num) {
    num = num.toString();

    while (num.length < n) {
      num = '0' + num;
    }

    return num;
  };
}

function pick(arr, picks) {
  return _.map(arr, function(obj) {
    return _.pick(obj, picks);
  });
}
