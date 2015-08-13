'use strict';

var FindQueryBuilder = require('./lib/FindQueryBuilder');
var QueryParameter = require('./lib/QueryParameter');
var PropertyRef = require('./lib/PropertyRef');

module.exports = function (modelClass) {
  return new FindQueryBuilder(modelClass);
};

module.exports.FindQueryBuilder = FindQueryBuilder;
module.exports.QueryParameter = QueryParameter;
module.exports.PropertyRef = PropertyRef;
