'use strict';

const _ = require('lodash');
const utils = require('./utils');
const filters = require('./filters');

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
class PropertyRef {
  constructor(str, builder) {
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

  _parse(str, builder) {
    const parts = str.split('.');

    if (parts.length === 1) {
      this.propertyName = parts[0];
      this.modelClass = builder._modelClass;
    } else if (parts.length === 2) {
      const relationName = parts[0];

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
  }

  /**
   * Returns the full column name to be used in the queries.
   *
   * The returned string contains the appropriate table name or table alias. For
   * example `Person.firstName` or `Animal.name`.
   *
   * @returns {string}
   */
  fullColumnName() {
    if (this.relation && this.relation.isOneToOne()) {
      const builder = this.modelClass.query();
      // one-to-one relations are joined and the joined table is given an alias.
      // We must refer to the column through that alias.

      return (
        this.relation.ownerModelClass.getTableName() +
        '_rel_' +
        this.relation.name +
        '.' +
        this.columnName
      );
    } else {
      return this.modelClass.tableName + '.' + this.columnName;
    }
  }

  /**
   * Builds a where statement.
   *
   * @param {QueryParameter} param
   * @param {QueryBuilder} builder
   * @param {string=} boolOp
   */
  buildFilter(param, builder, boolOp) {
    const filter = this._getFilter(param);
    let whereMethod = filter.method;

    if (boolOp) {
      whereMethod = boolOp + _.upperFirst(whereMethod);
    }

    const rel = this.relation;
    if (rel && !rel.isOneToOne()) {
      const subQuery = rel.ownerModelClass.relatedQuery(rel.name).alias(rel.relatedModelClass.name);
      subQuery[whereMethod].apply(subQuery, filter.args);

      builder.whereExists(subQuery.select(1));
    } else {
      builder[whereMethod].apply(builder, filter.args);
    }
  }

  _getFilter(param) {
    return param.filter(this, param.value, this.modelClass);
  }
}

module.exports = PropertyRef;
