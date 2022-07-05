const colors = require('colors');
colors.enable()

const assertions = require("./helpers/assertions.js");

module.exports = (function() {
  const Self = {};

  Self.testIfTextExists = async function (pageContentMatchResponse, message) {
    assertions.testIfObjectExists(
      `Testing if webchat has message: ${message}`,
      pageContentMatchResponse,
      'Web Chat not have the message.',
      'Web Chat has the message.'
    );
  }

  return Self;
})();
