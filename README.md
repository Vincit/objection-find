[![Build Status](https://travis-ci.org/Vincit/objection-find.svg?branch=master)](https://travis-ci.org/Vincit/objection-find) [![Coverage Status](https://coveralls.io/repos/Vincit/objection-find/badge.svg?branch=master&service=github)](https://coveralls.io/github/Vincit/objection-find?branch=master)

# Topics

- [Introduction](#introduction)
- [Installation](#installation)
- [Getting started](#getting-started)
- [Query parameters](#query-parameters)
- [API documentation](API.md)

# Introduction

Note: since Objection.js (which this library is based on) now requires Node 6.0.0 as the minimum, objection-find will not work on node < 6.0.0 either.

Objection-find is a module for building search queries for [objection.js](https://github.com/Vincit/objection.js/)
models using HTTP query parameters. You can easily filter, order and page the result based on model's properties and
relations using simple expressions. Relations can be eagerly fetched for the results using objection.js relation
expressions.

Using objection-find in an [express](http://expressjs.com/) route is as easy as this:

```js
var findQuery = require('objection-find');
// Our objection.js model.
var Person = require('../models/Person');

expressApp.get('/api/persons', function (req, res, next) {
  findQuery(Person)
    .allow(['firstName', 'movies.name', 'children.age', 'parent.lastName'])
    .allowEager('[children.movies, movies, parent.movies]')
    .build(req.query)
    .then(function (persons) {
      res.send(persons);
    })
    .catch(next);
});
```

Objection-find can be used with any node.js framework. Express is not a requirement. The route we just created can
be used like this:

```js
$http({
  method: 'GET',
  url: '/api/persons',

  // HTTP Query parameters.
  params: {
    // Select all persons whose first name starts with 'j' or 'J'
    'firstName:likeLower': 'J%',

    // And who have acted in the movie 'Silver Linings Playbook'.
    // This checks if the relation `movies` contains at least
    // one movie whose name equals 'Silver Linings Playbook'.
    'movies.name:eq': 'Silver Linings Playbook',

    // And who have at least one child younger than 10.
    // This checks if the relation `children` contains at least
    // one person whose age is less than 10.
    'children.age:lt': 10,

    // Order the result by person's parent's last name.
    // `parent` is a one-to-one relation.
    'orderBy': 'parent.lastName',

    // Fetch relations for the results. This is an objection.js
    // relation expression. Check out objection.js for more info.
    'eager': '[children, movies, parent.movies]',

    // Fetch only count of entries that satisfy given criteria. Value can include optional alias parameter, e. g. 'id as countId'. '*' is a valid value.
    'count': 'id',

    // Group fetched entries by specified properties. Primarily intended to be used together with 'count' parameter'.
    'groupBy': 'firstName,lastName',

    // Select a range starting from index 0
    'rangeStart': 0,

    // Select a range ending to index 4
    'rangeEnd': 4
  }
}).then(function (res) {
  var persons = res.data.results;

  console.log(persons.length); // --> 5
  console.log(persons[0].children);
  console.log(persons[0].movie);
  console.log(persons[0].parent.movies);

  // Total size of the result if the range wasn't given.
  console.log(res.data.total);
});
```

In our example `Person` model had a one-to-one relation `parent`, a many-to-many relation `movies` and one-to-many
relation `children`. This example used the `$http` module of [AngularJS](https://angularjs.org/) but you can use
objection-find with anything that can send an HTTP request.

Documentation on the supported query parameters can be found [here](#query-parameters) and API documentation
[here](API.md).

It is recommended to use [query builder](https://www.npmjs.com/package/objection-find-query-builder) for constructing query parameters on the client side.

# Installation

```sh
npm install objection objection-find
```

# Getting started

Easiest way to get started is to use [the objection.js example project](https://github.com/Vincit/objection.js/tree/master/examples/express)
and copy paste this to the `api.js` file:

```js
var findQuery = require('objection-find');

app.get('/persons/search', function (req, res, next) {
  findQuery(Person).build(req.query).then(function (persons) {
    res.send(persons);
  }).catch(next);
});
```

You also need to run this in the root of the example project to install objection-find:

```sh
npm install --save objection-find
```

Now you can start bombing the `/persons/search` route. Documentation on the supported query parameters can be found
[here](#query-parameters).

# Query parameters

Objection-find understands two kinds of query parameters: `filters` and `special parameters`.

## Filters

A filter parameter has the following format:

```
<propertyReference>|<propertyReference>|...:<filter>=<value>
```

A `propertyReference` is either simply a property name like `firstName` or a reference to a relation's property like
`children.age` (`children` is the name of the relation).

`filter` is one of the built-in filters `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `like`, `likeLower` `in`, `notNull` or `isNull`.
Filter can also be a custom filter registered using the `registerFilter` method.

The following examples explain how filter parameters work. For the examples, assume we have an objection.js model
`Person` that has a one-to-one relation `parent`, a many-to-many relation `movies` and one-to-many relation `children`.

| Filter query parameter             | Explanation                                                                                             |
|------------------------------------|---------------------------------------------------------------------------------------------------------|
| `firstName=Jennifer`               | Returns all Persons whose first name is 'Jennifer'.                                                     |
| `firstName:eq=Jennifer`            | Returns all Persons whose first name is 'Jennifer'.                                                     |
| `children.firstName:like=%rad%`    | Returns all Persons who have at least one child whose first name contains 'rad'.                        |
| `lastName\|movies.name:like=%Gump%` | Returns all Persons whose last name contains 'Gump' or who acted in a movie whose name contains 'Gump'. |
| `parent.age:lt=60`                 | Returns all persons whose parent's age is less than 60.                                                 |
| `parent.age:in=20,22,24`           | Returns all persons whose parent's age is 20, 22 or 24.                                                 |

Filters are joined with `AND` operator so for example the query string:

```
firstName:eq=Jennifer&parent.age:lt=60&children.firstName:like=%rad%
```

would return the Persons whose firstName is 'Jennifer' and whose parent's age is less than 60 and who have
at least one child whose name contains 'rad'.


## Special parameters

In addition to the filter parameters, there is a set of query parameters that have a special meaning:

| Special parameter                 | Explanation                                                                                              |
|-----------------------------------|----------------------------------------------------------------------------------------------------------|
| `eager=[children, parent.movies]` | Which relations to fetch eagerly for the result models. An objection.js relation expression. That pass to [withGraphFetched](https://vincit.github.io/objection.js/api/query-builder/eager-methods.html#withgraphfetched). |
| `join=[parent, parent.movies]`    | Which relations to join and fetch eagerly for the result models. An objection.js relation expression. That pass to [withGraphJoined](https://vincit.github.io/objection.js/api/query-builder/eager-methods.html#withgraphjoined). |
| `orderBy=firstName`               | Sort the result by certain property.                                                                     |
| `orderByDesc=firstName`           | Sort the result by certain property in descending order.                                                 |
| `rangeStart=10`                   | The start of the result range (inclusive). The result will be `{total: 12343, results: [ ... ]}`.        |
| `rangeEnd=50`                     | The end of the result range (inclusive). The result will be `{total: 12343, results: [ ... ]}`.          |
