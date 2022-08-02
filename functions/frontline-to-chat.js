exports.handler = async function (context, event, callback) {
  console.log('frontline-to-chat.js', event.EventType);

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  if(!helpers.requestHasValidXTwilioSignature(context, event)) {
    return callback(null, 'Invalid Signature');
  }

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
  const frClient = require("twilio")(context.FRONTLINE_ACCOUNT_SID, context.FRONTLINE_AUTH_TOKEN);
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)();
  const conversations_helpers = require(Runtime.getFunctions()['helpers/conversations'].path)();
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)();
  const convo = await conversations_helpers.findConversation(frClient, event.ConversationSid);

  if(event.EventType == "onMessageAdded") {
    if(conversations_helpers.isSystemConversation(convo)) {
      // if it is a "System" conversation, use the body to determine next step.
      if(event.Body == "1")
        await taskrouter_helpers.acceptAllIncomingReservationsForWorkerIdentity(client, context.WORKSPACE_SID, event.Author);
    }
    else {
      // for non "System" Conversation, ensure there's a mapped channel.
      // if not channel, we create the channel.
      // then post the message to the Channel.
      if(!conversations_helpers.hasChatChannelMapped(convo.attributes)) {
        await chat_helpers.createChatForConversation(frClient, conversations_helpers, context, event)
      }
      await chat_helpers.postMessageToChatChannel(client, convo, event.ClientIdentity, event.Body, event.DateCreated);
    }
  }

  /*
   * If a conversation is closed from the frontline app
   * we'll close the chat channe in flex as well.
   */
  else if(event.EventType == "onConversationStateUpdated") {
    if(event.StateTo == "closed") {
      if(!convo.attributes.chatChannelSid) return;
      const markTaskComplete = async function() {
        await taskrouter_helpers.updateUncompleteTasksToCompleted(
          client,
          convo.attributes.WorkspaceSid,
          convo.attributes.TaskSid,
          {reservationStatus: 'completed'}
        )
      };
      const res = await markTaskComplete();
      setTimeout(async function() {
        const hadToCleanUp = await chat_helpers.cleanupChatChannel(client, convo.attributes.chatChannelSid, convo.attributes.chatInstanceSid);
        if(hadToCleanUp) markTaskComplete();
        callback(null, response);
      }, 2000);
    }
  }

  /*
   * When a conversation is added, ensure has a mapped channel.
   */
  else if(event.EventType == "onConversationAdded") {
    // if conversation already has channel, then skip this
    const attrs = event.ConversationAttributes;
    if(attrs)
      if(conversations_helpers.hasChatChannelMapped(JSON.parse(attrs)))
        return;

    // if channel doesn't exist, create it
    async function tryCreateChatChannel() {
      const participants = await conversations_helpers.fetchConversationParticipants(frClient, event.ConversationSid);

      if(participants.length < 2) {
        setTimeout(tryCreateChatChannel, 1000);
      }
      else {
        await chat_helpers.createChatForConversation(frClient, conversations_helpers, context, event, participants)
      }
    }

    setTimeout(tryCreateChatChannel, 100);
  }

  else if (event.EventType == "onConversationUpdated") {
    if(event.State == "closed") return;

    const attributes = JSON.parse(event.Attributes);
    if(!attributes.TaskSid) return;

    const frontlineEvents = attributes['frontline.events'];
    const lastEvent = frontlineEvents ? frontlineEvents[frontlineEvents.length-1] : null;

    function isATransferEvent() {
      return (lastEvent && lastEvent.to && lastEvent.from && (new Date(event.DateUpdated).getTime() - lastEvent.date) < 1000);
    }

    function transferDisabled() {
      return (context.DISABLE_FRONTLINE_TRANSFER && context.DISABLE_FRONTLINE_TRANSFER == "true");
    }

    async function transferInFlex() {
      const chat_transfer_helper = require(Runtime.getFunctions()['helpers/task-transfer'].path)();
      const worker = await taskrouter_helpers.getWorkerByIdentity(client, context.WORKSPACE_SID, lastEvent.to);
      await conversations_helpers.removeParticipantByIdentity(frClient, event.ConversationSid, null, lastEvent.to);
      await chat_helpers.removeChannelParticipant(client, context.CHAT_SERVICE_SID, attributes.chatChannelSid, lastEvent.from);
      await chat_transfer_helper.transfer(client, context.WORKSPACE_SID, context.WORKFLOW_SID, attributes.TaskSid, worker.sid, worker.friendlyName);
    }

    async function blockTransfer() {
      await conversations_helpers.removeParticipantByIdentity(frClient, event.ConversationSid, null, lastEvent.to);
      await conversations_helpers.addParticipant(frClient, { sid: event.ConversationSid }, { identity: lastEvent.from });
      const systemConvo = await conversations_helpers.getSystemConversation(frClient, lastEvent.from);
      await conversations_helpers.postMessageToFrontlineConversation(
        frClient,
        systemConvo,
        conversations_helpers.getSystemParticipantIdentity(lastEvent.from),
        "Transferring conversations is not allowed by your administrator.");
    }

    if(isATransferEvent()) {
      if(transferDisabled())
        await blockTransfer();
      else
        await transferInFlex();
    }
  }
}
