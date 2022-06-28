const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

module.exports = function (context, event) {
  const Self = {};
  const frClient = require('twilio')(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);

  Self.createFrontlineConversation = async function(channel, participants) {
    const convo = await frClient.conversations.conversations
        .create({friendlyName: (channel.attributes?.pre_engagement_data?.friendlyName||channel.friendlyName), attributes: JSON.stringify({
            chatChannelSid: event.ChannelSid,
            chatInstanceSid: event.InstanceSid
        })});
    return convo;
  }

  Self.addParticipantsToConversation = async function(convo, participants, channel) {
    let convoParticipants = await frClient.conversations.conversations(convo.sid)
                      .participants.list()

    convoParticipants = convoParticipants.map(function(i) {
                          return i.identity
                        })

    for(const participant of participants) {
      if(!helpers.inArray(convoParticipants, participant.identity)) {
        let p = await frClient.conversations.conversations(convo.sid)
                      .participants
                      .create({ identity: participant.identity })
      }
    }
  }

  Self.postMessageToFrontlineConversation = async function(convo, participants) {
    await frClient.conversations.conversations(convo.sid)
                      .messages
                      .create({author: event.From, body: event.Body})
  }

  Self.closeFrontlineConversation = async function(convo) {
    await frClient.conversations.conversations(convo.sid)
                    .update({state: "closed"});
  }

  return Self;
}

