'use strict';

var _ = require('lodash');
var utils = require('./utils');
var filters = require('./filters');

/**
 * Instances of this class represent property references.
 *
 * A property reference refers to a property of the model class we are building a
 * query for. For example property reference `firstName` refers to the model class's
 * `firstName` property and `movies.name` refers to the `name` property of the model
 * class's `movies` relation.
 *
 * @param {string} str
 *    The property reference string.
 *
 * @param {FindQueryBuilder} builder
 *    The builder that will use the reference.
 *
 * @constructor
 */
function PropertyRef(str, builder) {

  /**
   * The original property reference string.
   *
   * @type {string}
   */
  this.str = str;

  /**
   * This property reference refers to a property of this model class.
   *
   * @type {Model}
   */
  this.modelClass = null;

  /**
   * The relation part of the reference.
   *
   * This is null for property references like `firstName`
   * that don't have the relation part.
   *
   * @type {Relation}
   */
  this.relation = null;

  /**
   * The name of the property this reference refers to.
   *
   * @type {string}
   */
  this.propertyName = null;

  /**
   * The name of the column this reference refers to.
   *
   * This may be different from `propertyName` if the model class has
   * implemented some kind of conversions between database and external
   * format. For example propertyName could be 'firstName' and this could
   * be 'first_name'.
   *
   * @type {string}
   */
  this.columnName = null;

  this._parse(str, builder);
}

/**
 * @private
 */
PropertyRef.prototype._parse = function (str, builder) {
  var parts = str.split('.');

  if (parts.length === 1) {
    this.propertyName = parts[0];
    this.modelClass = builder._modelClass;
  } else if (parts.length === 2) {
    var relationName = parts[0];

    try {
      this.relation = builder._modelClass.getRelation(relationName);
    } catch (err) {
      utils.throwError('PropertyRef: unknown relation "' + relationName + '"');
    }

    this.propertyName = parts[1];
    this.modelClass = this.relation.relatedModelClass;
  } else {
    utils.throwError('PropertyRef: only one level of relations is supported');
  }

  this.columnName = this.modelClass.propertyNameToColumnName(this.propertyName);

  if (!this.columnName) {
    utils.throwError('PropertyRef: unknown property ' + str);
  }
};

/**
 * Returns the full column name to be used in the queries.
 *
 * The returned string contains the appropriate table name or table alias. For
 * example `Person.firstName` or `Animal.name`.
 *
 * @returns {string}
 */
PropertyRef.prototype.fullColumnName = function () {
  if (this.relation && utils.isOneToOneRelation(this.relation)) {
    // one-to-one relations are joined and the joined table is given an alias.
    // We must refer to the column through that alias.
    return this.relation.relatedTableAlias() + '.' + this.columnName;
  } else {
    return this.modelClass.tableName + '.' + this.columnName;
  }
};

/**
 * Builds a where statement.
 *
 * @param {QueryParameter} param
 * @param {QueryBuilder} builder
 * @param {string=} boolOp
 */
PropertyRef.prototype.buildFilter = function (param, builder, boolOp) {
  var filter = this._getFilter(param);
  var whereMethod = filter.method;

  if (boolOp) {
    whereMethod = boolOp + _.capitalize(whereMethod);
  }

  if (this.relation && !utils.isOneToOneRelation(this.relation)) {
    var rel = this.relation;
    var subQuery = rel.relatedModelClass.QueryBuilder.forClass(rel.relatedModelClass);

    rel.findQuery(subQuery, rel.fullOwnerCol(), true);
    subQuery[whereMethod].apply(subQuery, filter.args);

    builder.whereExists(subQuery.build().select(1));
  } else {
    builder[whereMethod].apply(builder, filter.args);
  }
};

/**
 * @private
 */
PropertyRef.prototype._getFilter = function (param) {
  var filter = param.filter(this, param.value, this.modelClass);

  if (['where', 'whereIn', 'whereRaw'].indexOf(filter.method) === -1) {
    utils.throwError('invalid filter method: ' + filter.method);
  }

  return filter;
};

module.exports = PropertyRef;
