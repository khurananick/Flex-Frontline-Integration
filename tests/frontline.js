const colors = require('colors');
colors.enable()

const assertions = require("./helpers/assertions.js");

module.exports = (function() {
  const Self = {};

  Self.testConversationExists = async function (conversation) {
    assertions.testIfObjectExists(
      'Testing if conversation exists.',
      conversation,
      'Conversation does not exist.',
      'Conversation exists.'
    );
  }

  Self.testConversationDoesNotExist = async function(conversation) {
    assertions.testIfObjectDoesNotExist(
      'Testing if conversation does not exist.',
      conversation,
      'Conversation exists.',
      'Conversation does not exist.'
    );
  }

  Self.testIfConversationHasParticipants = async function (participants) {
    assertions.testIfObjectExists(
      'Testing if conversation has participants.',
      participants,
      'Conversation does not have Participants.',
      'Conversation has Participants.'
    );
  }

  Self.testIfConversationHasAgent = async function (participants, agentIdentity) {
    const arr = [];
    for(const participant of participants) {
      participant.attributes = JSON.parse(participant.attributes);
      arr.push(participant.attributes);
    }

    assertions.testIfCollectionHasAttributeValue(
      'Testing if conversation has agent.',
      arr,
      'identity',
      agentIdentity,
      'Conversation does not have any agents.',
      'Conversation has an agent.'
    )
  }

  Self.testIfConversationHasMessages = async function(messages) {
    assertions.testIfObjectExists(
      'Testing if conversation has messages.',
      messages,
      'Conversation does not have Messages.',
      'Conversation has Messages.'
    );
  }

  Self.testIfMessageExistsInConversation = async function(messages, messageBody) {
    assertions.testIfCollectionHasAttributeValue(
      `Testing if the Frontline Conversation has a message: ${messageBody}`,
      messages,
      'body',
      messageBody,
      'Conversation does not have Chat message.',
      'Conversation has Chat message.'
    )
  }

  return Self;
})();
