'use strict';

var _ = require('lodash');
var nodeUtils = require('util');
var utils = require('./utils');
var filters = require('./filters');
var PropertyRef = require('./PropertyRef');
var QueryParameter = require('./QueryParameter');

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
 * | `eager=[pets, parent.movies]` | Which relations to fetch eagerly for the result models. An objection.js relation expression. |
 * | `orderBy=firstName`           | Sort the result by certain property.                                                         |
 * | `orderByDesc=firstName`       | Sort the result by certain property in descending order.                                     |
 * | `rangeStart=10`               | The start of the result range. The result will be `{total: 12343, results: [ ... ]}`.        |
 * | `rangeEnd=50`                 | The end of the result range. The result will be `{total: 12343, results: [ ... ]}`.          |
 *
 * @param {Model} modelClass
 * @constructor
 */
function FindQueryBuilder(modelClass) {
  var self = this;

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
   * Knex.js formatter.
   *
   * Used for example to escape column references in raw queries.
   *
   * @type {Formatter}
   * @private
   */
  this._formatter = modelClass.formatter();

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
  _.each(filters, function (filter, name) {
    self.registerFilter(name, filter);
  });

  // Give default names for the special parameters.
  _.each({
    eager: 'eager',
    rangeEnd: 'rangeEnd',
    rangeStart: 'rangeStart',
    orderBy: 'orderBy',
    orderByAsc: 'orderByAsc',
    orderByDesc: 'orderByDesc'
  }, function (parameterName, name) {
    self.specialParameter(name, parameterName);
  });
}

/**
 * Makes the given constructor a subclass of this class.
 *
 * @param {function=} subclassConstructor
 * @return {function}
 */
FindQueryBuilder.extend = function (subclassConstructor) {
  for (var key in this) {
    subclassConstructor[key] = this[key];
  }
  nodeUtils.inherits(subclassConstructor, this);
  return subclassConstructor;
};

/**
 * Allow all property references.
 *
 * This is true by default.
 *
 * @returns {FindQueryBuilder}
 */
FindQueryBuilder.prototype.allowAll = function () {
  this._allowAll = true;
  this._allow = [];
  return this;
};

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
FindQueryBuilder.prototype.allow = function () {
  this._allowAll = false;
  _.merge(this._allow, this._parsePropertyRefs(toArray(arguments)));
  return this;
};

/**
 * Sets/gets the allowed eager expression.
 *
 * Calls the `allowEager` method of a objection.js `QueryBuilder`. See the objection.js
 * documentation for more information.
 *
 * @param {String|RelationExpression=} exp
 * @returns {String|RelationExpression|FindQueryBuilder}
 */
FindQueryBuilder.prototype.allowEager = function (exp) {
  if (arguments.length === 0) {
    return this._allowEager;
  } else {
    this._allowEager = exp;
    return this;
  }
};

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
 *   var formatter = modelClass.formatter();
 *   // Always use `formatter.wrap` for column references when building raw queries.
 *   var columnName = formatter.wrap(propertyRef.fullColumnName());
 *
 *   return {
 *     method: 'whereRaw',
 *     // Always escape the user input when building raw queries.
 *     args: ['lower(' + columnName + ') = ?', value.toLowerCase()];
 *   };
 * }
 * ```
 *
 * The `method` must be the name of one of the knex.js where methods. `args` is the array
 * of arguments for the method. The filter is invoked somewhat like this:
 *
 * ```js
 * var filter = lowercaseEq(propertyRef, value, modelClass);
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
FindQueryBuilder.prototype.registerFilter = function (filterName, filter) {
  this._filters[filterName] = filter;
  return this;
};

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
FindQueryBuilder.prototype.specialParameter = function (name, parameterName) {
  this._specialParameterMap[name] = parameterName;
  this._inverseSpecialParameterMap = _.invert(this._specialParameterMap);
  return this;
};

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
FindQueryBuilder.prototype.build = function (params, builder) {
  builder = builder || this._modelClass.query();
  params = this._parseQueryParameters(params);

  this._buildJoins(params, builder);
  this._buildFilters(params, builder);
  this._buildOrderBy(params, builder);
  this._buildRange(params, builder);
  this._buildEager(params, builder);

  return builder;
};

/**
 * @private
 */
