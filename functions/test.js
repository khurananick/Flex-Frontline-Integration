exports.handler = async function (context, event, callback) {
  const taskrouter_helpers = require(Runtime.getFunctions()['helpers/taskrouter'].path)(context, event);
  const client = context.getTwilioClient();
  const workers = await taskrouter_helpers.getWorkerByIdentity(client, context.WORKSPACE_SID, 'nkhurana');
  callback(null, workers);
}
