module.exports = (function(client) {
  const Self = {};

  Self.setAgentStatus = async function (client, wsid, workerName, activityName) {
    console.log("Updating worker activity to", activityName);

    const workers = await client.taskrouter.workspaces(wsid)
                 .workers
                 .list({friendlyName: workerName})
    const worker = workers[0];

    const activities = await client.taskrouter.workspaces(wsid)
                 .activities
                 .list({friendlyName: activityName})
    const activity = activities[0]

    const resp = await client.taskrouter.workspaces(wsid)
      .workers(worker.sid)
      .update({activitySid: activity.sid})

    console.log("Worker activity set to", resp.activityName);
    return resp;
  };

  Self.closeReservationsAndTasks = async function() {
  };

  return Self;
})();
