module.exports = function () {
  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  const Self = {};

  Self.createChatForConversation = async function(client, conversations_helpers, context, event) {
    console.log('creating chat channel for conversation', event.ConversationSid);
    const createOutboundSMS = require(Runtime.getFunctions()['helpers/outbound-sms'].path);
    const participants = await conversations_helpers.fetchConversationParticipants(client, event.ConversationSid);

    const { smsParticipants, chatParticipants } = await conversations_helpers.extractParticipantsByChannel(participants);

    if(smsParticipants[0]) {
      // create the outbound sms channel in flex project.
      event.ToName = event.FriendlyName;
      event.ToNumber = smsParticipants[0].messagingBinding.address;
      event.TargetWorker = chatParticipants[0].identity;
      const outboundSMS = await createOutboundSMS(context, event);
      const { newChannel } = outboundSMS;
      // map conversation to channel
      const convo = await conversations_helpers.updateConversation(client, event.ConversationSid, {
        chatChannelSid: newChannel.sid,
        chatInstanceSid: newChannel.serviceSid
      });
      // relace the sms participant with chat identity
      await conversations_helpers.replaceParticipant(
        client, {sid: event.ConversationSid}, {identity: smsParticipants[0].sid}, smsParticipants[0].sid
      );
    }
  }

  /*
   * Looks for the chat channel referenced in the inbound Chat Webhook
   */
  Self.findChatChannel = async function(client, ChannelSid, serviceSid) {
    console.log("Looking up a chat channel.", ChannelSid);
    const channel = await client.chat.v2.services(serviceSid)
                .channels(ChannelSid)
                .fetch()
    channel.attributes = JSON.parse(channel.attributes);
    return channel;
  }

  /*
   * Fetching participants who are part of the Chat Channel
   */
  Self.fetchChatChannelParticipants = async function(client, InstanceSid, ChannelSid) {
    console.log("Looking up participants in the chat channel.", ChannelSid);
    return await client.chat.v2.services(InstanceSid)
                .channels(ChannelSid)
                .members
                .list({limit: 1000})
  }

  Self.addChannelParticipant = async function(client, InstanceSid, ChannelSid, identity, attributes) {
    console.log('Adding a member to an existing channel', ChannelSid);
    const mem = await client.chat.v2.services(InstanceSid)
                .channels(ChannelSid)
                .members
                .create({
                  identity: identity,
                  attributes: JSON.stringify(attributes)
                })
    return mem;
  }

  Self.cleanupChatChannel = async function(client, ChannelSid, InstanceSid) {
    const participants = await Self.fetchChatChannelParticipants(client, InstanceSid, ChannelSid);
    let didClean;
    for(let participant of participants) {
      if(participant.attributes) {
        if(JSON.parse(participant.attributes).member_type == "agent") {
          console.log('removing agent during cleanup');
          await client.chat.v2.services(InstanceSid)
              .channels(ChannelSid)
              .members(participant.sid)
              .remove();
          didClean = true;
        }
      }
    }
    if(didClean) {
      const channel = await Self.findChatChannel(client, ChannelSid, InstanceSid);
      channel.attributes.status = 'INACTIVE';
      await Self.updateChatChannelAttributes(client, channel.attributes, ChannelSid, InstanceSid);
    }

    return didClean;
  }

  /*
   * Updates the attributes of the Channel resource.
   */
  Self.updateChatChannelAttributes = async function(client, params, ChannelSid, serviceSid) {
    console.log("Updating a chat channel.", ChannelSid);
    const channel = await client.chat.v2.services(serviceSid)
      .channels(ChannelSid)
      .update({attributes: JSON.stringify(params)});
    channel.attributes = JSON.parse(channel.attributes);
    return channel;
  }

  /*
   * Replicates the Message resource from the Conversation to the Channel
   */
  Self.postMessageToChatChannel = async function(client, convo, ClientIdentity, Body) {
    if(!convo.attributes.chatChannelSid) return;

    console.log("Posting a message to a chat channel.", convo.attributes.chatChannelSid);
    await client.chat.v2.services(convo.attributes.chatInstanceSid)
      .channels(convo.attributes.chatChannelSid)
      .messages
      .create({
        from: ClientIdentity,
        body: Body,
        attributes: JSON.stringify({ AddedViaConversationWebhook: true })
      })
  }

  /*
   * Checks if any of the participants in the Channel are set as {'member_type':'agent'}
   */
  Self.channelHasAgent = function(participants) {
    for(let participant of participants) {
      if(participant.attributes)
        if(JSON.parse(participant.attributes).member_type == "agent")
          return true;
    }
  }

  /*
   * Checks if the Channel attributes include a ConversationSid attribute
   * This would mean there is a corresponding Conversation created
   * on the Frontline project side.
   */
  Self.channelHasConversationMapped = function(channel) {
    return channel.attributes.ConversationSid
  }

  Self.channelHasTaskAttributesMapped = function(channel) {
    return channel.attributes.TaskSid;
  }

  /*
   * By default Chat comes with a webhook that should be called on certain events.
   * We replace the default webhook with our custom chat-to-frontline endpoint
   * then proxy that webhook from our endpoint to continue that functionality.
   */
  Self.replicateDefaultFlexWebhook = async function(context, event) {
    const post = await helpers.proxyRequest(context.FLEX_CHAT_DEFAULT_WEBHOOK, context.AUTH_TOKEN, event)

    if(post)
      console.log('Replicated Default Webhook status: ', post.status);
  }

  return Self;
}

