'use strict';

const _ = require('lodash');
const utils = require('./utils');
const filters = require('./filters');
const PropertyRef = require('./PropertyRef');
const QueryParameter = require('./QueryParameter');

const SPECIAL_PARAMETERS = Object.freeze({
  eager: 'eager',
  join: 'join',
  rangeEnd: 'rangeEnd',
  rangeStart: 'rangeStart',
  orderBy: 'orderBy',
  orderByAsc: 'orderByAsc',
  orderByDesc: 'orderByDesc',
  groupBy: 'groupBy',
  count: 'count',
});

/**
 * A class for building HTTP query parameter controlled find queries for objection.js models.
 *
 * Usage example:
 *
 * ```js
 * var findQuery = require('objection-find');
 * var Person = require('../models/Person');
 *
 * expressApp.get('/api/persons', function (req, res, next) {
 *   findQuery(Person).build(req.query).then(function (persons) {
 *     res.send(persons);
 *   }).catch(next);
 * });
 * ```
 *
 * This class understands two kinds of query parameters: filters and special parameters.
 *
 *
 * ## Filters
 *
 * A filter parameter has the following format:
 *
 * ```
 * <propertyReference>|<propertyReference>|...:<filterName>=<value>
 * ```
 *
 * A <propertyReference> is either simply a property name like `firstName` or a reference to a
 * relation's property like `pets.name` (`pets` is the name of the relation).
 *
 * <filterName> is one of the built-in filters `eq`, `lt`, `lte`, `gt`, `gte`, `like`, `likeLower`
 * `in`, `notNull` or `isNull`. Filter can also be a custom filter registered using the
 * `registerFilter` method.
 *
 * The following examples explain how filter parameters work:
 *
 * | Filter query parameter             | Explanation                                                                                             |
 * |------------------------------------|---------------------------------------------------------------------------------------------------------|
 * | `firstName=Jennifer`               | Returns all Persons whose firstName is 'Jennifer'.                                                      |
 * | `firstName:eq=Jennifer`            | Returns all Persons whose firstName is 'Jennifer'.                                                      |
 * | `pets.name:like=Fluf%`             | Returns all Persons that have at least one pet whose name starts with 'Fluf'.                           |
 * | `lastName|movies.name:like=%Gump%` | Returns all Persons whose last name contains 'Gump' or who acted in a movie whose name contains 'Gump'. |
 * | `parent.age:lt=60`                 | Returns all persons whose parent's age is less than 60.                                                 |
 * | `parent.age:in=20,22,24`           | Returns all persons whose parent's age is 20, 22 or 24.                                                 |
 *
 * Filter query parameters are joined with `AND` operator so for example the query string:
 *
 * ```
 * firstName:eq=Jennifer&parent.age:lt=60&pets.name:like=Fluf%
 * ```
 *
 * would return the Persons whose firstName is 'Jennifer' and whose parent's age is less than 60 and who have
 * at least one pet whose name starts with 'Fluf'.
 *
 *
 * ## Special parameters
 *
 * In addition to the filter parameters, there is a set of query parameters that have a special meaning:
 *
 * | Special parameter             | Explanation                                                                                  |
 * |-------------------------------|----------------------------------------------------------------------------------------------|
 * | `eager=[pets, parent.movies]` | Which relations to fetch eagerly for the result models. An objection.js relation expression. That pass to `withGraphFetched`. |
 * | `join=[owner]`                | Which relations to fetch eagerly for the result models. An objection.js relation expression. That pass to `withGraphJoined`. |
 * | `orderBy=firstName`           | Sort the result by certain property.                                                         |
 * | `orderByDesc=firstName`       | Sort the result by certain property in descending order.                                     |
 * | `rangeStart=10`               | The start of the result range. The result will be `{total: 12343, results: [ ... ]}`.        |
 * | `rangeEnd=50`                 | The end of the result range. The result will be `{total: 12343, results: [ ... ]}`.          |
 *
 * @param {Model} modelClass
 * @constructor
 */

