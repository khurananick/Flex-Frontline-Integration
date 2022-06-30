const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

module.exports = function (context, event) {
  const Self = {};

  /*
   * Fetching a list of all the workers in the Flex project.
   */
  Self.getWorkers = async function(client, wsid) {
    const workers = await client.taskrouter.workspaces(wsid)
                 .workers
                 .list()
    return workers;
  }

  /*
   * Returns the woker based on friendlyName match.
   */
  Self.getWorkerByIdentity = async function(client, wsid, name) {
    const workers = await Self.getWorkers(client, wsid);
    for(const worker of workers) {
      if(worker.friendlyName == name) {
        worker.attributes = JSON.parse(worker.attributes);
        return worker;
      }
    }
  }

  /*
   * Fetches the list of activities workers can be set to.
   */
  Self.getActivities = async function(client, wsid) {
    const activities = await client.taskrouter.workspaces(wsid)
                 .activities
                 .list()
    return activities;
  }

  /*
   * Returns the activity matching the friendlyName
   */
  Self.getActivityByName = async function(client, wsid, name) {
    const activities = await Self.getActivities(client, wsid);
    for(const activity of activities) {
      if(activity.friendlyName == name)
        return activity;
    }
  }

  Self.setActivity = async function(client, wsid, worker, activity) {
    if(!activity || !activity.sid) return;
    if(worker.activityName == activity.friendlyName) return;

    await client.taskrouter.workspaces(wsid)
               .workers(worker.sid)
               .update({activitySid: activity.sid})
  }

  Self.updateUserStatus = async function(client, worker) {
    if(!worker.attributes.userSid) return;

    const user = await client.frontlineApi
      .users(worker.attributes.userSid)
      .update({
        isAvailable: (event.WorkerActivityName == context.FRONTLINE_AVAILABLE_STATUS)
      });
  }

  /*
   * Updates the worker's activity to the one set in the current webhook.
   */
  Self.syncWorkerActivity = async function(client, wsid) {
    const worker = await Self.getWorkerByIdentity(client, wsid, event.WorkerName);
    const activity = await Self.getActivityByName(client, wsid, event.WorkerActivityName);

    await Self.setActivity(client, wsid, worker, activity);
    await Self.updateUserStatus(client, worker);
  }

  return Self;
}
