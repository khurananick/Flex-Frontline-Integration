require('dotenv').config()
const client = require("twilio")(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);
const frClient = require("twilio")(process.env.FRONTLINE_ACCOUNT_SID, process.env.FRONTLINE_AUTH_TOKEN);

(async function() {
  const conversations = await frClient.conversations
    .participantConversations
    .list({identity: "nkhurana"})
  console.log(conversations);
})();
