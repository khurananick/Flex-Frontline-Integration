const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

module.exports = function (context, event) {
  const Self = {};

  /*
   * Fetching a list of all the workers in the Flex project.
   */
  Self.getWorkers = async function(client, wsid, filters={}) {
    filters.limit = 50000;
    const workers = await client.taskrouter.workspaces(wsid)
                 .workers
                 .list(filters)
    return workers;
  }

  /*
   * Returns the woker based on friendlyName match.
   */
  Self.getWorkerByIdentity = async function(client, wsid, name) {
    const workers = await Self.getWorkers(client, wsid, {friendlyName:name});
    const worker = workers[0];
    worker.attributes = JSON.parse(worker.attributes);
    return worker;
  }

  /*
   * Fetches the list of activities workers can be set to.
   */
  Self.getActivities = async function(client, wsid, filters={}) {
    const activities = await client.taskrouter.workspaces(wsid)
                 .activities
                 .list(filters)
    return activities;
  }

  /*
   * Returns the activity matching the friendlyName
   */
  Self.getActivityByName = async function(client, wsid, name) {
    const activities = await Self.getActivities(client, wsid, {friendlyName:name});
    const activity = activities[0];
    return activity;
  }

  /*
   * Sets the activity of the worker in taskrouter if new activity friendlyname is different
   */
  Self.setTaskrouterWorkerActivity = async function(client, wsid, worker, activity) {
    if(!activity || !activity.sid) return;
    if(worker.activityName == activity.friendlyName) return;

    await client.taskrouter.workspaces(wsid)
               .workers(worker.sid)
               .update({activitySid: activity.sid})
  }

  Self.updateTaskrouterReservation = async function(client, wsid, tsid, rsid, params) {
    await client.taskrouter.workspaces(wsid)
      .tasks(tsid)
      .reservations(rsid)
      .update(params)
  }

  /*
   * Frontline has a separate activity for worker status which we can set as well.
   */
  Self.updateFrontlineUserStatus = async function(client, worker) {
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

    await Self.setTaskrouterWorkerActivity(client, wsid, worker, activity);
    await Self.updateFrontlineUserStatus(client, worker);
  }

  return Self;
}