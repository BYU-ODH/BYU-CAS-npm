/***
 *
 * CAS client specific to BYU
 * 
 *  ____                   ______
 * /----      /===\       /
 * ||        /     \      (--- 
 * ||       / ===== \         )
 * \----   /         \   ====ss
 *
 * ~~~terrible word art~~~
 */

var Promise = typeof Promise !== 'undefined' ? Promise : require('bluebird');
var CAS         = require('fmontmasson-xcas'),
    cheerio     = require('cheerio'),
    request     = require('request'),
    https       = require('https');

module.exports = {
  /**
   * Submits a username and password to BYU's CAS services to retrieve a
   * ticket.
   * @see validate
   * @return {Promis} fulfilled with a ticket
   */
  getTicket: function (username, password, service) {
    return new Promise(function(resolve, reject) {
      var r = request.defaults({
        jar: true,
        followRedirect: false
      });

      var url = 'https://cas.byu.edu/cas/login?service=' + service;
      
      var req = r.get(url, function(error, response, body){
        if(error) {
          _handleCASError(error);
          return;
        }
        _handleHTML(body);
      });

      function _handleHTML(html) {
        var fields = _parseHTML(html);
        var req = r.post(url, {form: fields}, function(error, response, body){
          if(error) {
            _handleCASError(error);
            return;
          }
          _extractTicket(response.headers.location);
        });
      };

      function _extractTicket(url) {
        var t = 'ticket='; // TODO - not the easiest-to-read, or most foolproof, way of getting ticket
        var index = url.indexOf(t);
        if(index === -1) {
          reject("No ticket returned");
          return;
        }
        var ticket = url.slice(url.indexOf(t)+t.length);
        resolve(ticket);
      };

      function _parseHTML(html) {
        var fields = _getCASFieldsFromHTML(html);
        fields.username = username;
        fields.password = password;
        return fields;
      };

      function _handleCASError(e){
        reject(e);
      };
    });
  },

  /**
   * Checks whether or not a ticket is valid.
   * @param {string} ticket - The ticket to validate
   * @param {string} service - Should match the URL passed as a service in the CAS
   *                       query string, e.g., cas.byu.edu/cas/signin?service=example.com
   * @return Promise rejected when the ticket is invalid, resolved otherwise.
   * Both come back as an object like this:
   *
   *    {
   *      error: (the error message, if any)
   *      username: (the username, or null if ticket was invalid)
   *      status: (true if resolved [valid], false if rejected [invalid])
   *    }
   */
  validate: function(ticket, service) {
    return new Promise(function (resolve, reject) {
      var cas = new CAS({
        base_url: 'https://cas.byu.edu/cas/',
        service: service,
        version: 2.0
      });

      cas.validate(ticket, function(err, status, username) {
        if (err) {
          reject({status: false, username: null, error: err});
        } else {
          resolve({status: status, username: username, error: err});
        }
      });
    });
  }
};

// helper function for getTicket
function _getCASFieldsFromHTML(html) {
  var fields = {};
  var $ = cheerio.load(html);

  $('textarea, input').each(function(){
    fields[$(this).attr('name')] = $(this).val();
  });
  return fields;
};
