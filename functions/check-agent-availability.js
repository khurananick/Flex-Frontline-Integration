exports.handler = async function (context, event, callback) {
  console.log('check-agent-availability.js', event.EventType);

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const frClient = require("twilio")(process.env.FRONTLINE_ACCOUNT_SID, process.env.FRONTLINE_AUTH_TOKEN);
  const conversations_helpers = require(Runtime.getFunctions()['helpers/conversations'].path)();
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)();

  const responseObj = {};

  // don't notify worker if already online.
  const worker = await taskrouter_helpers.getWorkerByIdentity(frClient, context.FRONTLINE_WORKSPACE_SID, event.WorkerName);
  if(worker.activityName == context.FRONTLINE_AVAILABLE_STATUS)
    responseObj.available = true;

  if(!responseObj.available && event.EventType == "NotifyAgent") {
    // get default system conversation to post notifications into.
    const conversation = await conversations_helpers.getSystemConversation(frClient, event.WorkerName);
    const conversationSid = conversation.conversationSid || conversation.sid;

    // get the last message posted into the system conversation.
    const lastMessage = await conversations_helpers.getLastConversationMessage(frClient, {
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
          author: conversations_helpers.getSystemParticipantIdentity(event.WorkerName),
          body: `Hey ${event.WorkerName}, someone is waiting to talk to you. Go online to see how it is!`
        })
        .catch(function(e) { })
    }
  }

  response.setBody(responseObj);
  callback(null, response);
}
