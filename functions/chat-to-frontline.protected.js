/*
 * This function handles the Programmable Chat callback for the Flex Project.
 * Every time a Webhook event is triggered from the Programmable Chat API, 
 * this function replicates the message being posted into the Conversations
 * API in the Frontline Project.
 */
exports.handler = async function (context, event, callback) {
  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)(context, event);
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)(context, event);

  /*
   * By default, the Programmable Chat is configered with a webhook callback.
   * Set the webhook callback in your .env files
   * This way we will still make that webhook call even though we're going to replace
   * the URL with this endpoint.
   *
   * By default the only three events we're checking for below are used to trigger
   * the default webhook. You can add others if you see fit.
   */
  if(helpers.inArray(["onMessageSent", "onChannelUpdated", "onChannelDestroyed"], event.EventType)) {
    await chat_helpers.replicateDefaultFlexWebhook();
    /*
     * When a message is posted from the Frontline app, it creates a webhook
     * to the frontline-to-chat function, which creates a corresponding Message
     * object in the Channel resource. Creating that Message resource triggers
     * this webhook again, causing a loop. We use the AddedViaConversationWebhook
     * flag to check if the message was posted as a replication of the Conversation object
     * and, if so, ignore this webhook.
     */
    if(event.Attributes)
      if(JSON.parse(event.Attributes).AddedViaConversationWebhook)
        return;
  }

  const conversations_helpers = require(Runtime.getFunctions()['helpers/conversations'].path)(context, event);

  let convo;
  const client = context.getTwilioClient();

  /*
   * In Programmable Chat each "session" is called a Channel.
   * Anytime a message is posted into the Chat Channel this webhook is 
   * going to check if a corresponding conversation exists, if not then create one,
   * then check if the corresponding conversation has corresponding participants,
   * if not then reate the participants as well,
   * then post the Message into the corresponding Conversation
   */
  if(helpers.inArray(["onMessageSent"], event.EventType)) {
    let channel = await chat_helpers.findChatChannel(client);
    const participants = await chat_helpers.fetchChatChannelParticipants(client);

    // create and map corresponding Conversation if not exists
    if(!chat_helpers.channelHasConversationMapped(channel)) {
      convo = await conversations_helpers.createFrontlineConversation(channel, participants);
      channel.attributes.ConversationSid = convo.sid;
      channel.attributes.ConversationServiceSid = convo.chatServiceSid;
      channel = await chat_helpers.updateChatChannelAttributes(client, channel.attributes);
    }
    // set a generic convo object if Corresponding conversation already exists
    // so we can use the same syntax to reference the sid later.
    else {
      convo = {
        sid: channel.attributes.ConversationSid
      };
    }

    // create and map corresponding Participants to the Conversation if not exists
    await conversations_helpers.addParticipantsToConversation(convo, participants, channel);

    // post this Message resource to the Conversation
    await conversations_helpers.postMessageToFrontlineConversation(convo, participants);

    // retry if no agent.
    if(!chat_helpers.channelHasAgent(participants))
      await conversations_helpers.retrySync(client, chat_helpers, convo, participants, channel);
  }

  /*
   * When a member is removed from the Channel, we check to see if the member
   * is an Agent. If so, we check to see if any other agents are in the Channel still
   * if no agent is present in the Channel anymore, we close out the corresponding 
   * Conversation by changing the state
   */
  if(helpers.inArray(["onMemberRemoved"], event.EventType)) {
    let channel = await chat_helpers.findChatChannel(client);
    if(chat_helpers.channelHasConversationMapped(channel)) { // create and map corresponding conversation if not exists
      const participants = await chat_helpers.fetchChatChannelParticipants(client);
      const convo = {
        sid: channel.attributes.ConversationSid
      };
      if(JSON.parse(event.Attributes).member_type == "agent")
        if(!chat_helpers.channelHasAgent(participants))
          await conversations_helpers.closeFrontlineConversation(convo);
    }
  }
}
