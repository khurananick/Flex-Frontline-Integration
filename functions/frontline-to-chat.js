exports.handler = async function (context, event, callback) {
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
    const convo = await conversations_helpers.findConversation();
    await chat_helpers.postMessageToChatChannel(client, convo)
}