FindQueryBuilder.prototype._parseQueryParameters = function (params) {
  var self = this;
  var parsed = [];

  _.each(params, function (value, key) {
    if (_.isArray(value)) {
      return _.each(value, function (value) {
        parsed.push(new QueryParameter(value, key, self));
      });
    } else {
      parsed.push(new QueryParameter(value, key, self));
    }
  });

  // Check that we only have allowed property references in the query parameters.
  if (!this._allowAll) {
    _.each(parsed, function (param) {
      _.each(param.propertyRefs, function (ref) {
        if (!self._allow[ref.str]) {
          utils.throwError('Property reference "' + ref.str + '" not allowed');
        }
      });
    });
  }

  return parsed;
};

/**
 * @private
 */
FindQueryBuilder.prototype._buildJoins = function (params, builder) {
  // Array of Objection `Relation` subclass instances.
  var relationsToJoin = [];

  _.each(params, function (param) {
    _.each(param.propertyRefs, function (ref) {
      if (ref.relation && utils.isOneToOneRelation(ref.relation)) {
        relationsToJoin.push(ref.relation);
      }
    });
  });

  _.each(_.uniq(relationsToJoin, 'name'), function (relation) {
    relation.join(builder, {joinOperation: 'leftJoin'});
  });

  if (!_.isEmpty(relationsToJoin)) {
    builder.select(this._modelClass.tableName + '.*');
  }
};

/**
 * @private
 */
FindQueryBuilder.prototype._buildFilters = function (params, builder) {
  var self = this;
  var filterParams = _.filter(params, 'filter');

  _.each(filterParams, function (param) {
    self._buildFilter(param, builder);
  });
};

/**
 * @private
 */
FindQueryBuilder.prototype._buildFilter = function (param, builder) {
  var self = this;
  var refNames = _.keys(param.propertyRefs);

  if (refNames.length === 1) {
    var ref = param.propertyRefs[refNames[0]];
    ref.buildFilter(param, builder);
  } else {
    // If there are multiple property refs, they are combined with an `OR` operator.
    builder.where(function () {
      var builder = this;

      _.each(param.propertyRefs, function (ref) {
        ref.buildFilter(param, builder, 'or');
      });
    });
  }
};

/**
 * @private
 */
FindQueryBuilder.prototype._buildOrderBy = function (params, builder) {
  var self = this;

  _.each(params, function (param) {
    var orderType = param.specialParameter;
    var dir = 'asc';

    if (orderType && orderType.indexOf('orderBy') !== -1) {
      var propertyRef = param.propertyRefs[0];

      if (orderType === 'orderByDesc') {
        dir = 'desc';
      }

      if (propertyRef.relation) {
        if (!utils.isOneToOneRelation(propertyRef.relation)) {
          utils.throwError("Can only order by model's own properties and by BelongsToOneRelation relations' properties");
        }
        var columnNameAlias = propertyRef.relation.name + _.capitalize(propertyRef.propertyName);
        builder.select(propertyRef.fullColumnName() + ' as ' + columnNameAlias);
        builder.orderBy(columnNameAlias, dir);
      } else {
        builder.orderBy(propertyRef.fullColumnName(), dir);
      }
    }
  });
};

/**
 * @private
 */
FindQueryBuilder.prototype._buildRange = function (params, builder) {
  var rangeStart = _.find(params, {specialParameter: 'rangeStart'});
  var rangeEnd = _.find(params, {specialParameter: 'rangeEnd'});

  if (rangeStart && rangeEnd) {
    rangeStart = _.parseInt(rangeStart.value);
    rangeEnd = _.parseInt(rangeEnd.value);

    if (_.isNaN(rangeStart) || _.isNaN(rangeEnd)) {
      utils.throwError('Invalid range start or end "' + rangeStart + ' - ' + rangeEnd + '"');
    }

    builder.range(rangeStart, rangeEnd);
  }
};

/**
 * @private
 */
FindQueryBuilder.prototype._buildEager = function (params, builder) {
  var eager = _.find(params, {specialParameter: 'eager'});

  if (!eager) {
    return;
  }

  if (this._allowEager) {
    builder.allowEager(this._allowEager);
  }

  builder.eager(eager.value);
};

/**
 * @private
 */
FindQueryBuilder.prototype._parsePropertyRefs = function (refs) {
  var self = this;

  return _.reduce(refs, function (output, ref) {
    output[ref] = self._parsePropertyRef(ref);
    return output;
  }, {});
};

/**
 * @private
 */
FindQueryBuilder.prototype._parsePropertyRef = function (ref) {
  if (!this._propertyRefCache[ref]) {
    this._propertyRefCache[ref] = new PropertyRef(ref, this);
  }

  return this._propertyRefCache[ref];
};

/**
 * @private
 */
function toArray() {
  return _(arguments).flattenDeep().compact().value();
}

module.exports = FindQueryBuilder;
