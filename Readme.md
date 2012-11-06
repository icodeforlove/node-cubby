## cubby

super simple synchronous json storage

this was originally created to provide a way to store data for a few command-line tools, and is not geared towards performance

## installation

    $ npm install cubby

## usage

```javascript
var Cubby = require('cubby'),
	cubby = new Cubby();

cubby.set('foo', 'bar');

console.log(cubby.get('foo'));
```

or

```javascript
cubby.set({
	one: 'one',
	two: 'two',
	three: {
		nested: true
	}
});

console.log(cubby.get('one')); // returns one
console.log(cubby.getPath('three.nested')); // returns true
```

## multiple files

by default creating a cubby will result in a cubby.json file, but you can change this by providing a file path

```javascript
var cubbyOne = new Cubby({file: 'something-one.json'}),
	cubbyTwo = new Cubby({file: 'something-two.json'});
```

## paths

```javascript
cubby.setPath('one.two.three', true);
cubby.getPath('one.two.three');
cubby.getPath('one.two.three.four'); // returns undefined when value doesn't exist
```