const colors = require('colors');
colors.enable()

const assertions = require("./helpers/assertions.js");

module.exports = (function() {
  const Self = {};

  Self.testChatChannelExists = async function (channel) {
    assertions.testIfObjectExists(
      'Testing if chat channel exists.',
      channel,
      'Channel does not exist.',
      'Channel exists.'
    );
  }

  Self.testChatChannelHasConversation = async function (channel) {
    assertions.testIfAttributeExists(
      'Testing if chat channel has Conversation.',
      channel.attributes,
      'ConversationSid',
      'Channel does not have Conversation.',
      'Channel has Conversation'
    );
  }

  Self.testIfChatChannelHasMembers = async function (members) {
    assertions.testIfObjectExists(
      'Testing if chat channel has members.',
      members,
      'Channel does not have members.',
      'Channel has members.'
    );
  }

  Self.testIfChatChannelDoesNotHaveAgent = async function(members) {
    const arr = [];
    for(const member of members) {
      member.attributes = JSON.parse(member.attributes);
      arr.push({
        member_type: member.attributes.member_type
      });
    }

    assertions.testCollectDotNaveAttributeValue(
      'Testing if chat channel does not have any agents.',
      arr,
      'member_type',
      'agent',
      'Channel has an agent.',
      'Channel does not have an agent.'
    );
  }

  Self.testIfChatChannelHasAgent = async function (members) {
    const arr = [];
    for(const member of members) {
      member.attributes = JSON.parse(member.attributes);
      arr.push({
        member_type: member.attributes.member_type
      });
    }

    assertions.testIfCollectionHasAttributeValue(
      'Testing if chat channel has any agents.',
      arr,
      'member_type',
      'agent',
      'Channel does not have any agents.',
      'Channel has an agent.'
    )
  }

  Self.testIfChatChannelHasMessages = async function(messages) {
    assertions.testIfObjectExists(
      'Testing if chat channel has messages.',
      messages,
      'Chat Channel does not have Messages.',
      'Chat Channel has Messages.'
    );
  }

  Self.testIfMessageExistsInChatChannel = async function(messages, messageBody) {
    assertions.testIfCollectionHasAttributeValue(
      'Testing if the flex chat channel has a message posted in Flex Chat',
      messages,
      'body',
      messageBody,
      'Chat Channel does not have Conversation message replicated.',
      'Chat Channel has Conversation message replicated.'
    )
  }

  return Self;
})();
