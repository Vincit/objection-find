'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const testUtils = require('./utils');
const objectionFind = require('../objection-find');
const { Model } = require('objection');

describe('integration tests', () => {
  _.each(testUtils.testDatabaseConfigs, (knexConfig) => {
    describe(knexConfig.client, () => {
      let session, knex, Person, Animal, Movie;

      after(() => {
        if (knex) {
          knex.destroy();
        }
      });

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

      describe('filters', () => {
        describe('in', () => {
          it('should filter using `where in', () => {
            return objectionFind(Person)
              .build({
                'firstName:in': 'F01,F02,F05',
              })
              .then((result) => {
                expect(_.map(result, 'firstName').sort()).to.eql(['F01', 'F02', 'F05']);
              });
          });
        });

        describe('eq', () => {
          it('should filter using = operator', () => {
            return objectionFind(Person)
              .build({
                'firstName:eq': 'F01',
              })
              .then((result) => {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F01 L08']);
              });
          });

          it('should default to `eq` when no filter is given', function () {
            return objectionFind(Person)
              .build({
                firstName: 'F01',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F01 L08']);
              });
          });
        });

        describe('neq', () => {
          it('should filter using <> operator', () => {
            return objectionFind(Person)
              .build({
                'firstName:neq': 'F01',
              })
              .then((results) => {
                // Everything except 'F01'
                expect(results.map((result) => result.firstName).sort()).to.eql([
                  'F00',
                  'F02',
                  'F03',
                  'F04',
                  'F05',
                  'F06',
                  'F07',
                  'F08',
                  'F09',
                ]);
              });
          });
        });

        describe('lt', function () {
          it('should filter using < operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return F03 L06, F04 L05 and F05 L04
                'firstName:lt': 'F06',
                'lastName:lt': 'L07',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql([
                  'F03 L06',
                  'F04 L05',
                  'F05 L04',
                ]);
              });
          });
        });

        describe('lte', function () {
          it('should filter using <= operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return "F02 L07", "F03 L06", "F04 L05", "F05 L04" and "F06 L03"
                'firstName:lte': 'F06',
                'lastName:lte': 'L07',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql([
                  'F02 L07',
                  'F03 L06',
                  'F04 L05',
                  'F05 L04',
                  'F06 L03',
                ]);
              });
          });
        });

        describe('gt', function () {
          it('should filter using > operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return F04 L05 and F05 L04
                'firstName:gt': 'F03',
                'lastName:gt': 'L03',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F04 L05', 'F05 L04']);
              });
          });
        });

        describe('gte', function () {
          it('should filter using >= operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return F03 L06, F04 L05, F05 L04 and F06 L03
                'firstName:gte': 'F03',
                'lastName:gte': 'L03',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql([
                  'F03 L06',
                  'F04 L05',
                  'F05 L04',
                  'F06 L03',
                ]);
              });
          });
        });

        describe('like', function () {
          it('should filter using `like` operator', function () {
            return objectionFind(Person)
              .build({
                'firstName:like': '%03%',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F03 L06']);
              });
          });

          it('should filter using `like` operator from multiple columns', function () {
            return objectionFind(Person)
              .build({
                'firstName|lastName:like': '%03%',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F03 L06', 'F06 L03']);
              });
          });
        });

        describe('likeLower', function () {
          it('should filter using `lower(col) like lower(value)`', function () {
            return objectionFind(Person)
              .build({
                'firstName:likeLower': 'f03%',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F03 L06']);
              });
          });
        });

        describe('isNull', function () {
          it('should filter using `is null`', function () {
            return objectionFind(Person)
              .build({
                'pid:isNull': '',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F00 L09']);
              });
          });
        });

        describe('notNull', function () {
          it('should filter using `is not null`', function () {
            return objectionFind(Person)
              .build({
                'pid:notNull': '',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql([
                  'F01 L08',
                  'F02 L07',
                  'F03 L06',
                  'F04 L05',
                  'F05 L04',
                  'F06 L03',
                  'F07 L02',
                  'F08 L01',
                  'F09 L00',
                ]);
              });
          });
        });
      });

      describe('relations', function () {
        describe('one to one relation', function () {
          it("should return persons whose parent's firstName equals the given string", function () {
            return objectionFind(Person)
              .build({
                'parent.firstName': 'F00',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F01 L08']);
              });
          });

          it("should return persons whose parent's firstName or lastName match the given pattern", function () {
            return objectionFind(Person)
              .build({
                'parent.firstName|parent.lastName:like': '%01%',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F02 L07', 'F09 L00']);
              });
          });

          it('should return all persons that have a parent', function () {
            return objectionFind(Person)
              .build({
                'parent.id:notNull': '',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql([
                  'F01 L08',
                  'F02 L07',
                  'F03 L06',
                  'F04 L05',
                  'F05 L04',
                  'F06 L03',
                  'F07 L02',
                  'F08 L01',
                  'F09 L00',
                ]);
              });
          });
        });

        describe('one to many relation', function () {
          it('should return all persons who have a pet whose name > P55 and also have a pet whose name < P60', function () {
            return objectionFind(Person)
              .build({
                'pets.name:gt': 'P55',
                'pets.name:lt': 'P60',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql(['F05 L04']);
              });
          });
        });

        describe('many to many relation', function () {
          it('should return all persons who have a movie whose name > M10 and also have a movie whose name < M40', function () {
            return objectionFind(Person)
              .build({
                'movies.name:gt': 'M10',
                'movies.name:lt': 'M40',
              })
              .then(function (result) {
                expect(_.invokeMap(result, 'fullName').sort()).to.eql([
                  'F06 L03',
                  'F07 L02',
                  'F08 L01',
                ]);
              });
          });
        });
      });

      describe('ordering', function () {
        describe('orderBy', function () {
          it('should order by a property in ascending order', function () {
            return objectionFind(Person)
              .build({
                orderBy: 'lastName',
              })
              .then(function (result) {
                expect(_.map(result, 'lastName')).to.eql([
                  'L00',
                  'L01',
                  'L02',
                  'L03',
                  'L04',
                  'L05',
                  'L06',
                  'L07',
                  'L08',
                  'L09',
                ]);
              });
          });

          it('should throw if trying to order by HasManyRelation relation properties', function () {
            expect(function () {
              objectionFind(Person).build({ orderBy: 'movies.name' });
            })
              .to.throw(Error)
              .with.property('statusCode', 400);
          });
        });

        describe('orderByAsc', function () {
          it('should order by a property in ascending order', function () {
            return objectionFind(Person)
              .build({
                orderByAsc: ['parent.lastName'],
              })
              .then(function (result) {
                // L09 doesn't have a parent, so it comes first or last depending on the database.
                expect(_.without(_.map(result, 'lastName'), 'L09')).to.eql([
                  'L00',
                  'L01',
                  'L02',
                  'L03',
                  'L04',
                  'L05',
                  'L06',
                  'L07',
                  'L08',
                ]);
                expect(_.map(result, 'lastName')).to.contain('L09');
              });
          });

          it('should order a column alias in ascending order', function () {
            return objectionFind(Animal)
              .build({
                orderByAsc: ['owner:parent:lastName'],
                join: 'owner.[parent]',
              })
              .then(function (result) {
                const names = _.map(
                  _.reject(result, (pet) => _.includes(pet.name, 'P0')),
                  'name'
                );
                // P99 should be within the first 10 pets
                expect(_.slice(names, 0, 10)).to.contain('P99');
                // P10 should be within the last 10 pets
                expect(_.slice(names, names.length - 10, names.length)).to.contain('P10');
                expect(_.map(result, 'name')).to.contain('P00');
              });
          });
        });

        describe('orderByDesc', function () {
          it('should order by a property in descending order', function () {
            return objectionFind(Person)
              .build({
                orderByDesc: 'parent.firstName',
              })
              .then(function (result) {
                // F00 doesn't have a parent, so it comes first or last depending on the database.
                expect(_.without(_.map(result, 'firstName'), 'F00')).to.eql([
                  'F09',
                  'F08',
                  'F07',
                  'F06',
                  'F05',
                  'F04',
                  'F03',
                  'F02',
                  'F01',
                ]);
                expect(_.map(result, 'firstName')).to.contain('F00');
              });
          });

          it('should order a column alias in descending order', function () {
            return objectionFind(Animal)
              .build({
                orderByDesc: ['owner:parent:lastName'],
                eager: 'owner.[parent]',
              })
              .eagerAlgorithm(Model.JoinEagerAlgorithm)
              .then(function (result) {
                const names = _.map(
                  _.reject(result, (pet) => _.includes(pet.name, 'P0')),
                  'name'
                );
                // P10 should be within the first 10 pets
                expect(_.slice(names, 0, 10)).to.contain('P10');
                // P99 should be within the last 10 pets
                expect(_.slice(names, names.length - 10, names.length)).to.contain('P99');
                expect(_.map(result, 'name')).to.contain('P00');
              });
          });
        });
      });

      describe('range', function () {
        it('should only select the given range', function () {
          return objectionFind(Person)
            .build({
              'firstName:gte': 'F04',
              rangeStart: '2',
              rangeEnd: '4',
            })
            .then(function (result) {
              expect(result.total).to.equal(6);
              expect(_.map(result.results, 'firstName')).to.eql(['F06', 'F07', 'F08']);
            });
        });

        it('should throw if rangeStart or rangeEnd cannot be parsed to integer', function () {
          expect(function () {
            objectionFind(Person).build({
              'firstName:gte': 'F04',
              rangeStart: 'X',
              rangeEnd: '4',
            });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);

          expect(function () {
            objectionFind(Person).build({
              'firstName:gte': 'F04',
              rangeStart: '2',
              rangeEnd: 'X',
            });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);
        });
      });

      describe('allow', function () {
        it('should not throw is only allowed properties are used', function () {
          expect(function () {
            objectionFind(Person).allow('parent.firstName', 'movies.name').build({
              'movies.name': 'test',
              orderBy: 'parent.firstName',
            });
          }).to.not.throw();

          expect(function () {
            objectionFind(Person)
              .allow('parent.firstName')
              // This should allow everything again.
              .allowAll(true)
              .build({
                'movies.name': 'test',
                orderBy: 'parent.firstName',
              });
          }).to.not.throw();
        });

        it('should throw if using a property reference that is not allowed', function () {
          expect(function () {
            objectionFind(Person).allow('firstName').build({ lastName: 'test' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);

          expect(function () {
            objectionFind(Person).allow('firstName').build({ orderBy: 'lastName' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);
        });
      });

      describe('eager', function () {
        it('should pass eager expression to the query builder', function () {
          return objectionFind(Person)
            .build({
              'id:eq': 5,
              eager: 'parent.[movies, pets]',
            })
            .then(function (result) {
              expect(result).to.have.length(1);
              expect(result[0].parent).to.be.an.instanceof(session.models.Person);
              expect(result[0].parent.movies[0]).to.be.an.instanceof(session.models.Movie);
              expect(result[0].parent.pets[0]).to.be.an.instanceof(session.models.Animal);
            });
        });

        it('should pass eager expression to the query builder with renamed special parameter', function () {
          return objectionFind(Person)
            .specialParameter('eager', 'withRelated')
            .build({
              'id:eq': 5,
              withRelated: 'parent.[movies, pets]',
            })
            .then(function (result) {
              expect(result).to.have.length(1);
              expect(result[0].parent).to.be.an.instanceof(session.models.Person);
              expect(result[0].parent.movies[0]).to.be.an.instanceof(session.models.Movie);
              expect(result[0].parent.pets[0]).to.be.an.instanceof(session.models.Animal);
            });
        });

        it('should pass allowEager to the query builder', function (done) {
          const findQuery = objectionFind(Person).allowEager('parent');
          expect(findQuery.allowEager()).to.equal('parent');
          findQuery
            .build({
              'id:eq': 5,
              eager: 'parent.[movies, pets]',
            })
            .catch(function () {
              done();
            });
        });
      });

      describe('custom filters', function () {
        it('should be able to register own custom filters', function () {
          return objectionFind(Animal)
            .registerFilter('contains', function (propertyRef, value) {
              return {
                method: 'where',
                args: [propertyRef.fullColumnName(), 'like', '%' + value + '%'],
              };
            })
            .build({
              'name:contains': '5',
            })
            .then(function (result) {
              expect(_.map(result, 'name').sort()).to.eql([
                'P05',
                'P15',
                'P25',
                'P35',
                'P45',
                'P50',
                'P51',
                'P52',
                'P53',
                'P54',
                'P55',
                'P56',
                'P57',
                'P58',
                'P59',
                'P65',
                'P75',
                'P85',
                'P95',
              ]);
            });
        });
      });

      describe('count', function () {
        it('should retrieve count for a given filter criteria', function () {
          return objectionFind(Person)
            .build({
              'firstName:in': 'F01,F02,F05',
              count: 'id',
            })
            .then(([result]) => {
              switch (knexConfig.client) {
                case 'postgres':
                  expect(result.count).to.equal('3');
                  break;
                case 'sqlite3':
                  expect(result['count(`id`)']).to.equal(3);
                  break;
                case 'mysql':
                  expect(result['count(`id`)']).to.equal(3);
              }
            });
        });

        it('should retrieve count for a given filter criteria with alias', function () {
          return objectionFind(Person)
            .build({
              'firstName:in': 'F01,F02,F05',
              count: 'id as idCount',
            })
            .then(([result]) => {
              switch (knexConfig.client) {
                case 'postgres':
                  expect(result.idCount).to.equal('3');
                  break;
                case 'sqlite3':
                case 'mysql':
                  expect(result.idCount).to.equal(3);
                  break;
              }
            });
        });
      });

      describe('groupBy', function () {
        it('should retrieve count for a given filter criteria grouped by field', function () {
          return objectionFind(Person)
            .build({
              'firstName:in': 'F01,F02,F05',
              count: 'id as countId',
              groupBy: 'firstName',
            })
            .then((result) => {
              expect(result.length).to.equal(3);
              expect((result[0].countId = 1));
              expect((result[1].countId = 1));
              expect((result[2].countId = 1));
              expect(result[0].firstName).to.be.a('string');
              expect(result[1].firstName).to.be.a('string');
              expect(result[2].firstName).to.be.a('string');
              expect(result[0].lastName).to.be.a('undefined');
              expect(result[1].lastName).to.be.a('undefined');
              expect(result[2].lastName).to.be.a('undefined');
            });
        });

        it('should work correctly with an implicit eager retrieval for a nested search criteria', function () {
          return objectionFind(Person)
            .build({
              'firstName:in': 'F01,F02,F05',
              count: 'id as countId',
              groupBy: 'firstName',
            })
            .then((result) => {
              expect(result.length).to.equal(3);
              expect((result[0].countId = 1));
              expect((result[1].countId = 1));
              expect((result[2].countId = 1));
              expect(result[0].firstName).to.be.a('string');
              expect(result[1].firstName).to.be.a('string');
              expect(result[2].firstName).to.be.a('string');
              expect(result[0].lastName).to.be.a('undefined');
              expect(result[1].lastName).to.be.a('undefined');
              expect(result[2].lastName).to.be.a('undefined');
            });
        });

        it('should retrieve values for a given filter criteria grouped by field', function () {
          return objectionFind(Person)
            .build({
              'firstName:in': 'F01,F02,F05',
              groupBy: 'firstName,lastName',
            })
            .then((result) => {
              expect(result.length).to.equal(3);
              expect(result[0].firstName).to.be.a('string');
              expect(result[1].firstName).to.be.a('string');
              expect(result[2].firstName).to.be.a('string');
              expect(result[0].lastName).to.be.a('string');
              expect(result[1].lastName).to.be.a('string');
              expect(result[2].lastName).to.be.a('string');
            });
        });
      });

      describe('parse errors', function () {
        it('should fail if a property reference is invalid', function () {
          expect(function () {
            objectionFind(Person).build({ 'movies..name': 'test' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);

          expect(function () {
            objectionFind(Person).build({ 'movies.name.length': 'test' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);

          expect(function () {
            objectionFind(Person).build({ 'movies.': 'test' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);

          expect(function () {
            objectionFind(Person).build({ 'movies.name::eq': 'test' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);
        });

        it('should fail if relation is not found', function () {
          expect(function () {
            objectionFind(Person).build({ 'notValidRelation.name': 'test' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);
        });

        it('should fail with invalid filter', function () {
          expect(function () {
            objectionFind(Person).build({ 'movies.name:invalidFilter': 'test' });
          })
            .to.throw(Error)
            .with.property('statusCode', 400);
        });
      });

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
});
