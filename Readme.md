## cubby

super simple synchronous json storage.

## installation

    $ npm install cubby

## interface

**cubby(FILENAME, INITIAL_VALUE, BATCH)**

- FILENAME - the name of the file it will create inside of the .cubby folder
- INITIAL_VALUE - the initial value of the object
- BATCH - default is false, but if you are ok with a 30-50 ms delay between the snapshot of the cubby then this would greatly improve filesystem performance if you are making hundreds of updates at the same time

## usage

```javascript
import cubby from 'cubby';

let users = cubby('users', []);
users.push('test'); // this data is automatically synced with the filesystem

console.log(users);
```