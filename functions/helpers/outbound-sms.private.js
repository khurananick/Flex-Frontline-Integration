module.exports = async function(context, event) {
  const contactName     = event.ToName;
  const contactNumber   = event.ToNumber;
  const targetWorker    = event.TargetWorker;

  if(!contactName || !contactNumber)
    return { error: "ToName and ToNumber are required parameters." };

  const client          = context.getTwilioClient();
  const flexPhoneNum    = context.SMS_NUMBER;
  const workspaceSid    = context.WORKSPACE_SID;
  const workflowSid     = context.WORKFLOW_SID;
  const smsChannelSid   = context.SMS_CHANNEL_SID;
  const chatServiceSid  = context.CHAT_SERVICE_SID;
  const proxyServiceSid = context.PROXY_SERVICE_SID;
  const newFlowName     = "Outbound SMS";

  // find if {{newFlowName}} flow exists.
  let flexFlow;
  const flexFlows = await client.flexApi.flexFlow.list();
  for(let flow of flexFlows)
    if(flow.friendlyName == newFlowName)
      flexFlow = await client.flexApi.flexFlow(flow.sid).fetch() // fetch if true

  // create flow if not exists.
  if(!flexFlow)
    flexFlow = await client.flexApi.flexFlow
      .create({
         enabled: false,
         contactIdentity: flexPhoneNum,
         integrationType: 'task',
         'integration.workspaceSid': workspaceSid,
         'integration.workflowSid': workflowSid,
         'integration.channel': smsChannelSid,
         friendlyName: newFlowName,
         chatServiceSid: chatServiceSid,
         channelType: 'sms',
         longLived: false,
         janitorEnabled: true
       })
      .catch(function(e) { console.log(e); });

  // create a channel for this outbound number
  let newChannel = await client.flexApi.channel
    .create({
       target: contactNumber,
       taskAttributes: JSON.stringify({
         to: contactNumber,
         direction: 'outbound',
         name: contactName,
         from: flexPhoneNum,
         workerUri: targetWorker,
         autoAnswer: true
       }),
       identity: `sms${contactNumber}`,
       chatFriendlyName: `${contactName}`,
       flexFlowSid: flexFlow.sid,
       chatUserFriendlyName: contactName,
       uniqueName: (new Date().getTime()),
       longLived: false
     })
     .catch(function(e) { console.log(e); });

  /* re-use long-lived sessions. */
  const proxySessions = await client.proxy.services(proxyServiceSid).sessions.list();
  if(proxySessions)
    for(let session of proxySessions)
      if(session.uniqueName == newChannel.sid)
        return { success: true, session: session }

  // if no proxy session exists, create one and assign users to it
  const proxySession = await client.proxy.services(proxyServiceSid)
    .sessions
    .create({
       uniqueName: newChannel.sid,
       mode: 'message-only'
     })
    .catch(function(err) { console.log(err); })

  // add agent as participant 1
  const insider = await client.proxy.services(proxyServiceSid)
    .sessions(proxySession.sid)
    .participants
    .create({friendlyName: contactName, identifier: newChannel.sid, proxyIdentifier: flexPhoneNum})
    .catch(function(err) { console.log(err); });

  // add outbound number as participant 2
  const outsider = await client.proxy.services(proxyServiceSid)
    .sessions(proxySession.sid)
    .participants
    .create({friendlyName: contactName, identifier: contactNumber, proxyIdentifier: flexPhoneNum})
    .catch(function(err) { console.log(err); });

  newChannel = await client.chat.services(chatServiceSid).channels(newChannel.sid).fetch();
  const attrs = JSON.parse(newChannel.attributes);
  const channelAttributes = Object.assign(attrs, {
    proxySession: proxySession.sid,
    proxyServiceSid: proxySession.serviceSid,
    ConversationSid: event.ConversationSid,
    WorkspaceSid: workspaceSid,
    TaskSid: attrs.task_sid
  });
  const updateResp = await client.chat.services(chatServiceSid).channels(newChannel.sid).update({
    attributes: JSON.stringify(channelAttributes)
  });

  return { success: true, newChannel: updateResp, proxySession: proxySession }
}

