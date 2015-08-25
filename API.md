# API Reference




## require('objection-find')

#### `findQuery(modelClass)` -> [FindQueryBuilder](#findquerybuilder)

The function returned by `require('objection-find')` can be used to create a [FindQueryBuilder](#findquerybuilder)
instance. Just pass an [objection.js](https://github.com/Vincit/objection.js/) model constructor to the function 
and start building the query. 

```js
var findQuery = require('objection-find');
var Person = require('./models/Person');
var builder = findQuery(Person);
```

`findQuery(Person)` is just a shortcut for [new findQuery.FindQueryBuilder(Person)](#new-findquerybuilderobjectionmodel-model---findquerybuilder)

### Properties

#### `findQuery.FindQueryBuilder`

The [FindQueryBuilder constructor](#new-findquerybuilderobjectionmodel-model---findquerybuilder). You can use this to create subclasses and whatnot.




## FindQueryBuilder

### Methods

 - [new FindQueryBuilder(objection.Model)](#new-findquerybuilderobjectionmodel-model---findquerybuilder)

##### `new FindQueryBuilder(objection.Model model)` -> `FindQueryBuilder`

The constructor.
