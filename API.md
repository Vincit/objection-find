# API Reference

## Main function

#### `findQuery(modelClass)` -> [FindQueryBuilder](#findquerybuilder)

The function returned by `require('objection-find')` can be used to create a `FindQueryBuilder` instance. Just
pass an [objection.js](https://github.com/Vincit/objection.js/) model constructor to the function and start
building the query. 

### Properties

#### `findQuery.FindQueryBuilder`

The `FindQueryBuilder` constructor. You can use this to create subclasses and whatnot.

## FindQueryBuilder

### Methods
