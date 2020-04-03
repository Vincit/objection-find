'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const testUtils = require('./utils');
const objectionFind = require('../objection-find');

const N = 5;
let session;
let promise = Promise.resolve();

_.each(testUtils.testDatabaseConfigs, function (dbConfig) {
  promise = promise.then(function () {
    session = testUtils.initialize(dbConfig);

    let testPromise = Promise.resolve();
    _.times(N, function () {
      testPromise = testPromise.then(function () {
        return test(session);
      });
    });

    return testPromise;
  });

  function test(session) {
    console.time(dbConfig.client + ': many-to-many name starts with');
    return objectionFind(session.models.Person)
      .build({
        'movies.name:like': 'M53%',
      })
      .then(function (result) {
        console.timeEnd(dbConfig.client + ': many-to-many name starts with');
      });
  }
});

promise.then(function () {
  process.exit();
});
