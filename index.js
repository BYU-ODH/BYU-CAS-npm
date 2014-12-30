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
var CAS         = require('xcas'),
    cheerio     = require('cheerio'),
    request     = require('request'),
    https       = require('https');

module.exports = {
  /**
   * Submits a username and password to BYU's CAS services to retrieve a
   * ticket.
   * @see validate
   * @return Promise fulfilled with a ticket
   */
  getTicket: function (username, password, service) {
    return new Promise(function(resolve, reject) {
      var r = request.defaults({
        jar: true,
        followRedirect: false
      });

      var url = 'https://cas.byu.edu/cas/login?service=' + encodeURIComponent(service);
      
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
          if(response.headers.location === undefined) {
            // there might be a link to the ticket instead of a redirect. try that
            var $ = cheerio.load(body);
            _extractTicket($('a').attr('href'));
          }
          else
          {
            _extractTicket(response.headers.location);
          }
        });
      };

      function _extractTicket(url) {
        var query = require('url').parse(url, true).query;

        if(!query || query.ticket === undefined) {
          reject(Error("No ticket returned"));
          return;
        }
        resolve(query.ticket);
      };

      function _parseHTML(html) {
        var fields = _getCASFieldsFromHTML(html);
        fields.username = username;
        fields.password = password;
        return fields;
      };

      function _handleCASError(e){
        reject(Error(e));
      };
    });
  },

  /**
   * Checks whether or not a ticket is valid.
   * @param {string} ticket - The ticket to validate
   * @param {string} service - Should match the URL passed as a service in the CAS
   *                       query string, e.g., cas.byu.edu/cas/signin?service=example.com
   * @return Promise rejected when the ticket is invalid, resolved otherwise.
   */
  validate: function(ticket, service) {
    return new Promise(function (resolve, reject) {
      var cas = new CAS({
        base_url: 'https://cas.byu.edu/cas/',
        service: service,
        version: 2.0
      });

      cas.validate(ticket, function(err, status, username, details) {
        if (err || !status) {
          reject(Error("Could not validate CAS ticket: " + err));
        } else {
          var attributes = _parseAttributes(details.attributes);
          resolve({username: username, attributes: attributes});
        }
      });
    });
  }
};

// converts data in the attributes from all arrays to appropriate types
function _parseAttributes(attributes) {
  var BOOLS = [
    'activeParttimeNonBYUEmployee',
    'activeParttimeInstructor',
    'inactiveFulltimeEmployee',
    'activeFulltimeInstructor',
    'activeFulltimeNonBYUEmployee',
    'inactiveParttimeNonBYUEmployee',
    'organization',
    'activeEligibletoRegisterStudent',
    'preferredSurname',
    'inactiveParttimeInstructor',
    'inactiveFulltimeNonBYUEmployee',
    'restricted',
    'alumni',
    'inactiveParttimeEmployee',
    'inactiveFulltimeInstructor',
    'activeFulltimeEmployee',
    'activeParttimeEmployee',
  ];
  var STRINGS = [
    'restOfName',
    'surname',
    'preferredFirstName',
    'sortName',
    'name',
    'netId',
    'byuId',
    'emailAddress',
    'personId',
    'fullName'
  ]
  var SPLIT_ARRAY = ['memberOf'];

  var new_attrs = {};
  Object.keys(attributes).forEach(function(key) {
    if(BOOLS.indexOf(key) !== -1) {
      new_attrs[key] = (attributes[key][0] == 'true');
    }
    else if(STRINGS.indexOf(key) !== -1) {
      new_attrs[key] = attributes[key][0];
    }
    else if(SPLIT_ARRAY.indexOf(key) !== -1) {
      var val = attributes[key][0];
      if(val === '') {
        new_attrs[key] = [];
      }
      else
      {
        new_attrs[key] = val.split(',');
      }
    }
    else
    {
      new_attrs[key] = attributes[key];
    }
  });
  return new_attrs;
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
