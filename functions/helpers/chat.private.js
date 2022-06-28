const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

module.exports = function (context, event) {
  const Self = {};

  Self.findChatChannel = async function(client) {
    const channel = await client.chat.v2.services(event.InstanceSid)
                .channels(event.ChannelSid)
                .fetch()
    channel.attributes = JSON.parse(channel.attributes);
    return channel;
  }

  Self.fetchChatChannelParticipants = async function(client) {
    return await client.chat.v2.services(event.InstanceSid)
                .channels(event.ChannelSid)
                .members
                .list({limit: 1000})
  }

  Self.updateChatChannelAttributes = async function(client, params) {
    const channel = await client.chat.v2.services(event.InstanceSid)
      .channels(event.ChannelSid)
      .update({attributes: JSON.stringify(params)});
    channel.attributes = JSON.parse(channel.attributes);
    return channel;
  }

  Self.channelHasAgent = function(participants) {
    for(let participant of participants) {
      if(participant.attributes)
        if(JSON.parse(participant.attributes).member_type == "agent")
          return true;
    }
  }

  Self.channelHasConversationMapped = function(channel) {
    return channel.attributes.ConversationSid
  }

  Self.replicateDefaultFlexWebhook = async function() {
    // payload to replicate Default Webhook.
    const payload = Object.assign({}, event);
    delete payload.request;

    // headers to replicate Default Webhook.
    const headers = event.request.headers;
    headers.host = "webhooks.twilio.com"
    headers['x-twilio-signature'] = helpers.generateXTwilioSignature(context.FLEX_CHAT_DEFAULT_WEBHOOK, payload, context.AUTH_TOKEN);

    // replicate Default Webhook
    const axios   = require('axios');
    const qs      = require('qs');
    const post = await axios({
      method: "post",
      url: context.FLEX_CHAT_DEFAULT_WEBHOOK,
      data: qs.stringify(payload),
      headers: headers
    })
    .catch(function(e) { /* */ });

    if(post)
      console.log('Replicated Default Webhook status: ', post.status);
  }

  return Self;
}

