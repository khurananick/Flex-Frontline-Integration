const colors = require('colors');
colors.enable()

const test = require("./helpers/test.js");

module.exports = (function() {
  const Self = {};

  Self.testChatChannelExists = async function (channel) {
    console.log('Testing if chat channel exists.'.yellow);

    test.testIfObjectExists(
      channel,
      'Channel does not exist.',
      'Channel exists.'
    );
  }

  Self.testChatChannelHasConversation = async function (channel) {
    console.log('Testing if chat channel has Conversation.'.yellow);

    test.testIfAttributeExists(
      channel.attributes,
      'ConversationSid',
      'Channel does not have Conversation.',
      'Channel has Conversation'
    );
  }

  Self.testIfChatChannelHasMembers = async function (members) {
    console.log('Testing if chat channel has members.'.yellow);

    test.testIfObjectExists(
      members,
      'Channel does not have members.',
      'Channel has members.'
    );
  }

  Self.testIfChatChannelDoesNotHaveAgent = async function(members) {
    console.log('Testing if chat channel does not have any agents.'.yellow);

    const arr = [];
    for(const member of members) {
      member.attributes = JSON.parse(member.attributes);
      arr.push({
        member_type: member.attributes.member_type
      });
    }

    test.testCollectDotNaveAttributeValue(
      arr,
      'member_type',
      'agent',
      'Channel has an agent.',
      'Channel does not have an agent.'
    );
  }

  Self.testIfChatChannelHasAgent = async function (members) {
    console.log('Testing if chat channel has any agents.'.yellow);

    const arr = [];
    for(const member of members) {
      member.attributes = JSON.parse(member.attributes);
      arr.push({
        member_type: member.attributes.member_type
      });
    }

    test.testIfCollectionHasAttributeValue(
      arr,
      'member_type',
      'agent',
      'Channel does not have any agents.',
      'Channel has an agent.'
    )
  }

  return Self;
})();
