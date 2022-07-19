module.exports = function () {
  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  const Self = {};

  Self.getSystemParticipantIdentity = function(identity) {
    return `NotifyAgent.${identity}`;
  }

  Self.isSystemConversation = function(convo) {
    return convo.friendlyName == 'System';
  }

  Self.hasParticipant = function(participants, identity) {
    for(const p of participants) {
      if(p.identity == identity) return true;
    }
    return false;
  }

  /*
   * Look for the Conversation referenced in the inbound Conversation Webhook
   * so we can access its attributes
   */
  Self.findConversation = async function(frClient, conversationSid) {
    console.log("Looking up a conversation.", conversationSid);
    const convo = await frClient.conversations
      .conversations(conversationSid)
      .fetch();
    convo.attributes = JSON.parse(convo.attributes);
    return convo;
  }

  Self.fetchConversationParticipants = async function(frClient, ConversationSid) {
    console.log('Looking up participants in a conversation.', ConversationSid);
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
    const displayName = (function() {
      if(channel.attributes.channel_type == "web")
        return channel.attributes?.from||channel.attributes?.pre_engagement_data?.friendlyName||channel.friendlyName;
      else
        return channel.attributes?.pre_engagement_data?.friendlyName||channel.friendlyName;
    })();
    const convo = await frClient.conversations.conversations
        .create({friendlyName: displayName, attributes: JSON.stringify({
            chatChannelSid: ChannelSid,
            chatInstanceSid: InstanceSid
        })});
    console.log("Created a conversation.", convo.sid);
    return convo;
  }

  Self.createSystemConversation = async function(client, identity) {
    console.log("Creating a system conversation for Frontline Worker notifications.");
    const conversation = await client.conversations
      .conversations.create({
        friendlyName: "System",
        attributes: JSON.stringify({isNotificationSystem:true})
      });
    await Self.addParticipant(client, conversation, {identity: Self.getSystemParticipantIdentity(identity)});
    await Self.addParticipant(client, conversation, {identity: identity});
    return conversation;
  }

  Self.updateConversation = async function(client, sid, attributes) {
    console.log('updating a conversation', sid);
    const convo = await client.conversations
      .conversations(sid)
      .update({attributes: JSON.stringify(attributes)})
    return convo;
  }

  Self.updateConversationWithTaskDetails = async function(client, conversation, task_attrs) {
    const ca = conversation.attributes;
    if(ca.WorkspaceSid == task_attrs.WorkspaceSid && ca.TaskSid == task_attrs.TaskSid)
      return;

    ca.WorkspaceSid = task_attrs.WorkspaceSid;
    ca.TaskSid = task_attrs.TaskSid;
    return await Self.updateConversation(client, conversation.sid, ca)
  }

  Self.addParticipant = async function(client, convo, attrs) {
    console.log("Adding a participant to conversation.", convo.sid);
    await client.conversations.conversations(convo.sid)
      .participants
      .create(attrs)
      .catch(function(e) { console.log(e); });
  }

  Self.removeParticipant = async function(client, convo, psid) {
    console.log("Removing a participant from conversation.", convo.sid);
    await client.conversations.conversations(convo.sid)
      .participants(psid)
      .remove()
      .catch(function(e) { console.log(e); });
  }

  Self.removeParticipantByIdentity = async function(client, convoSid, participants, identity) {
    if(!participants)
      participants = await Self.fetchConversationParticipants(client, convoSid);

    for(const p of participants)
      if(p.identity == identity)
        return await Self.removeParticipant(client, {sid: convoSid}, p.sid);
  }

  Self.replaceParticipant = async function(client, convo, attrs, psid) {
    await Self.addParticipant(client, convo, attrs);
    await Self.removeParticipant(client, convo, psid);
  }

  Self.extractParticipantsByChannel = async function(participants) {
    const smsParticipants = [];
    const chatParticipants = [];
    for(const p of participants)
      if(p.messagingBinding)
        smsParticipants.push(p);
      else
        chatParticipants.push(p);
    return { smsParticipants, chatParticipants };
  }

  Self.getConversationByParticipant = async function(client, identity) {
    console.log("Looking up conversation by participant.", identity);
    const conversations = await client.conversations
      .participantConversations
      .list({identity: identity, limit: 50});

    for(const c of conversations) {
      if(c.conversationState == "active")
        return c;
    }
  }

  Self.getSystemConversation = async function(client, identity) {
    let conversation = await Self.getConversationByParticipant(client, Self.getSystemParticipantIdentity(identity));

    if(!conversation) {
      conversation = await Self.createSystemConversation(client, identity);
      return conversation;
    }

    conversation.sid = conversation.conversationSid;
    let participants = await Self.fetchConversationParticipants(client, conversation.sid)

    if(!Self.hasParticipant(participants, identity))
      await Self.addParticipant(client, conversation, {identity: identity});

    return conversation;
  }

  Self.getLastConversationMessage = async function(frClient, convo) {
    console.log("Looking up the last message added to a conversation.", convo.sid);
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
  Self.postMessageToFrontlineConversation = async function(frClient, convo, From, Body) {
    console.log("Posting a message to a conversation.", convo.sid, convo.conversationSid);
    await frClient.conversations.conversations(convo.sid||convo.conversationSid)
                      .messages
                      .create({author: From, body: Body})
                      .catch(function(e) { console.log(e); })
  }

  /*
   * Setting the state of the Conversation as closed so it doesn't
   * show up in the agent's frontline interface anymore.
   */
  Self.closeFrontlineConversation = async function(frClient, convo) {
    console.log("Updating a conversation state.", convo.sid);
    await frClient.conversations.conversations(convo.sid)
                    .update({state: "closed"})
                    .catch(function(e) { /* do nothing. */ });
  }

  Self.hasChatChannelMapped = function(attributes) {
    return attributes.chatChannelSid;
  }

  return Self;
}