class FindQueryBuilder {
  constructor(modelClass) {
    /**
     * An objection.js `Model` subclass constructor.
     *
     * The model for which the find query is created.
     *
     * @type {Model}
     * @private
     */
    this._modelClass = modelClass;

    /**
     * If this is true (default) all property references are allowed.
     *
     * @type {boolean}
     * @private
     */
    this._allowAll = true;

    /**
     * Hash of allowed property references.
     *
     * @type {Object.<string, PropertyRef>}
     * @private
     */
    this._allow = Object.create(null);

    /**
     * Which relations of the result models can be fetched eagerly.
     *
     * See objection.js for information about relation expressions.
     *
     * @type {string|RelationExpression}
     * @private
     */
    this._allowEager = null;

    /**
     * Registered filter functions.
     *
     * @type {Object.<string, function>}
     * @private
     */

    this._filters = Object.create(null);

    /**
     * Query parameter names for `special` parameters.
     *
     * @type {Object.<string, string>}
     * @private
     */
    this._specialParameterMap = Object.create(null);

    /**
     * The inverse of `_specialParameterMap`.
     *
     * @type {Object.<string, string>}
     * @private
     */
    this._inverseSpecialParameterMap = Object.create(null);

    /**
     * Cache for `PropertyRef` objects.
     *
     * @type {Object.<string, PropertyRef>}
     * @private
     */
    this._propertyRefCache = Object.create(null);

    // Register default filters.
    _.each(filters, (filter, name) => {
      this.registerFilter(name, filter);
    });

    // Give default names for the special parameters.
    _.each(SPECIAL_PARAMETERS, (parameterName, name) => {
      this.specialParameter(name, parameterName);
    });
  }

  /**
   * Allow all property references.
   *
   * This is true by default.
   *
   * @returns {FindQueryBuilder}
   */

  allowAll() {
    this._allowAll = true;
    this._allow = [];
    return this;
  }

  /**
   * Sets/gets the allowed eager expression.
   *
   * Calls the `allowEager` method of a objection.js `QueryBuilder`. See the objection.js
   * documentation for more information.
   *
   * @param {String|RelationExpression=} exp
   * @returns {String|RelationExpression|FindQueryBuilder}
   */
  allowEager(exp) {
    if (arguments.length === 0) {
      return this._allowEager;
    } else {
      this._allowEager = exp;
      return this;
    }
  }

  /**
   * Use this method to whitelist property references.
   *
   * By default all properties and relations' properties can be used in the filters
   * and in orderBy. This method can be used to whitelist only a subset of them.
   *
   * ```js
   * findQuery(Person).allow('firstName', 'parent.firstName', 'pets.name');
   * ```
   *
   * @returns {FindQueryBuilder}
   */
  allow() {
    this._allowAll = false;
    _.merge(this._allow, this._parsePropertyRefs(toArray(arguments)));
    return this;
  }

  /**
   * Registers a filter function.
   *
   * Given a query parameter `someProp:eq=10` the `eq` part is the filter. The filter name
   * (in this case 'eq') is mapped to a function that performs the filtering.
   *
   * Filter functions take in a `PropertyRef` instance of the property to be filtered,
   * the filter value and the objection.js model class constructor. The filter functions
   * must return an object `{method: string, args: *}`. For example:
   *
   * ```js
   * function lowercaseEq(propertyRef, value, modelClass) {
   *   return {
   *     method: 'where',
   *     // You can access the name of the column we are filtering through
   *     // `propertyRef.fullColumnName()`.
   *     args: [propertyRef.fullColumnName(), '=', value.toLowerCase()]
   *   };
   * }
   * ```
   *
   * A better `lowercaseEq` would also lowercase the column value:
   *
   * ```js
   * function lowercaseEq(propertyRef, value, modelClass) {
   *   // Always use knex columnization for column references when building raw queries to make sure column names are escaped.
   *   return {
   *     method: 'whereRaw',
   *     // Always escape the user input when building raw queries.
   *     args: ['lower(' + columnName + ') = ?', value.toLowerCase()];
   *     args: ['lower(??) = ?', [propertyRef.fullColumnName(), value.toLowerCase()]]
   *   };
   * }
   * ```
   *
   * The `method` must be the name of one of the knex.js where methods. `args` is the array
   * of arguments for the method. The filter is invoked somewhat like this:
   *
   * ```js
   * const filter = lowercaseEq(propertyRef, value, modelClass);
   * queryBuilder[filter.method].apply(queryBuilder, filter.args);
   * ```
   *
   * The args array can be anything the given where method accepts as an argument. Check
   * out the knex.js documentation.
   *
   * To register `lowercaseEq`:
   *
   * ```js
   * builder.registerFilter('leq', lowercaseEq);
   * ```
   *
   * Now you could use your filter in the query parameters like this `someProperty:leq=Hello`.
   *
   * @param {string} filterName
   * @param {function} filter
   * @returns {FindQueryBuilder}
   */
  registerFilter(filterName, filter) {
    this._filters[filterName] = filter;
    return this;
  }

