'use strict';

var _ = require('lodash');
var expect = require('expect.js');
var testUtils = require('./utils');
var objectionFind = require('../objection-find');

describe('integration tests', function () {

  _.each(testUtils.testDatabaseConfigs, function (knexConfig) {

    describe(knexConfig.client, function() {
      var session, knex, Person, Animal, Movie;

      before(function () {
        session = testUtils.initialize(knexConfig);
        knex = session.knex;
        Person = session.models.Person;
        Animal = session.models.Animal;
        Movie = session.models.Movie;
      });

      before(function () {
        return testUtils.dropDb(session);
      });

      before(function () {
        return testUtils.createDb(session);
      });

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
      before(function () {
        return testUtils.insertData(session, {persons: 10, pets: 10, movies: 10});
      });

      describe('filters', function () {

        describe('in', function () {

          it('should filter using `where in', function () {
            return objectionFind(Person)
              .build({
                "firstName:in": "F01,F02,F05"
              })
              .then(function (result) {
                expect(_.pluck(result, 'firstName').sort()).to.eql(['F01', 'F02', 'F05']);
              });
          });

        });

        describe('eq', function () {

          it('should filter using = operator', function () {
            return objectionFind(Person)
              .build({
                "firstName:eq": "F01"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F01 L08']);
              });
          });

          it('should default to `eq` when no filter is given', function () {
            return objectionFind(Person)
              .build({
                "firstName": "F01"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F01 L08']);
              });
          });

        });

        describe('lt', function () {

          it('should filter using < operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return F03 L06, F04 L05 and F05 L04
                "firstName:lt": "F06",
                "lastName:lt": "L07"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F03 L06', 'F04 L05', 'F05 L04']);
              });
          });

        });

        describe('lte', function () {

          it('should filter using <= operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return "F02 L07", "F03 L06", "F04 L05", "F05 L04" and "F06 L03"
                "firstName:lte": "F06",
                "lastName:lte": "L07"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F02 L07', 'F03 L06', 'F04 L05', 'F05 L04', 'F06 L03']);
              });
          });

        });

        describe('gt', function () {

          it('should filter using > operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return F04 L05 and F05 L04
                "firstName:gt": "F03",
                "lastName:gt": "L03"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F04 L05', 'F05 L04']);
              });
          });

        });

        describe('gte', function () {

          it('should filter using >= operator', function () {
            return objectionFind(Person)
              .build({
                // Since the numbering in firstName and lastName go to opposite directions
                // this should return F03 L06, F04 L05, F05 L04 and F06 L03
                "firstName:gte": "F03",
                "lastName:gte": "L03"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F03 L06', 'F04 L05', 'F05 L04', 'F06 L03']);
              });
          });

        });

        describe('like', function () {

          it('should filter using `like` operator', function () {
            return objectionFind(Person)
              .build({
                "firstName:like": "%03%"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F03 L06']);
              });
          });

          it('should filter using `like` operator from multiple columns', function () {
            return objectionFind(Person)
              .build({
                "firstName|lastName:like": "%03%"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F03 L06', 'F06 L03']);
              });
          });

        });

        describe('likeLower', function () {

          it('should filter using `lower(col) like lower(value)`', function () {
            return objectionFind(Person)
              .build({
                "firstName:likeLower": "f03%"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F03 L06']);
              });
          });

        });

        describe('isNull', function () {

          it('should filter using `is null`', function () {
            return objectionFind(Person)
              .build({
                "pid:isNull": ''
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F00 L09']);
              });
          });

        });

        describe('notNull', function () {

          it('should filter using `is not null`', function () {
            return objectionFind(Person)
              .build({
                "pid:notNull": ''
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F01 L08', 'F02 L07', 'F03 L06', 'F04 L05', 'F05 L04', 'F06 L03', 'F07 L02', 'F08 L01', 'F09 L00']);
              });
          });

        });

      });

      describe('relations', function () {

        describe('one to one relation', function () {

          it('should return persons whose parent\'s firstName equals the given string', function () {
            return objectionFind(Person)
              .build({
                "parent.firstName": "F00"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F01 L08']);
              });
          });

          it('should return persons whose parent\'s firstName or lastName match the given pattern', function () {
            return objectionFind(Person)
              .build({
                "parent.firstName|parent.lastName:like": "%01%"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F02 L07', 'F09 L00']);
              });
          });

          it('should return all persons that have a parent', function () {
            return objectionFind(Person)
              .build({
                "parent.id:notNull": ""
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F01 L08', 'F02 L07', 'F03 L06', 'F04 L05', 'F05 L04', 'F06 L03', 'F07 L02', 'F08 L01', 'F09 L00']);
              });
          });

        });

        describe('one to many relation', function () {

          it('should return all persons who have a pet whose name > P55 and also have a pet whose name < P60', function () {
            return objectionFind(Person)
              .build({
                "pets.name:gt": "P55",
                "pets.name:lt": "P60"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F05 L04']);
              });
          });

        });

        describe('many to many relation', function () {

          it('should return all persons who have a movie whose name > M10 and also have a movie whose name < M40', function () {
            return objectionFind(Person)
              .build({
                "movies.name:gt": "M10",
                "movies.name:lt": "M40"
              })
              .then(function (result) {
                expect(_.invoke(result, 'fullName').sort()).to.eql(['F06 L03', 'F07 L02', 'F08 L01']);
              });
          });

        });

      });

      describe('ordering', function () {

        describe('orderBy', function () {

          it('should order by a property in ascending order', function () {
            return objectionFind(Person)
              .build({
                "orderBy": "lastName"
              })
              .then(function (result) {
                expect(_.pluck(result, 'lastName')).to.eql(['L00', 'L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09']);
              });
          });

          it('should throw if trying to order by OneToMany relation properties', function () {

            expect(function () {
              objectionFind(Person).build({"orderBy": "movies.name"});
            }).to.throwException(function (err) {
              expect(err.statusCode).to.equal(400);
            });

          });

        });

        describe('orderByAsc', function () {

          it('should order by a property in ascending order', function () {
            return objectionFind(Person)
              .build({
                "orderByAsc": ["parent.lastName"]
              })
              .then(function (result) {
                // L09 doesn't have a parent, so it comes first or last depending on the database.
                expect(_.without(_.pluck(result, 'lastName'), 'L09')).to.eql(['L00', 'L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08']);
                expect(_.pluck(result, 'lastName')).to.contain('L09');
              });
          });

        });

        describe('orderByDesc', function () {

          it('should order by a property in descending order', function () {
            return objectionFind(Person)
              .build({
                "orderByDesc": "parent.firstName"
              })
              .then(function (result) {
                // F00 doesn't have a parent, so it comes first or last depending on the database.
                expect(_.without(_.pluck(result, 'firstName'), 'F00')).to.eql(['F09', 'F08', 'F07', 'F06', 'F05', 'F04', 'F03', 'F02', 'F01']);
                expect(_.pluck(result, 'firstName')).to.contain('F00');
              });
          });

        });

      });

      describe('range', function () {

        it('should only select the given range', function () {
          return objectionFind(Person)
            .build({
              "firstName:gte": 'F04',
              "rangeStart": '2',
              "rangeEnd": '4'
            })
            .then(function (result) {
              expect(result.total).to.equal(6);
              expect(_.pluck(result.results, 'firstName')).to.eql(['F06', 'F07', 'F08']);
            });
        });

        it('should throw if rangeStart or rangeEnd cannot be parsed to integer', function () {
          expect(function () {
            objectionFind(Person)
              .build({
                "firstName:gte": 'F04',
                "rangeStart": 'X',
                "rangeEnd": '4'
              });
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });

          expect(function () {
            objectionFind(Person)
              .build({
                "firstName:gte": 'F04',
                "rangeStart": '2',
                "rangeEnd": 'X'
              });
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });
        });

      });

      describe('allow', function () {

        it('should not throw is only allowed properties are used', function () {

          expect(function () {
            objectionFind(Person)
              .allow('parent.firstName', 'movies.name')
              .build({
                "movies.name": 'test',
                "orderBy": 'parent.firstName'
              });
          }).to.not.throwException();

          expect(function () {
            objectionFind(Person)
              .allow('parent.firstName')
              // This should allow everything again.
              .allowAll(true)
              .build({
                "movies.name": 'test',
                "orderBy": 'parent.firstName'
              });
          }).to.not.throwException();

        });

        it('should throw if using a property reference that is not allowed', function () {

          expect(function () {
            objectionFind(Person).allow('firstName').build({"lastName": "test"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });

          expect(function () {
            objectionFind(Person).allow('firstName').build({"orderBy": "lastName"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });

        });

      });

      describe('eager', function () {

        it('should pass eager expression to the query builder', function () {
          return objectionFind(Person)
            .build({
              "id:eq": 5,
              "eager": "parent.[movies, pets]"
            })
            .then(function (result) {
              expect(result).to.have.length(1);
              expect(result[0].parent).to.be.a(session.models.Person);
              expect(result[0].parent.movies[0]).to.be.a(session.models.Movie);
              expect(result[0].parent.pets[0]).to.be.a(session.models.Animal);
            });
        });

        it('should pass eager expression to the query builder with renamed special parameter', function () {
          return objectionFind(Person)
            .specialParameter('eager', 'withRelated')
            .build({
              "id:eq": 5,
              "withRelated": "parent.[movies, pets]"
            })
            .then(function (result) {
              expect(result).to.have.length(1);
              expect(result[0].parent).to.be.a(session.models.Person);
              expect(result[0].parent.movies[0]).to.be.a(session.models.Movie);
              expect(result[0].parent.pets[0]).to.be.a(session.models.Animal);
            });
        });

        it('should pass allowEager to the query builder', function (done) {
          var findQuery = objectionFind(Person).allowEager('parent');
          expect(findQuery.allowEager()).to.equal('parent');
          findQuery.build({
            "id:eq": 5,
            "eager": "parent.[movies, pets]"
          }).catch(function () {
            done();
          });
        })

      });

      describe('custom filters', function () {

        it('should be able to register own custom filters', function () {
          return objectionFind(Animal)
            .registerFilter('contains', function (propertyRef, value) {
              return {
                method: 'where',
                args: [propertyRef.fullColumnName(), 'like', '%' + value + '%']
              };
            })
            .build({
              "name:contains": '5'
            })
            .then(function (result) {
              expect(_.pluck(result, 'name').sort()).to.eql([
                'P05', 'P15', 'P25', 'P35',
                'P45', 'P50', 'P51', 'P52',
                'P53', 'P54', 'P55', 'P56',
                'P57', 'P58', 'P59', 'P65',
                'P75', 'P85', 'P95']);
            });
        });

      });

      describe('parse errors', function () {

        it('should fail if a property reference is invalid', function () {

          expect(function () {
            objectionFind(Person).build({"movies..name": "test"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });

          expect(function () {
            objectionFind(Person).build({"movies.name.length": "test"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });

          expect(function () {
            objectionFind(Person).build({"movies.": "test"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });

          expect(function () {
            objectionFind(Person).build({"movies.name::eq": "test"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });


        });

        it('should fail if relation is not found', function () {
          expect(function () {
            objectionFind(Person).build({"notValidRelation.name": "test"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });
        });

        it('should fail with invalid filter', function () {
          expect(function () {
            objectionFind(Person).build({"movies.name:invalidFilter": "test"});
          }).to.throwException(function (err) {
            expect(err.statusCode).to.equal(400);
          });
        });

      });

      describe('mixtures', function () {

        it('everything at once', function () {
          return objectionFind(Person)
            .build({
              "firstName:like": "F%",
              "pets.name:lt": "P80",
              "movies.name:gte": "M19",
              "movies.name:lt": "M60",
              "orderBy": 'parent.lastName',
              "eager": 'parent',
              "rangeStart": 2,
              "rangeEnd": 4
            })
            .then(function (result) {
              expect(result.total).to.equal(4);
              expect(_.pluck(result.results, 'lastName')).to.eql([/*'L02', 'L03', */'L04', 'L05']);
              expect(_.pluck(result.results, 'parent.lastName')).to.eql([/*'L03', 'L04', */'L05', 'L06']);
            });
        });

      });

      describe('extend', function () {

        it('FindQueryBuilder.extend should create a subclass', function () {
          function MyFindQueryBuilder() {
            objectionFind.FindQueryBuilder.apply(this, arguments);
          }

          objectionFind.FindQueryBuilder.extend(MyFindQueryBuilder);

          var queryBuilder = new MyFindQueryBuilder(Person);
          expect(queryBuilder).to.be.a(objectionFind.FindQueryBuilder);
        });

      });
    });

  });

});
