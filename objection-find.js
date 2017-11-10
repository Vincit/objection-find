'use strict';

const FindQueryBuilder = require('./lib/FindQueryBuilder');
const QueryParameter = require('./lib/QueryParameter');
const PropertyRef = require('./lib/PropertyRef');

module.exports = (modelClass) => new FindQueryBuilder(modelClass); 
module.exports.FindQueryBuilder = FindQueryBuilder;
module.exports.QueryParameter = QueryParameter;
module.exports.PropertyRef = PropertyRef;
