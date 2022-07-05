exports.handler = async function (context, event, callback) {
  console.log('frontline-to-chat.js', event.EventType);

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  /*
   * This endpoint handles the inbound Webhook from the Conversation API from
   * the Frontline project. The Conversation will have attributes that identify
   * the corresponding ChannelSid and Instance Sid on the Flex side. We look 
   * up the conversation, get the attributes, use the attributes to look up
   * the Channel, then post the message to the Channel
   *
   * This endpoint is really only called if the Frontline app is used to
   * post a message
   *
   * IMPORTANT: Only set this endpoint in the POST webhook. Do not call
   * this endpoint for the PRE webhook.
   */
  const client = context.getTwilioClient();
  const frClient = require("twilio")(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)();
  const conversations_helpers = require(Runtime.getFunctions()['helpers/conversations'].path)();
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)();
  const convo = await conversations_helpers.findConversation(frClient, event.ConversationSid);

  if(event.EventType == "onMessageAdded") {
    if(!conversations_helpers.hasChatChannelMapped(convo.attributes))
      await chat_helpers.createChatForConversation(frClient, conversations_helpers, context, event)

    await chat_helpers.postMessageToChatChannel(client, convo, event.ClientIdentity, event.Body);
  }

  /*
   * If a conversation is closed from the frontline app
   * we'll close the chat channe in flex as well.
   */
  if(event.EventType == "onConversationStateUpdated") {
    if(event.StateTo == "closed") {
      if(!convo.attributes.chatChannelSid) return;

      const channel = await chat_helpers.findChatChannel(client, convo.attributes.chatChannelSid, convo.attributes.chatInstanceSid);
      const res = await taskrouter_helpers.updateUncompleteTasksToCompleted(
        client,
        channel.attributes.WorkspaceSid,
        channel.attributes.TaskSid,
        {reservationStatus: 'completed'}
      );
      callback(null, response);
    }
  }


  if(event.EventType == "onConversationAdded") {
    // if conversation already has channel, then skip this
    const attrs = event.ConversationAttributes;
    if(attrs)
      if(conversations_helpers.hasChatChannelMapped(JSON.parse(attrs)))
        return;

    await chat_helpers.createChatForConversation(frClient, conversations_helpers, context, event)
  }
}
