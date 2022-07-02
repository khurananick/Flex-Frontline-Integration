module.exports = function () {
  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  const Self = {};

  /*
   * Look for the Conversation referenced in the inbound Conversation Webhook
   * so we can access its attributes
   */
  Self.findConversation = async function(frClient, conversationSid) {
    console.log("Looking up a conversation.");
    const convo = await frClient.conversations
      .conversations(conversationSid)
      .fetch();
    convo.attributes = JSON.parse(convo.attributes);
    return convo;
  }

  Self.fetchConversationParticipants = async function(frClient, ConversationSid) {
    const participants = await frClient.conversations
      .conversations(ConversationSid)
      .participants
      .list();
    return participants;
  }

  /*
   * Creates the corresponding Conversation object
   * and sets the ChannelSid and InstanceSid of the Channel
   * its suppose to correspond to on the Flex project
   */
  Self.createFrontlineConversation = async function(frClient, channel, InstanceSid, ChannelSid) {
    console.log("Creating a conversation.");
    const convo = await frClient.conversations.conversations
        .create({friendlyName: (channel.attributes?.pre_engagement_data?.friendlyName||channel.friendlyName), attributes: JSON.stringify({
            chatChannelSid: ChannelSid,
            chatInstanceSid: InstanceSid
        })});
    return convo;
  }

  Self.updateConversation = async function(client, sid, attributes) {
    const convo = await client.conversations
      .conversations(sid)
      .update({attributes: JSON.stringify(attributes)})
    return convo;
  }

  Self.addParticipant = async function(client, convo, attrs) {
    console.log("Adding a participant to conversation.");
    await client.conversations.conversations(convo.sid)
      .participants
      .create(attrs)
      .catch(function(e) { /* do nothing */ });
  }

  Self.getConversationByParticipant = async function(client, identity) {
    console.log("Looking up conversation by participant.");
    const conversations = await client.conversations
      .participantConversations
      .list({identity: identity, limit: 50});

    for(const c of conversations) {
      if(c.conversationState == "active")
        return c;
    }
  }

  Self.getLastConversationMessage = async function(frClient, convo) {
    console.log("Looking up the last message added to a conversation.");
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
  Self.addParticipantsToConversation = async function(frClient, convo, participants, channel) {
    console.log("Looking up participants in a conversation.");
    let convoParticipants = await Self.fetchConversationParticipants(frClient, convo.sid)

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
  Self.retrySync = async function(client, frClient, chat_helpers, convo, participants, channel) {
    const delay = 2500;
    console.log("Going to retry in: ", delay);
    setTimeout(async function() {
      const participants = await chat_helpers.fetchChatChannelParticipants(client, channel.serviceSid, channel.sid);
      if(chat_helpers.channelHasAgent(participants)) {
        await Self.addParticipantsToConversation(frClient, convo, participants, channel);
        console.log("Added agent on retry.");
      }
    }, delay);
  }

  /*
   * Replicates the Message resource from the Channel to the Conversation
   */
  Self.postMessageToFrontlineConversation = async function(frClient, convo, participants, From, Body) {
    console.log("Posting a message to a conversation.");
    await frClient.conversations.conversations(convo.sid)
                      .messages
                      .create({author: From, body: Body})
                      .catch(function(e) { /* do nothing */ })
  }

  /*
   * Setting the state of the Conversation as closed so it doesn't
   * show up in the agent's frontline interface anymore.
   */
  Self.closeFrontlineConversation = async function(frClient, convo) {
    console.log("Updating a conversation state.");
    await frClient.conversations.conversations(convo.sid)
                    .update({state: "closed"})
                    .catch(function(e) { /* do nothing. */ });
  }

  return Self;
}

