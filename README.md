BYU-CAS
=======

## Examples

### Retrieving a CAS ticket

```javascript
var cas = require('byu-cas');
var service = 'http://example.com/signin';

cas.getTicket('username', 'password', service)
.then(function(ticket){
  // do something with the ticket
});
```

### Validating a ticket
```javascript
var cas = require('byu-cas');

var ticket = doSomethingToGetTicket();
var service = 'http://example.com/signin';

cas.validate(ticket, service).then(function success(response) {
  console.log("Ticket valid! Hello, " + response.username);
}).catch(function error(e) {
  console.log("Invalid ticket. Error message was: " + e.message);
});
```

## Contributing

We're pretty lax, but

* New features must come with an appropriate test
* New features should have an example in `README.md`
* Pull requests will generally not be merged if they break tests
* Use two spaces per indent
