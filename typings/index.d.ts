import { Model, ModelClass, Page, RelationExpression } from 'objection';

interface FilterFn<M extends Model> {
  (propertyRef: PropertyRef<M>, value: string, modelClass: ModelClass<M>): { method: string; args: any[] };
}

export class FindQueryBuilder<M extends Model, R = M[]> {
  ArrayQueryBuilderType: FindQueryBuilder<M>;
  SingleQueryBuilderType: FindQueryBuilder<M, M>;
  NumberQueryBuilderType: FindQueryBuilder<M, number>;
  PageQueryBuilderType: FindQueryBuilder<M, Page<M>>;

  constructor(model: M);

  /**
   * Use this method to whitelist property references.
   *
   * By default all properties and relations' properties can be used in the filters
   * and in orderBy. This method can be used to whitelist only a subset of them.
   *
   * ```js
   * findQuery(Person).allow('firstName', 'parent.firstName', 'pets.name');
   * ```
   */
  allow(...args: string[]): this['SingleQueryBuilderType'] & M['QueryBuilderType']['SingleQueryBuilderType'];

  /**
   * Allow all property references. This is true by default.
   */
  allowAll(bool: boolean): this['SingleQueryBuilderType'] & M['QueryBuilderType']['SingleQueryBuilderType'];

  /**
   * Sets/gets the allowed eager expression.
   *
   * Calls the `allowEager` method of a objection.js `QueryBuilder`. See the objection.js
   * documentation for more information.
   */
  allowEager(exp: RelationExpression<M>): this['SingleQueryBuilderType'] & M['QueryBuilderType']['SingleQueryBuilderType'] | null;

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
   */
  registerFilter(filterName: string, filter: FilterFn<M>): this['SingleQueryBuilderType'] & M['QueryBuilderType']['SingleQueryBuilderType'];

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
   */
  specialParameter(name: string, parameterName: string): this['SingleQueryBuilderType'] & M['QueryBuilderType']['SingleQueryBuilderType'];

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
   */
  build(params: object, builder?: this['SingleQueryBuilderType'] & M['QueryBuilderType']['SingleQueryBuilderType']): this['SingleQueryBuilderType'] & M['QueryBuilderType']['SingleQueryBuilderType'];
}

export class PropertyRef<M extends Model> {
  /**
   * Instances of this class represent property references.
   *
   * A property reference refers to a property of the model class we are building a
   * query for. For example property reference `firstName` refers to the model class's
   * `firstName` property and `movies.name` refers to the `name` property of the model
   * class's `movies` relation.
   *
   * @param str
   *    The property reference string.
   *
   * @param builder
   *    The builder that will use the reference.
   */
  constructor(str: string, builder?: FindQueryBuilder<M>);

  /**
   * Returns the full column name to be used in the queries.
   *
   * The returned string contains the appropriate table name or table alias. For
   * example `Person.firstName` or `Animal.name`.
   */
  fullColumnName(): string;

  /**
   * Builds a where statement.
   */
  buildFilter(param: string, builder: FindQueryBuilder<M>, boolOp?: string): void;
}

interface FindStatic<T extends typeof Model> {
  QueryBuilder: typeof FindQueryBuilder;
  new(): FindInstance<T> & T['prototype'];
}

interface FindInstance<T extends typeof Model> {
  QueryBuilderType: FindQueryBuilder<this & T['prototype']>;
}

export default function findQuery<T extends typeof Model>(subClass: T): FindStatic<T> & Omit<T, 'new'> & T['prototype'];
