const _ = require('lodash');
const expect = require('chai').expect;
const testUtils = require('./db-initializer-with-schema');
const objectionFind = require('../objection-find');
const TestDatabaseConfigs = require('./TestDatabaseConfigs');

describe('integration tests with schema', () => {
  const [knexConfig] = TestDatabaseConfigs;

  //ToDo run with MySQL as well
  describe('postgres', () => {
    let session, knex, Person, Animal, Movie;

    before(() => {
      session = testUtils.initialize(knexConfig);
      knex = session.knex;
      Person = session.models.Person;
      Animal = session.models.Animal;
      Movie = session.models.Movie;
    });

    before(() => testUtils.dropDb(session));

    before(() => testUtils.createDb(session));

    /**
     * Insert the test data.
     *
     * 10 Persons with names `F00 L09`, `F01 L08`, ...
     *   The previous person is the parent of the next one (the first person doesn't have a parent).
     *
     *   Each person has 10 Pets `P00`, `P01`, `P02`, ...
     *     First person has pets 0 - 9, second 10 - 19 etc.
     *
     *   Each person is an actor in 10 Movies `M00`, `M01`, `M02`, ...
     *     First person has movies 0 - 9, second 10 - 19 etc.
     *
     * name    | parent  | pets      | movies
     * --------+---------+-----------+----------
     * F00 L09 | null    | P00 - P09 | M99 - M90
     * F01 L08 | F00 L09 | P10 - P19 | M89 - M80
     * F02 L07 | F01 L08 | P20 - P29 | M79 - M79
     * F03 L06 | F02 L07 | P30 - P39 | M69 - M60
     * F04 L05 | F03 L06 | P40 - P49 | M59 - M50
     * F05 L04 | F04 L05 | P50 - P59 | M49 - M40
     * F06 L03 | F05 L04 | P60 - P69 | M39 - M30
     * F07 L02 | F06 L03 | P70 - P79 | M29 - M20
     * F08 L01 | F07 L02 | P80 - P89 | M19 - M10
     * F09 L00 | F08 L01 | P90 - P99 | M09 - M00
     */

    before(() => testUtils.insertData(session, { persons: 10, pets: 10, movies: 10 }));

    describe('mixtures', function () {
      it('everything at once', function () {
        return objectionFind(Person)
          .build({
            'firstName:like': 'F%',
            'pets.name:lt': 'P80',
            'movies.name:gte': 'M19',
            'movies.name:lt': 'M60',
            orderBy: 'parent.lastName',
            eager: 'parent',
            rangeStart: 2,
            rangeEnd: 4,
          })
          .then(function (result) {
            expect(result.total).to.equal(4);
            expect(_.map(result.results, 'lastName')).to.eql([/*'L02', 'L03', */ 'L04', 'L05']);
            expect(_.map(result.results, 'parent.lastName')).to.eql([
              /*'L03', 'L04', */ 'L05',
              'L06',
            ]);
          });
      });
    });
  });
});
