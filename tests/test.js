require('dotenv').config();
const { env } = process;

if(!env.npm_config_skip_prompt) {
  const reader = require("readline-sync");
  const prompt = reader.question("The test suite will delete all open chat channels, conversations and tasks. Would you like to continue? ");
  if(prompt.toLowerCase() != "y")
    process.exit();
}

const TEST_CHANNEL_SMS = (env.npm_config_channel == "sms"); // if not we assume chat.

const client              = require("twilio")(env.ACCOUNT_SID, env.AUTH_TOKEN);
const frClient            = require("twilio")(env.FRONTLINE_ACCOUNT_SID, env.FRONTLINE_AUTH_TOKEN);

const webchat             = require('./webchat.js');
const flex                = require('./flex.js');
const frontline           = require('./frontline.js');
const helpers             = require('./helpers/functions.js');
const testWorkerName      = 'nkhurana';
const availableActivity   = "Available";
const unAvailableActivity = "Unavailable";

let session, conversation, participants, channel, members;
const tests = [];

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function startTestSession() {
  await helpers.cleanupResources(client, frClient, env.WORKSPACE_SID, env.CHAT_SERVICE_SID, testWorkerName);

  if(!TEST_CHANNEL_SMS)
    session = await webchat.loadAndStartChatAsUser();

  await sleep(50000); // give it 5 seconds for data to replicate into both systems.

  channel = await helpers.findChatChannel(client, env.CHAT_SERVICE_SID);
  members = await helpers.getChatChannelMembers(client, channel);
  conversation = await helpers.findConversation(frClient, testWorkerName);
  participants = await helpers.getConversationParticipants(frClient, conversation);
}

async function endTestSession() {
  if(!TEST_CHANNEL_SMS)
    await webchat.closeBrowserSession(session.browser, session.page);

  await helpers.cleanupResources(client, frClient, env.WORKSPACE_SID, env.CHAT_SERVICE_SID, testWorkerName);
}

tests.push(async function() {
  console.log("Testing interaction with agent online and auto accept enabled. Smoothest route.");

  // ensure agent is online.
  await helpers.setAgentStatus(client, env.WORKSPACE_SID, testWorkerName, availableActivity);

  await startTestSession();

  // run the tests.
  await flex.testChatChannelExists(channel);
  await flex.testChatChannelHasConversation(channel);
  await flex.testIfChatChannelHasAgent(members);
  await frontline.testConversationExists(frClient, testWorkerName);
  await frontline.testIfConversationHasAgent(participants)

  await endTestSession();
});

tests.push(async function() {
  console.log("Testing interaction with agent offline to start the chat.");

  // set agent to unavailable
  await helpers.setAgentStatus(client, env.WORKSPACE_SID, testWorkerName, unAvailableActivity);

  await startTestSession();

  // run the tests.
  await flex.testChatChannelExists(channel);
  await flex.testIfChatChannelDoesNotHaveAgent(members);
  await frontline.testConversationExists(conversation);

  await endTestSession();
});

(async function() {
  for(const i in tests) await tests[i]();
})()
