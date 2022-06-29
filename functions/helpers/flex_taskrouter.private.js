const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

module.exports = function (context, event) {
  const Self = {};

  const client = context.getTwilioClient();

  /*
   * Fetching a list of all the workers in the Flex project.
   */
  Self.getWorkers = async function() {
    const workers = await client.taskrouter.workspaces(context.WORKSPACE_SID)
                 .workers
                 .list()
    return workers;
  }

  /*
   * Returns the woker based on friendlyName match.
   */
  Self.getWorkerByIdentity = async function(name) {
    const workers = await Self.getWorkers();
    for(const worker of workers) {
      if(worker.friendlyName == name)
        return worker;
    }
  }

  /*
   * Fetches the list of activities workers can be set to.
   */
  Self.getActivities = async function() {
    const activities = await client.taskrouter.workspaces(context.WORKSPACE_SID)
                 .activities
                 .list()
    return activities;
  }

  /*
   * Returns the activity matching the friendlyName
   */
  Self.getActivityByName = async function(name) {
    const activities = await Self.getActivities();
    for(const activity of activities) {
      if(activity.friendlyName == name)
        return activity;
    }
  }

  /*
   * Updates the worker's activity to the one set in the current webhook.
   */
  Self.syncWorkerActivity = async function() {
    const worker = await Self.getWorkerByIdentity(event.WorkerName);
    const activity = await Self.getActivityByName(event.WorkerActivityName);
    await client.taskrouter.workspaces(context.WORKSPACE_SID)
               .workers(worker.sid)
               .update({activitySid: activity.sid})
  }

  return Self;
}
