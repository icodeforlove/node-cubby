## cubby

a super simple sync way to store javascript information not geared towards performance

## installation

    $ npm install cubby

## usage

```javascript
var Cubby = require('cubby'),
	cubby = new Cubby();

cubby.set('foo', 'bar');

console.log(cubby.get('foo'));
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