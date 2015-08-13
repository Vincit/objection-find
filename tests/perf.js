'use strict';

var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var testUtils = require('./utils');
var objectionFind = require('../objection-find');

var N = 5;
var session;
var promise = Promise.resolve();

_.each(testUtils.testDatabaseConfigs, function (dbConfig) {

  promise = promise.then(function () {
    session = testUtils.initialize(dbConfig);

    var testPromise = Promise.resolve();
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
        "movies.name:like": 'M53%'
      })
      .then(function (result) {
        console.timeEnd(dbConfig.client + ': many-to-many name starts with');
      });
  }
});

promise.then(function () {
  process.exit();
});
