'use strict';

const _ = require('lodash');
const utils = require('./utils');

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
    this._modelClass = null;

    /**
     * This property reference refers to a property array of model.
     *
     * @type {Model[]}
     */
    this.modelClasses = [];

    /**
     * The relations part of the reference.
     *
     * This is empty for property references like `firstName`
     * that don't have the relation part.
     *
     * @type {Relation[]}
     */
    this.relations = [];

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
      this._modelClass = builder._modelClass;
      this.columnName = this._modelClass.propertyNameToColumnName(this.propertyName);
      if (!this.columnName) {
        utils.throwError('PropertyRef: unknown property ' + str);
      }
    } else if (parts.length >= 2) {
      this.propertyName = parts.pop();
      this._modelClass = builder._modelClass;
      let prevParent = builder._modelClass;
      for (let index = 0; index < parts.length; index++) {
        try {
          this.relations.push(prevParent.getRelation(parts[index]));
          prevParent = this.relations[index].relatedProp._modelClass;
          this.modelClasses.push(prevParent);
        } catch (err) {
          utils.throwError(`PropertyRef: unknown relation ${parts[index]}`);
        }
      }
      this.columnName = this.modelClasses[0].propertyNameToColumnName(this.propertyName);
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
    const relation = this.relations.at(-1);
    if (relation) {
      const modelClass = relation.relatedModelClass;
      return modelClass.tableName + '_alias.' + this.columnName;
    } else {
      return this._modelClass.tableName + '.' + this.columnName;
    }
  }

  /**
   * Converts filters to where queries.
   *
   * @param {QueryParameter} param
   * @param {QueryBuilder} builder
   * @param {string=} boolOp
   */
  buildFilter(param, builder, boolOp) {
    const filter = this._getFilter(param, this._modelClass);

    let whereMethod = filter.method;
    if (boolOp) {
      whereMethod = boolOp + _.upperFirst(whereMethod);
    }

    builder[whereMethod].apply(builder, filter.args);
  }

  _getFilter(param, modelClass) {
    return param.filter(this, param.value, modelClass);
  }
}

module.exports = PropertyRef;
