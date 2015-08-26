# API Reference

<br>
<br>
<br>

## require('objection-find')

#### `findQuery(ObjectionModelConstructor)` -> [FindQueryBuilder](#findquerybuilder)

The function returned by `require('objection-find')` can be used to create a [FindQueryBuilder](#findquerybuilder)
instance. Just pass an [objection.js](https://github.com/Vincit/objection.js/) model constructor to the function 
and start building the query. 

```js
var findQuery = require('objection-find');
var Person = require('./models/Person');
var builder = findQuery(Person);
```

`findQuery(Person)` is just a shortcut for [new findQuery.FindQueryBuilder(Person)](#new-findquerybuilderobjectionmodel-model---findquerybuilder)

#### `findQuery.FindQueryBuilder`

The [FindQueryBuilder constructor](#new-findquerybuilderobjectionmodelconstructor---findquerybuilder). 
You can use this to create subclasses and whatnot.

<br>
<br>
<br>

## FindQueryBuilder

### Methods

 - [new FindQueryBuilder(ObjectionModelConstructor)](#new-findquerybuilderobjectionmodelconstructor---findquerybuilder)
 - [FindQueryBuilder.extend(SubClassConstructor)]()
 - [.allowAll(boolean)]()

##### `new FindQueryBuilder(ObjectionModelConstructor)` -> `FindQueryBuilder`

The constructor function.

```js
var FindQueryBuilder = require('objection-find').FindQueryBuilder;
var Person = require('./models/Person');
var findQueryBuilder = new FindQueryBuilder(Person);
```

#### `FindQueryBuilder.extend(SubClassConstructor)` --> `SubClassConstructor`

Creates a subclass of the FindQueryBuilder.

```js
var FindQueryBuilder = require('objection-find').FindQueryBuilder;

function MyFindQueryBuilder() {
  FindQueryBuilder.apply(this, arguments);
}

FindQueryBuilder.extend(MyFindQueryBuilder);

MyFindQueryBuilder.prototype.someCustomMethod = function () {
  
};
```

#### `.allowAll(boolean)` --> [FindQueryBuilder](#findquerybuilder)

Allows all [property references](https://github.com/Vincit/objection-find#query-parameters). See 
[.allow(string|Array.<string>, ...)]() for allowing only a subset. This is `true` by default.

```js
findQueryBuilder.allowAll(false);
```

#### `.allow(string|Array.<string>, ...)` --> [FindQueryBuilder](#findquerybuilder)

Use this method to whitelist [property references](https://github.com/Vincit/objection-find#query-parameters).
For security reasons it is sometimes important that the user cannot access some properties or relations of a
model. By default all property references are allowed (see [.allowAll(boolean)]()).

```js
findQueryBuilder.allow('firstName', 'parent.firstName', 'pets.name');
// or
findQueryBuilder.allow(['firstName', 'parent.firstName', 'pets.name']);
```

#### `allowEager(string)` --> [FindQueryBuilder](#findquerybuilder)

Sets the eager expression allowed by the `eager` query parameter. Any subset of the allowed expression is accepted 
in the `eager` query parameters. For example setting the allowed expression to `a.b.c` expressions `a`, `a.b` and
`a.b.c` are accepted int the `eager` query parameter.

The eager expression is an objection.js 
[relation expression](http://vincit.github.io/objection.js/RelationExpression.html). This method basically calls 
the [QueryBuilder.allowEager(string)](http://vincit.github.io/objection.js/QueryBuilder.html#allowEager) method 
of the underlying objection.js [QueryBuilder](http://vincit.github.io/objection.js/QueryBuilder.html).

By default, any eager expression is allowed.

```js
findQueryBuilder.allowEager('[movies, children.[movies, children]]');
```

#### `registerFilter(string, function)` --> [FindQueryBuilder](#findquerybuilder)

Registers a filter function.

Given a query parameter `someProp:eq=10` the `eq` part is the filter. The filter name (in this case 'eq') is mapped
to a function that performs the filtering.

Filter functions take in a `PropertyRef` instance of the property to be filtered,
the filter value and the objection.js model class constructor. The filter functions
must return an object `{method: string, args:}`. For example:

```js
function lowercaseEq(propertyRef, value, modelClass) {
  return {
    method: 'where',
    // You can access the name of the column we are filtering through
    // `propertyRef.fullColumnName()`.
    args: [propertyRef.fullColumnName(), '=', value.toLowerCase()]
  };
}
```

A better `lowercaseEq` would also lowercase the column value:

```js
function lowercaseEq(propertyRef, value, modelClass) {
  var formatter = modelClass.formatter();
  // Always use `formatter.wrap` for column references when building raw queries.
  var columnName = formatter.wrap(propertyRef.fullColumnName());

  return {
    method: 'whereRaw',
    // Always escape the user input when building raw queries.
    args: ['lower(' + columnName + ') = ?', value.toLowerCase()];
  };
}
```

The `method` must be the name of one of the objection.js where methods. `args` is the array
of arguments for the method. The filter is invoked somewhat like this:

```js
var filter = lowercaseEq(propertyRef, value, modelClass);
queryBuilder[filter.method].apply(queryBuilder, filter.args);
```

The args array can be anything the given where method accepts as an argument list. Check
out the knex.js and objection.js documentation.

To register `lowercaseEq`:

```js
builder.registerFilter('leq', lowercaseEq);
```

Now you could use your filter in the query parameters like this `someProperty:leq=Hello`.
