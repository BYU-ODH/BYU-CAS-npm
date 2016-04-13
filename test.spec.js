var expect     = require('expect.js'),
    cas        = require('./index');

var MOCK_USERNAME = 'prabbit',
    MOCK_PASSWORD = 'prabbitprabbit1',
    SERVICE = 'https://example.byu.edu/example';

it('should fail on an incorrect ticket', function(done) {
  cas.validate("deadbeef", SERVICE).then(null, function error(e) {
    expect(e).to.be.an(Error);
    done();
  });
});

it('should validate a correct CAS ticket', function(done) {
  cas.getTicket(MOCK_USERNAME, MOCK_PASSWORD, SERVICE).then(function success(ticket){
    cas.validate(ticket, SERVICE).then(function success(response){
      expect(response.username).to.be(MOCK_USERNAME);
      expect(response.attributes.name).to.be.a('string');
      expect(response.attributes.emailAddress).to.be.a('string');
      done();
    });
  });
});

it('should retrieve correct ticket when the service has the word "ticket" in it', function(done) {
  var service = "https://ticket.byu.edu/ticket/ticket?sticket=123&tickets=45&auth_ticket=12";
  cas.getTicket(MOCK_USERNAME, MOCK_PASSWORD, service).then(function success(ticket){
    expect(ticket).to.match(/^ST-.*/);
    done();
  });
});

it('should disable the getTicket method when INSECURE is not set', function() {
  delete process.env.INSECURE;
  delete require.cache[require.resolve('./index')];
  cas = require('./index');
  expect(cas.getTicket).to.be.undefined;
});
