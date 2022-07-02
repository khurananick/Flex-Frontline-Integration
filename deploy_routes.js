require('dotenv').config()
const client = require("twilio")(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);
const frClient = require("twilio")(process.env.FRONTLINE_ACCOUNT_SID, process.env.FRONTLINE_AUTH_TOKEN);
const baseurl = process.env.npm_config_route;

(async function deployChatToFrontlineWebhook() {
  console.log("Setting Chat Service Webhook.");
  await client.chat.v2.services(process.env.CHAT_SERVICE_SID)
      .update({
        postWebhookUrl: `${baseurl}/chat-to-frontline`,
        webhookFilters: ['onMessageSent','onChannelUpdated','onChannelDestroyed','onMemberRemoved'],
        webhookMethod: "POST"
      })
})();

(async function deployFlexTaskrouterWebhook() {
  console.log("Setting Flex TaskRouter Webhook.");
  await client.taskrouter.workspaces(process.env.WORKSPACE_SID)
      .update({
         eventCallbackUrl: `${baseurl}/taskrouter-handler`,
         eventsFilter: 'reservation.created,reservation.accepted,worker.activity.update'
       })
       .catch(function(e) { console.log(e); });
})();

(async function deployFrontlineToChatWebhook() {
  console.log("Setting Conversations Global Webhook.");
  await frClient.conversations.configuration
      .webhooks()
      .update({
         postWebhookUrl: `${baseurl}/frontline-to-chat`,
         filters: ['onConversationAdded', 'onConversationUpdated','onConversationStateUpdated','onMessageAdded'],
         method: 'POST'
       })
})();

(async function deployFrontlineTaskrouterWebhook() {
  console.log("Setting Frontline TaskRouter Webhook.");
  await frClient.taskrouter.workspaces(process.env.FRONTLINE_WORKSPACE_SID)
      .update({
         eventCallbackUrl: `${baseurl}/taskrouter-handler`
       })
      .catch(function(e) { console.log(e); });
})();

