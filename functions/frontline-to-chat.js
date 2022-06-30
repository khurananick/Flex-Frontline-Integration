exports.handler = async function (context, event, callback) {
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
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)(context, event);
  const conversations_helpers = require(Runtime.getFunctions()['helpers/conversations'].path)(context, event);
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)(context, event);
  const convo = await conversations_helpers.findConversation();

  if(event.EventType == "onMessageAdded") {
    await chat_helpers.postMessageToChatChannel(client, convo)
  }

  /*
   * If a conversation is closed from the frontline app
   * we'll close the chat channe in flex as well.
   */
  if(event.EventType == "onConversationStateUpdated") {
    if(event.StateTo == "closed") {
      event.ChannelSid = convo.attributes.chatChannelSid;
      const channel = await chat_helpers.findChatChannel(client);

      await taskrouter_helpers.updateTaskrouterReservation(
        client,
        channel.attributes.WorkspaceSid,
        channel.attributes.TaskSid,
        channel.attributes.ResourceSid,
        {reservationStatus: 'wrapping'}
      );

      await taskrouter_helpers.updateTaskrouterReservation(
        client,
        channel.attributes.WorkspaceSid,
        channel.attributes.TaskSid,
        channel.attributes.ResourceSid,
        {reservationStatus: 'completed'}
      );

      callback(null, response);
    }
  }
}
