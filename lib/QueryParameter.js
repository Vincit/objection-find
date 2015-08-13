'use strict';

var utils = require('./utils');
var filters = require('./filters');

/**
 * An object representation of an FindQueryBuilder's input query parameter.
 *
 * @param {string} value
 * @param {string} key
 * @param {FindQueryBuilder} builder
 * @constructor
 */
function QueryParameter(value, key, builder) {

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

/**
 * @private
 */
QueryParameter.prototype._parse = function (value, key, builder) {
  if (builder._inverseSpecialParameterMap[key]) {
    this._parseSpecialParameter(value, key, builder);
  } else {
    this._parseFilter(value, key, builder);
  }
};

/**
 * @private
 */
QueryParameter.prototype._parseSpecialParameter = function (value, key, builder) {
  this.specialParameter = builder._inverseSpecialParameterMap[key];

  if (this.specialParameter.indexOf('orderBy') !== -1) {
    this._parseOrderBy(value, key, builder);
  }
};

/**
 * @private
 */
QueryParameter.prototype._parseOrderBy = function (value, key, builder) {
  this.propertyRefs.push(builder._parsePropertyRef(value));
};

/**
 * @private
 */
QueryParameter.prototype._parseFilter = function (value, key, builder) {
  var self = this;
  var parts = key.replace(/\s/g, '').split(':');

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
};

module.exports = QueryParameter;
