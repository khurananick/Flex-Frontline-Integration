const colors = require('colors');
colors.enable()

const assertions = require("./helpers/assertions.js");

module.exports = (function() {
  const Self = {};

  Self.testConversationExists = async function (conversation) {
    console.log('Testing if conversation exists.'.yellow);

    assertions.testIfObjectExists(
      conversation,
      'Conversation does not exist.',
      'Conversation exists.'
    );
  }

  Self.testConversationDoesNotExist = async function(conversation) {
    console.log('Testing if conversation does not exist.'.yellow);

    assertions.testIfObjectDoesNotExist(
      conversation,
      'Conversation exists.',
      'Conversation does not exist.'
    );
  }

  Self.testIfConversationHasParticipants = async function (participants) {
    console.log('Testing if conversation has participants.'.yellow);

    assertions.testIfObjectExists(
      participants,
      'Conversation does not have Participants.',
      'Conversation has Participants.'
    );
  }

  Self.testIfConversationHasAgent = async function (participants, agentIdentity) {
    console.log('Testing if conversation has agent.'.yellow);
    const arr = [];
    for(const participant of participants) {
      participant.attributes = JSON.parse(participant.attributes);
      arr.push(participant.attributes);
    }

    assertions.testIfCollectionHasAttributeValue(
      arr,
      'identity',
      agentIdentity,
      'Conversation does not have any agents.',
      'Conversation has an agent.'
    )
  }

  return Self;
})();
