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

  Self.addParticipant = async function(client, convo, attrs) {
    await client.conversations.conversations(convo.sid)
      .participants
      .create(attrs)
      .catch(function(e) { /* do nothing */ });
  }

  Self.getConversationByParticipant = async function(client, identity) {
    const conversations = await client.conversations
      .participantConversations
      .list({identity: identity, limit: 50});

    for(const c of conversations) {
      if(c.conversationState == "active")
        return c;
    }
  }

  Self.getLastConversationMessage = async function(convo) {
    const messages = await frClient.conversations
      .conversations(convo.sid)
      .messages
      .list({order: 'desc', limit: 1})
    return messages[0];
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
        channel.attributes.customer_id = JSON.stringify({
          p: participant.sid, c: channel.sid
        });
        let p = await Self.addParticipant(frClient, convo, {
          identity: participant.identity,
          attributes: JSON.stringify(channel.attributes)
        })
      }
    }
  }

  /*
   * In case a message is fired but agent isn't available on time,
   * we'll give it a couple of seconds and try again
   */
  Self.retrySync = async function(client, chat_helpers, convo, participants, channel) {
    const delay = 2000;
    console.log("Going to retry in: ", delay);
    setTimeout(async function() {
      const participants = await chat_helpers.fetchChatChannelParticipants(client);
      if(chat_helpers.channelHasAgent(participants)) {
        await Self.addParticipantsToConversation(convo, participants, channel);
        console.log("Added agent on retry.");
      }
    }, 2000);
  }

  /*
   * Replicates the Message resource from the Channel to the Conversation
   */
  Self.postMessageToFrontlineConversation = async function(convo, participants) {
    await frClient.conversations.conversations(convo.sid)
                      .messages
                      .create({author: event.From, body: event.Body})
                      .catch(function(e) { /* do nothing */ })
  }

  /*
   * Setting the state of the Conversation as closed so it doesn't
   * show up in the agent's frontline interface anymore.
   */
  Self.closeFrontlineConversation = async function(convo) {
    await frClient.conversations.conversations(convo.sid)
                    .update({state: "closed"})
                    .catch(function(e) { /* do nothing. */ });
  }

  return Self;
}