  /**
   * Give names for the special parameters.
   *
   * This can be used to rename a special parameter for example if it collides with a property name.
   * The following example you can fetch relations eagerly by giving a `withRelated=[pets, movies]`
   * query parameter instead of `eager=[pets, movies]`.
   *
   * ```js
   * builder.specialParameter('eager', 'withRelated');
   * ```
   *
   * @param name
   * @param parameterName
   * @returns {FindQueryBuilder}
   */
  specialParameter(name, parameterName) {
    this._specialParameterMap[name] = parameterName;
    this._inverseSpecialParameterMap = _.invert(this._specialParameterMap);
    return this;
  }

  /**
   * Builds the find query for the given query parameters.
   *
   * ```js
   * var findQuery = require('objection-find');
   * var Person = require('../models/Person');
   *
   * expressApp.get('/api/persons', function (req, res, next) {
   *   findQuery(Person).build(req.query).then(function (persons) {
   *     res.send(persons);
   *   }).catch(next);
   * });
   * ```
   *
   * @param {Object<string, string|Array.<string>>} params
   *    Query parameter hash. For example express's `req.query`.
   *
   * @param {QueryBuilder=} builder
   *    Optional objection.js QueryBuilder instance. If not given,
   *    modelClass.query() is used.
   *
   * @returns {QueryBuilder}
   */
  build(params, builder) {
    builder = builder || this._modelClass.query();
    params = this._parseQueryParameters(params);

    this._buildCount(params, builder);
    this._buildJoins(params, builder);
    this._buildFilters(params, builder);
    this._buildGroupBy(params, builder);
    this._buildOrderBy(params, builder);
    this._buildRange(params, builder);
    this._buildEager(params, builder);
    this._buildJoin(params, builder);

    return builder;
  }

  _parseQueryParameters(params) {
    const parsed = [];

    _.each(params, (value, key) => {
      if (_.isArray(value)) {
        return _.each(value, (value) => {
          parsed.push(new QueryParameter(value, key, this));
        });
      } else {
        parsed.push(new QueryParameter(value, key, this));
      }
    });

    // Check that we only have allowed property references in the query parameters.
    if (!this._allowAll) {
      _.each(parsed, (param) => {
        _.each(param.propertyRefs, (ref) => {
          if (!this._allow[ref.str]) {
            utils.throwError('Property reference "' + ref.str + '" not allowed');
          }
        });
      });
    }

    return parsed;
  }

  _buildCount(params, builder) {
    const countParam = _.find(params, { key: 'count' });
    if (countParam) {
      builder.count(countParam.value);
    }
  }

