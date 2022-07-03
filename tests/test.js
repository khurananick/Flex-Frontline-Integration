require('dotenv').config();

const { env } = process;

const TEST_CHANNEL_SMS = (env.npm_config_channel == "sms"); // if not we assume chat.

const client              = require("twilio")(env.ACCOUNT_SID, env.AUTH_TOKEN);
const frClient            = require("twilio")(env.FRONTLINE_ACCOUNT_SID, env.FRONTLINE_AUTH_TOKEN);

const webchat             = require('./webchat.js');
const flex                = require('./flex.js');
const frontline           = require('./frontline.js');
const agent_helpers       = require('./helpers/agent.js');
const testWorkerName      = 'nkhurana';
const availableActivity   = "Available";
const unAvailableActivity = "Unavailable";

let pup;
const tests = [];

tests.push(async function() {
  console.log("Testing interaction with agent online and auto accept enabled. Smoothest route.");

  // ensure agent is online.
  await agent_helpers.setAgentStatus(client, env.WORKSPACE_SID, testWorkerName, "Available");

  if(!TEST_CHANNEL_SMS)
    pup = await webchat.loadAndStartChatAsUser();

  // run the tests.
  await flex.testChatChannelExists();
  await flex.testIfChatChannelHasAgent();

  if(!TEST_CHANNEL_SMS) {
    await webchat.closeBrowserSession(pup.browser, pup.page);
  }
});

tests.push(async function() {
  console.log("Testing interaction with agent offline to start the chat.");

  // set agent to unavailable
  await agent_helpers.setAgentStatus(client, env.WORKSPACE_SID, testWorkerName, "Unavailable");

  if(!TEST_CHANNEL_SMS)
    pup = await webchat.loadAndStartChatAsUser();

  // run the tests.
  await flex.testChatChannelExists();
  await flex.testIfChatChannelDoesNotHaveAgent();

  if(!TEST_CHANNEL_SMS) {
    await webchat.closeBrowserSession(pup.browser, pup.page);
  }

  await flex.closeReservationsAndTasks();
});

(async function() {
  for(const i in tests) await tests[i]();
})()
