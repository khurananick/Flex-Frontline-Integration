const colors = require('colors');
colors.enable()

module.exports = (function() {
  const Self = {};

  Self.testChatChannelExists = async function () {
    console.log('Testing if chat channel exists.'.yellow);
  }

  Self.testIfChatChannelHasMembers = async function () {
    console.log('Testing if chat channel has members.'.yellow);
  }

  Self.testIfChatChannelDoesNotHaveAgent = async function() {
    console.log('Testing if chat channel does not have any agents.'.yellow);
  }

  Self.testIfChatChannelHasAgent = async function () {
    console.log('Testing if chat channel has any agents.'.yellow);
  }

  return Self;
})();