  _buildJoins(params, builder) {
    // Array of Objection `Relation` subclass instances.
    const relationsToJoin = [];

    _.each(params, function (param) {
      _.each(param.propertyRefs, (ref) => {
        const rel = ref.relation;
        if (rel && rel.isOneToOne()) {
          relationsToJoin.push(rel);
        }
      });
    });

    _.each(_.uniq(relationsToJoin, 'name'), (relation) => {
      relation.join(builder, {
        joinOperation: 'leftJoin',
        relatedTableAlias: this._modelClass.tableName + '_rel_' + relation.name,
      });
    });

    if (!_.isEmpty(relationsToJoin)) {
      builder.select(this._modelClass.tableName + '.*');
    }
  }

  _buildFilters(params, builder) {
    const filterParams = _.filter(params, 'filter');

    _.each(filterParams, (param) => {
      this._buildFilter(param, builder);
    });
  }

  /**
   * @private
   */
  _buildFilter(param, builder) {
    const refNames = _.keys(param.propertyRefs);

    if (refNames.length === 1) {
      const ref = param.propertyRefs[refNames[0]];
      ref.buildFilter(param, builder);
    } else {
      // If there are multiple property refs, they are combined with an `OR` operator.
      builder.where(function () {
        const builder = this;

        _.each(param.propertyRefs, function (ref) {
          ref.buildFilter(param, builder, 'or');
        });
      });
    }
  }

  /**
   * @private
   */
  _buildGroupBy(params, builder) {
    const groupByParam = _.find(params, { key: 'groupBy' });
    if (groupByParam) {
      builder.select(groupByParam.value.split(','));
      builder.groupBy(groupByParam.value.split(','));
    }
  }

  /**
   * @private
   */
  _buildOrderBy(params, builder) {
    const self = this;

    _.each(params, (param) => {
      const orderType = param.specialParameter;
      let dir = 'asc';

      if (orderType && orderType.indexOf('orderBy') !== -1) {
        const propertyRef = param.propertyRefs[0];

        if (orderType === 'orderByDesc') {
          dir = 'desc';
        }

        const rel = propertyRef.relation;
        if (rel) {
          if (!rel.isOneToOne()) {
            utils.throwError(
              "Can only order by model's own properties and by BelongsToOneRelation relations' properties"
            );
          }
          const columnNameAlias = rel.name + _.capitalize(propertyRef.propertyName);
          builder.select(propertyRef.fullColumnName() + ' as ' + columnNameAlias);
          builder.orderBy(columnNameAlias, dir);
        } else {
          builder.orderBy(propertyRef.columnName, dir);
        }
      }
    });
  }

  _buildRange(params, builder) {
    let rangeStart = _.find(params, { specialParameter: 'rangeStart' });
    let rangeEnd = _.find(params, { specialParameter: 'rangeEnd' });

    if (rangeStart && rangeEnd) {
      rangeStart = _.parseInt(rangeStart.value);
      rangeEnd = _.parseInt(rangeEnd.value);

      if (_.isNaN(rangeStart) || _.isNaN(rangeEnd)) {
        utils.throwError('Invalid range start or end "' + rangeStart + ' - ' + rangeEnd + '"');
      }

      builder.range(rangeStart, rangeEnd);
    }
  }

  _buildEager(params, builder) {
    let eager = _.find(params, { specialParameter: 'eager' });

    if (!eager) {
      return;
    }

    if (this._allowEager) {
      builder.allowGraph(this._allowEager);
    }

    builder.withGraphFetched(eager.value);
  }

  _buildJoin(params, builder) {
    let join = _.find(params, { specialParameter: 'join' });

    if (!join) {
      return;
    }

    if (this._allowEager) {
      builder.allowGraph(this._allowEager);
    }

    builder.withGraphJoined(join.value);
  }

  _parsePropertyRefs(refs) {
    return _.reduce(
      refs,
      (output, ref) => {
        output[ref] = this._parsePropertyRef(ref);
        return output;
      },
      {}
    );
  }

  _parsePropertyRef(ref) {
    if (!this._propertyRefCache[ref]) {
      this._propertyRefCache[ref] = new PropertyRef(ref, this);
    }

    return this._propertyRefCache[ref];
  }
}

function toArray() {
  return _(arguments).flattenDeep().compact().value();
}

module.exports = FindQueryBuilder;
