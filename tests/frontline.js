module.exports = (function() {
  const Self = {};

  Self.testConversationExists = async function (client) {
    console.log('Testing if conversation exists.'.yellow);
  }

  Self.testConversationDoesNotExist = async function(conversation) {
  }

  Self.testIfConversationHasParticipants = async function () {
    console.log('Testing if conversation has participants.'.yellow);
  }

  Self.testIfConversationHasAgent = async function () {
    console.log('Testing if conversation has agent.'.yellow);
  }

  return Self;
})();
