import { expectType } from 'tsd';
import findQuery, { findQuery as findQueryNamed, FindQueryBuilder } from '../../';
import findQueryDefault from '../../';
import * as findQueryStar from '../../';
import findQueryCjsImport = require('../../');
import Movie from './Movie';
import {
  ArrayQueryBuilder,
  NumberQueryBuilder,
  PageQueryBuilder,
  QueryBuilder,
  SingleQueryBuilder,
} from 'objection';

const findQueryCjs = require('../../');
const { findQuery: findQueryCjsNamed } = require('../../');

expectType<FindQueryBuilder<Movie>>(findQueryNamed(Movie));
expectType<FindQueryBuilder<Movie>>(findQueryDefault<Movie>(Movie));
expectType<FindQueryBuilder<Movie>>(findQueryStar.findQuery(Movie));
expectType<FindQueryBuilder<Movie>>(findQueryStar.default(Movie));
expectType<FindQueryBuilder<Movie>>(findQueryCjsImport.findQuery(Movie));
expectType<FindQueryBuilder<Movie>>(findQueryCjsImport.default(Movie));
// eslint-disable-next-line
expectType<any>(findQueryCjs(Movie));
// eslint-disable-next-line
expectType<any>(findQueryCjsNamed(Movie));

findQuery(Movie).specialParameter('eager', 'withRelated').build({
  'id:eq': 5,
  withRelated: 'parent.[movies, pets]',
});

expectType<PageQueryBuilder<QueryBuilder<Movie>>>(Movie.query().page(1, 2));
findQuery(Movie).build({}, Movie.query().page(1, 2));

expectType<ArrayQueryBuilder<QueryBuilder<Movie>>>(Movie.query().insertAndFetch([]));
findQuery(Movie).build({}, Movie.query().insertAndFetch([]));

expectType<SingleQueryBuilder<QueryBuilder<Movie>>>(Movie.query().findById(1));
findQuery(Movie).build({}, Movie.query().findById(1));

expectType<NumberQueryBuilder<QueryBuilder<Movie>>>(Movie.query().update());
findQuery(Movie).build({}, Movie.query().update());
