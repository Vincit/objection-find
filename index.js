'use strict';

const FindQueryBuilder = require('./lib/FindQueryBuilder');
const QueryParameter = require('./lib/QueryParameter');
const PropertyRef = require('./lib/PropertyRef');

const findQuery = (modelClass) => new FindQueryBuilder(modelClass);

/**
 * These export configurations enable JS and TS developers
 * to consume objection-find in whatever way best suits their needs.
 * Some examples of supported import syntax includes:
 * - `const findQuery = require('objection-find')`
 * - `const { findQuery } = require('objection-find')`
 * - `import * as findQuery from 'objection-find'`
 * - `import { findQuery } from 'objection-find'`
 * - `import findQuery from 'objection-find'`
 */
findQuery.findQuery = findQuery;
findQuery.FindQueryBuilder = FindQueryBuilder;
findQuery.QueryParameter = QueryParameter;
findQuery.PropertyRef = PropertyRef;
findQuery.default = findQuery;
module.exports = findQuery;
