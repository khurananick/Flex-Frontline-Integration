module.exports = (function(client) {
  const Self = {};

  Self.getWorker = async function(client, wsid, workerName) {
    const workers = await client.taskrouter.workspaces(wsid)
                 .workers
                 .list({friendlyName: workerName})
    return workers[0];
  };

  Self.getActivity = async function(client, wsid, activityName) {
    const activities = await client.taskrouter.workspaces(wsid)
                 .activities
                 .list({friendlyName: activityName})
    return activities[0]
  }

  Self.setAgentStatus = async function (client, wsid, workerName, activityName) {
    console.log("Updating worker activity to", activityName);
    const worker = await Self.getWorker(client, wsid, workerName);
    const activity = await Self.getActivity(client, wsid, activityName);

    const resp = await client.taskrouter.workspaces(wsid)
      .workers(worker.sid)
      .update({activitySid: activity.sid})

    console.log("Worker activity set to", resp.activityName);
    return resp;
  };

  Self.getTasks = async function(client, wsid, tsid) {
    if(tsid)
      return await client.taskrouter.workspaces(wsid).tasks(tsid).fetch()
    else
      return await client.taskrouter.workspaces(wsid).tasks.list()
  }

  Self.getChatChannels = async function(client, serviceSid, channelSid) {
    if(channelSid)
      return await client.chat.v2.services(serviceSid).channels(channelSid).fetch();
    else
      return await client.chat.v2.services(serviceSid).channels.list();
  }

  Self.getChatChannelMembers = async function(members) {
  }

  Self.getConversationParticipants = async function(participants) {
  }

  Self.findConversation = async function(client, workerName) {
    const conversations = await client.conversations
      .participantConversations
      .list({identity: workerName, limit: 20000});

    for(const c of conversations) {
      c.conversationAttributes = JSON.parse(c.conversationAttributes);
      if(c.conversationState == "active" && !c.conversationAttributes.isNotificationSystem)
        return c;
    }
  };

  Self.findChatChannel = async function(client, serviceSid) {
    const channels = await client.chat.v2.services(serviceSid)
      .channels
      .list();

    for(const channel of channels) {
      channel.attributes = JSON.parse(channel.attributes);
      if(channel.attributes.status == 'ACTIVE')
        return channel;
    }
  };

  Self.cleanupResources = async function(client, frClient, wsid, serviceSid, workerName) {
    console.log("Cleaning up Task, Chat Channels and Conversations");
    const worker = await Self.getWorker(client, wsid, workerName);
    /* deleting all tasks */
    const tasks = await Self.getTasks(client, wsid);
    for(const task of tasks) {
      await client.taskrouter.workspaces(wsid).tasks(task.sid).remove();
    }
    /* end deleting all tasks */
    /* deleting all channels */
    const channels = await Self.getChatChannels(client, serviceSid);
    for(const channel of channels) {
      await client.chat.v2.services(serviceSid).channels(channel.sid).remove();
    }
    /* end deleting all channels */
    /* deleting all conversations */
    const conversations = await frClient.conversations.conversations.list();
    for(const c of conversations) {
      if(c.conversationAttributes) {
        c.conversationAttributes = JSON.parse(c.conversationAttributes);
        if(!c.conversationAttributes.isNotificationSystem)
          await frClient.conversations.conversations(c.sid).remove();
      }
      else
        await frClient.conversations.conversations(c.sid).remove();
    }
    /* end deleting all conversations */
  };

  return Self;
})();
