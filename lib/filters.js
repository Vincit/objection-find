'use strict';

module.exports = {
  in: inSet,
  eq: eq,
  neq: neq,
  lt: lt,
  lte: lte,
  gt: gt,
  gte: gte,
  like: like,
  likeLower: likeLower,
  isNull: isNull,
  notNull: notNull,
};

/**
 * @private
 */
function basicWhere(propertyRef, operator, value) {
  return {
    method: 'where',
    args: [propertyRef.fullColumnName(), operator, value],
  };
}

/**
 * @private
 */
function inSet(propertyRef, value) {
  return {
    method: 'whereIn',
    args: [propertyRef.fullColumnName(), value.split(',')],
  };
}

/**
 * @private
 */
function eq(propertyRef, value) {
  return basicWhere(propertyRef, '=', value);
}

/**
 * @private
 */
function neq(propertyRef, value) {
  return basicWhere(propertyRef, '<>', value);
}

/**
 * @private
 */
function lt(propertyRef, value) {
  return basicWhere(propertyRef, '<', value);
}

/**
 * @private
 */
function lte(propertyRef, value) {
  return basicWhere(propertyRef, '<=', value);
}

/**
 * @private
 */
function gt(propertyRef, value) {
  return basicWhere(propertyRef, '>', value);
}

/**
 * @private
 */
function gte(propertyRef, value) {
  return basicWhere(propertyRef, '>=', value);
}

/**
 * @private
 */
function like(propertyRef, value) {
  return basicWhere(propertyRef, 'like', value);
}

/**
 * @private
 */
function likeLower(propertyRef, value, modelClass) {
  return {
    method: 'whereRaw',
    args: ['lower(??) like ?', [propertyRef.fullColumnName(), value.toLowerCase()]],
  };
}

/**
 * @private
 */
function isNull(propertyRef) {
  return basicWhere(propertyRef, 'is', null);
}

/**
 * @private
 */
function notNull(propertyRef) {
  return basicWhere(propertyRef, 'is not', null);
}
