module.exports = function () {
  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  const Self = {};

  /*
   * Looks for the chat channel referenced in the inbound Chat Webhook
   */
  Self.findChatChannel = async function(client, channelSid, serviceSid) {
    console.log("Looking up a chat channel.");
    const channel = await client.chat.v2.services(serviceSid)
                .channels(channelSid)
                .fetch()
    channel.attributes = JSON.parse(channel.attributes);
    return channel;
  }

  /*
   * Fetching participants who are part of the Chat Channel
   */
  Self.fetchChatChannelParticipants = async function(client, InstanceSid, ChannelSid) {
    console.log("Looking up participants in the chat channel.");
    return await client.chat.v2.services(InstanceSid)
                .channels(ChannelSid)
                .members
                .list({limit: 1000})
  }

  /*
   * Updates the attributes of the Channel resource.
   */
  Self.updateChatChannelAttributes = async function(client, params, channelSid, serviceSid) {
    console.log("Updating a chat channel.");
    const channel = await client.chat.v2.services(serviceSid)
      .channels(channelSid)
      .update({attributes: JSON.stringify(params)});
    channel.attributes = JSON.parse(channel.attributes);
    return channel;
  }

  /*
   * Replicates the Message resource from the Conversation to the Channel
   */
  Self.postMessageToChatChannel = async function(client, convo, ClientIdentity, Body) {
    if(!convo.attributes.chatChannelSid) return;

    console.log("Posting a message to a chat channel.");
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
    const post = await helpers.proxyRequest(context.FLEX_CHAT_DEFAULT_WEBHOOK, context, event)

    if(post)
      console.log('Replicated Default Webhook status: ', post.status);
  }

  return Self;
}

