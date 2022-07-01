exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const frClient = require("twilio")(process.env.FRONTLINE_ACCOUNT_SID, process.env.FRONTLINE_AUTH_TOKEN);
  const systemParticipantIdentity = `NotifyAgent.${event.WorkerName}`;
  const conversations_helpers = require(Runtime.getFunctions()['helpers/conversations'].path)(context, event);
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)(context, event);

  const responseObj = {};

  async function createSystemConversation() {
    console.log("Creating a system conversation for Frontline Worker notifications.");
    const conversation = await frClient.conversations
      .conversations.create({
        friendlyName: "System",
        attributes: JSON.stringify({isNotificationSystem:true})
      });
    await conversations_helpers.addParticipant(frClient, conversation, {identity: systemParticipantIdentity});
    await conversations_helpers.addParticipant(frClient, conversation, {identity: event.WorkerName});
    return conversation;
  }

  async function getSystemConversation() {
    let conversation = await conversations_helpers.getConversationByParticipant(frClient, systemParticipantIdentity)
    if(!conversation)
      conversation = await createSystemConversation();
    return conversation;
  }

  // don't notify worker if already online.
  const worker = await taskrouter_helpers.getWorkerByIdentity(frClient, context.FRONTLINE_WORKSPACE_SID, event.WorkerName);
  if(worker.activityName == context.FRONTLINE_AVAILABLE_STATUS)
    responseObj.available = true;

  if(!responseObj.available && event.EventType == "NotifyAgent") {
    // get default system conversation to post notifications into.
    const conversation = await getSystemConversation();
    const conversationSid = conversation.conversationSid || conversation.sid;

    // get the last message posted into the system conversation.
    const lastMessage = await conversations_helpers.getLastConversationMessage({
      sid: conversationSid
    });

    // calculate how long it has been (in minutes) since the last notification was sent.
    const timeoutMinutes = 60000 * Number(context.NOTIFICATION_TIMEOUT_MINUTES);

    // if the last message was longer than the timeoutMinutes ago, we send another message.
    if(!lastMessage || (Date.now() - Date.parse(lastMessage.dateCreated)) > timeoutMinutes) {
      console.log("Posting a system notification message to worker on Frontline.");
      await frClient.conversations.conversations(conversationSid)
        .messages
        .create({
          author: systemParticipantIdentity,
          body: `Hey ${event.WorkerName}, someone is waiting to talk to you. Go online to see how it is!`
        })
        .catch(function(e) { })
    }
  }

  response.setBody(responseObj);
  callback(null, response);
}
