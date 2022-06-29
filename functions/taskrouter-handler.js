exports.handler = async function (context, event, callback) {
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
    return; // by default, we don't auto accept a reservation. remove this line to auto accpet a reservation.
    const client = context.getTwilioClient();
    await client.taskrouter.workspaces(event.WorkspaceSid)
      .tasks(event.TaskSid)
      .reservations(event.ResourceSid)
      .update({reservationStatus: 'accepted'})
  }

  /*
   * Optional function that listens for the worker.activity.update
   * in the Frontline application and updates the Flex worker
   * to the same status.
   */
  if(event.EventType == 'worker.activity.update') {
    const flex_taskrouter_helpers = require(Runtime.getFunctions()['helpers/flex_taskrouter'].path)(context, event);

    if(event.AccountSid == context.FRONTLINE_ACCOUNT_SID) {
      await flex_taskrouter_helpers.syncWorkerActivity();
    }
  }
}
