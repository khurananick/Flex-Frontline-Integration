exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  let client;
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)();
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)();

  /*
   * Optional function allowing you to set a callback URL
   * for taskrouter, which triggers callbacks for task
   * status changes and reservation status changes
   * this function will automatically accept a task as
   * soon as a reservation is created
   *
   * this function is meant to be used for known agent
   * routing only, when we have a 1:1 relationship between
   * a customer reaching out and an agent who is always
   * going to be responsible for responding.
   */
  if(event.EventType == 'reservation.created') {
    if(!context.AUTO_ACCEPT_TASKS || context.AUTO_ACCEPT_TASKS != 'true') return;

    client = context.getTwilioClient();
    await taskrouter_helpers.updateTaskrouterReservation(
      client,
      event.WorkspaceSid,
      event.TaskSid,
      event.ResourceSid,
      {reservationStatus: 'accepted'}
    );

    callback(null, response);
  }

  else if(event.EventType == 'reservation.accepted') {
    client = context.getTwilioClient();

    setTimeout(async function() {
      const ChannelSid = JSON.parse(event.TaskAttributes).channelSid;

      const channel = await chat_helpers.findChatChannel(client, ChannelSid, context.CHAT_SERVICE_SID);
      channel.attributes.WorkspaceSid = event.WorkspaceSid;
      channel.attributes.TaskSid = event.TaskSid;
      channel.attributes.ResourceSid = event.ResourceSid;

      const updatedChannel = await chat_helpers.updateChatChannelAttributes(client, channel.attributes, channel.sid, channel.serviceSid);
    }, 2000);
  }

  /*
   * Optional function that listens for the worker.activity.update
   * in the Frontline application and updates the Flex worker
   * to the same status.
   */
  else if(event.EventType == 'worker.activity.update') {
    let client, wsid;

    if(event.AccountSid == context.FRONTLINE_ACCOUNT_SID) {
      client = context.getTwilioClient();
      wsid = context.WORKSPACE_SID;
      await taskrouter_helpers.syncWorkerActivity(client, wsid, context, event);
    }
    else if(event.AccountSid == context.ACCOUNT_SID) {
      client = require("twilio")(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);
      wsid = context.FRONTLINE_WORKSPACE_SID;
      await taskrouter_helpers.syncWorkerActivity(client, wsid, context, event);
    }

    callback(null, response);
  }

  else callback(null, response);
  // doing this as an else so that the above setTimeout doesn't fail
}
