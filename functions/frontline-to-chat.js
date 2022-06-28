exports.handler = async function (context, event, callback) {
  /*
   *
   */
  if(event.Type == "post") {
    const client = context.getTwilioClient();
    const frClient = require('twilio')(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);
    const convo = await frClient.conversations.conversations(event.ConversationSid).fetch();
    convo.attributes = JSON.parse(convo.attributes);
    await client.chat.v2.services(convo.attributes.chatInstanceSid)
      .channels(convo.attributes.chatChannelSid)
      .messages
      .create({
        from: event.ClientIdentity,
        body: event.Body,
        attributes: JSON.stringify({ AddedViaConversationWebhook: true })
      })
  }
}
