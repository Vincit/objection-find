import { expectType } from 'tsd';
import findQuery, { findQuery as findQueryNamed, FindQueryBuilder } from '../../';
import findQueryDefault from '../../';
import * as findQueryStar from '../../';
import findQueryCjsImport = require('../../');
import Movie from './Movie';
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
