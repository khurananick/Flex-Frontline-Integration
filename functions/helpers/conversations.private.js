const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

module.exports = function (context, event) {
  const Self = {};
  const frClient = require('twilio')(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);

  /*
   * Look for the Conversation referenced in the inbound Conversation Webhook
   * so we can access its attributes
   */
  Self.findConversation = async function() {
    const convo = await frClient.conversations.conversations(event.ConversationSid).fetch();
    convo.attributes = JSON.parse(convo.attributes);
    return convo;
  }

  /*
   * Creates the corresponding Conversation object
   * and sets the ChannelSid and InstanceSid of the Channel
   * its suppose to correspond to on the Flex project
   */
  Self.createFrontlineConversation = async function(channel, participants) {
    const convo = await frClient.conversations.conversations
        .create({friendlyName: (channel.attributes?.pre_engagement_data?.friendlyName||channel.friendlyName), attributes: JSON.stringify({
            chatChannelSid: event.ChannelSid,
            chatInstanceSid: event.InstanceSid
        })});
    return convo;
  }

  /*
   * If the participant doesn't already exist in the Conversation
   * adds the corresponding participants
   */
  Self.addParticipantsToConversation = async function(convo, participants, channel) {
    let convoParticipants = await frClient.conversations.conversations(convo.sid)
                      .participants.list()

    convoParticipants = convoParticipants.map(function(i) {
                          return i.identity
                        })

    for(const participant of participants) {
      if(!helpers.inArray(convoParticipants, participant.identity)) {
        let p = await frClient.conversations.conversations(convo.sid)
                      .participants
                      .create({ identity: participant.identity })
      }
    }
  }

  /*
   * Replicates the Message resource from the Channel to the Conversation
   */
  Self.postMessageToFrontlineConversation = async function(convo, participants) {
    await frClient.conversations.conversations(convo.sid)
                      .messages
                      .create({author: event.From, body: event.Body})
  }

  /*
   * Setting the state of the Conversation as closed so it doesn't
   * show up in the agent's frontline interface anymore.
   */
  Self.closeFrontlineConversation = async function(convo) {
    await frClient.conversations.conversations(convo.sid)
                    .update({state: "closed"});
  }

  return Self;
}

