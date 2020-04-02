'use strict';

const _ = require('lodash');
const utils = require('./utils');
const filters = require('./filters');

/**
 * An object representation of an FindQueryBuilder's input query parameter.
 *
 * @param {string} value
 * @param {string} key
 * @param {FindQueryBuilder} builder
 * @constructor
 */
class QueryParameter {
  constructor(value, key, builder) {
    /**
     * The key of the query parameter.
     *
     * @type {string}
     */
    this.key = key;

    /**
     * The value of the query parameter.
     *
     * @type {string}
     */
    this.value = value;

    /**
     * One of the keys of FindQueryBuilder._specialParameterMap or null.
     *
     * @type {string}
     */
    this.specialParameter = null;

    /**
     * All the property references in this query parameter.
     *
     * @type {Array.<PropertyRef>}
     */
    this.propertyRefs = [];

    /**
     * The filter function if this query parameter is a filter.
     *
     * @type {function}
     */
    this.filter = null;

    this._parse(value, key, builder);
  }

  _parse(value, key, builder) {
    if (builder._inverseSpecialParameterMap[key]) {
      this._parseSpecialParameter(value, key, builder);
    } else {
      this._parseFilter(value, key, builder);
    }
  }

  _parseSpecialParameter(value, key, builder) {
    this.specialParameter = builder._inverseSpecialParameterMap[key];

    if (this.specialParameter.indexOf('orderBy') !== -1) {
      this._parseOrderBy(value, key, builder);
    }
  }

  _parseOrderBy(value, key, builder) {
    let parsedRefs = builder._parsePropertyRefs(value.split('|'));
    _.each(parsedRefs, parsedRef => this.propertyRefs.push(parsedRef));
  }

  _parseFilter(value, key, builder) {
    const parts = key.replace(/\s/g, '').split(':');

    if (parts.length === 1) {
      this.filter = filters.eq;
    } else if (parts.length === 2) {
      this.filter = builder._filters[parts[1]];
    } else {
      utils.throwError('parameter: invalid query parameter "' + key + '=' + value + '"');
    }

    if (!this.filter) {
      utils.throwError('parameter: invalid filter in "' + key + '=' + value + '"');
    }

    this.propertyRefs = builder._parsePropertyRefs(parts[0].split('|'));
  }
}

/**
 * @private
 */

module.exports = QueryParameter;
