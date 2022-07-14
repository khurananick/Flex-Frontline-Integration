exports.handler = async function (context, event, callback) {
  console.log('taskrouter-handler.js', event.EventType);

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  if(!helpers.requestHasValidXTwilioSignature(context, event)) {
    return callback(null, 'Invalid Signature');
  }

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const client = context.getTwilioClient();
  const frClient = require("twilio")(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)();
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)();
  const conversations_helpers = require(Runtime.getFunctions()['helpers/conversations'].path)();

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
    if(!context.AUTO_ACCEPT_TASKS || context.AUTO_ACCEPT_TASKS != 'true') {
      const systemConvo = await conversations_helpers.getSystemConversation(frClient, event.WorkerName);
      await conversations_helpers.postMessageToFrontlineConversation(
        frClient,
        systemConvo,
        conversations_helpers.getSystemParticipantIdentity(event.WorkerName),
        "You have an incoming chat request. Would you like to accept? 1 for Yes, 2 for No."
      )
    }
    else {
      await taskrouter_helpers.updateTaskrouterReservationById(
        client,
        event.WorkspaceSid,
        event.TaskSid,
        event.ResourceSid,
        {reservationStatus: 'accepted'}
      );
    }

    callback(null, response);
  }

  else if(event.EventType == 'reservation.accepted') {
    const updateChannelAndConversationAttrs = async function() {
      // running this on a delay so the api has time to create channel, participants and stuff
      const ChannelSid = JSON.parse(event.TaskAttributes).channelSid;
      let channel = await chat_helpers.findChatChannel(client, ChannelSid, context.CHAT_SERVICE_SID);
      const participants = await chat_helpers.fetchChatChannelParticipants(client, channel.serviceSid, channel.sid);

      if(!chat_helpers.channelHasAgent(participants)) {
        await chat_helpers.addChannelParticipant(client, channel.serviceSid, channel.sid, event.WorkerName, {member_type:'agent'})
      }

      if(chat_helpers.channelHasConversationMapped(channel)) {
        const conversation = await conversations_helpers.findConversation(frClient, channel.attributes.ConversationSid);
        await conversations_helpers.addParticipantsToConversation(frClient, conversation, participants, channel);
        // storing task information in the frontline conversation
        // so that if the frontline conversation is closed
        // we can close the task on the other side.
        await conversations_helpers.updateConversationWithTaskDetails(frClient, conversation, {
          WorkspaceSid: event.WorkspaceSid,
          TaskSid: event.TaskSid
        });
      }
      else {
        setTimeout(updateChannelAndConversationAttrs, 1500);
      }
    }

    setTimeout(updateChannelAndConversationAttrs, 3000);
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
