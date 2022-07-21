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
    if(event.TaskChannelUniqueName == "voice") return;
    if((context.AUTO_ACCEPT_TASKS && context.AUTO_ACCEPT_TASKS == 'true')/* || JSON.parse(event.TaskAttributes).transferTargetType*/) {
      await taskrouter_helpers.updateTaskrouterReservationById(
        client,
        event.WorkspaceSid,
        event.TaskSid,
        event.ResourceSid,
        {reservationStatus: 'accepted'}
      );
    }
    else {
      const systemConvo = await conversations_helpers.getSystemConversation(frClient, event.WorkerName);
      await conversations_helpers.postMessageToFrontlineConversation(
        frClient,
        systemConvo,
        conversations_helpers.getSystemParticipantIdentity(event.WorkerName),
        "You have an incoming chat request(s). Would you like to accept? 1 for Yes, 2 for No."
      )
    }

    callback(null, response);
  }

  else if(event.EventType == 'reservation.accepted') {
    if(event.TaskChannelUniqueName == "voice") return;
    const updateChannelAndConversationAttrs = async function() {
      const ChannelSid = JSON.parse(event.TaskAttributes).channelSid;
      let channel = await chat_helpers.findChatChannel(client, ChannelSid, context.CHAT_SERVICE_SID);
      const participants = await chat_helpers.fetchChatChannelParticipants(client, channel.serviceSid, channel.sid);

      if(!chat_helpers.channelHasAgent(participants)) {
        const p = await chat_helpers.addChannelParticipant(client, channel.serviceSid, channel.sid, event.WorkerName, {member_type:'agent'})
        participants.push(p);
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
        // in case the channel still doesn't have a conversation
        // give it another couple of seconds to try again.
        setTimeout(updateChannelAndConversationAttrs, 2000);
      }
    }

    // give Chat Channel a few seconds to add agent to 
    // the Channel as a member, then run the logic.
    setTimeout(updateChannelAndConversationAttrs, 2000);
  }

  /*
   * Optional function that listens for the worker.activity.update
   * in the Frontline application and updates the Flex worker
   * to the same status.
   */
  else if(event.EventType == 'worker.activity.update') {
    let client, wsid, activityName;

    if(event.AccountSid == context.FRONTLINE_ACCOUNT_SID) {
      client = context.getTwilioClient();
      wsid = context.WORKSPACE_SID;
      activityName = taskrouter_helpers.getMatchingFlexActivity(context, event);

      if(activityName)
        await taskrouter_helpers.syncWorkerActivity(client, wsid, activityName, context, event);
    }
    else if(event.AccountSid == context.ACCOUNT_SID) {
      client = require("twilio")(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);
      wsid = context.FRONTLINE_WORKSPACE_SID;
      activityName = taskrouter_helpers.getMatchingFrontlineActivity(context, event);

      if(activityName)
        await taskrouter_helpers.syncWorkerActivity(client, wsid, activityName, context, event);
    }

    callback(null, response);
  }

  else if (event.EventType == 'task.created') {
    /*
    const attrs = JSON.parse(event.TaskAttributes);

    const createAndAcceptWorkerReservation = async function(workerName) {
      const worker = await taskrouter_helpers.getWorkerByIdentity(client, context.WORKSPACE_SID, workerName);
      if(worker.activityName == context.UNAVAILABLE_STATUS) {
        const flWorker = await taskrouter_helpers.getWorkerByIdentity(frClient, context.FRONTLINE_WORKSPACE_SID, workerName);
        console.log(flWorker);
      }
    }

    if(attrs.webchat_worker)
      setTimeout(createAndAcceptWorkerReservation, 3000, attrs.webchat_worker);
    else if(attrs.pre_engagement_data.worker)
      setTimeout(createAndAcceptWorkerReservation, 3000, attrs.pre_engagement_data.worker);
    */
  }

  else callback(null, response);
  // doing this as an else so that the above setTimeout doesn't fail
}
