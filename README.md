# Flex + Frontline Integration

This simple web app takes webhooks from the Programmable Chat API used in the Twilio Flex project and webhooks Conversations API in the Frontline project to sync the two resources together with messages posted by participants.

This app assumes that the Flex Project and Frontline Project are two entire separate Projects/Accounts, and that the Worker in the Flex Project has the same username as the user in the Frontline project. 

## Demo Video

[![Demo](https://play.vidyard.com/5ahUuHUURTwr4Zd5Bqpcuq.jpg)](https://share.vidyard.com/watch/KBBq8gf2sRsmuFbFAmuxqn?)

## Pre-requisites

You must have a working Flex Account and a working Frontline Account.
You should deploy this application only to your Flex Account.

## Architecture

<h4 align="center">Action > Webhook > Replication</h4></h4>

***

<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/diagram.png" style="width:60%;margin:0;" /></p>

* **Flex Is The Primary Orchestrator**: This would be the best way to track SLAs (agent response times, duration of conversations, average wait time, etc.)

## Considerations

* **Desynchronization**: In case the Programmable Chat service in the Flex Project or the Conversations service in the Frontline project experience downtime, the Chat Channel and the Conversation may fall out of sync. 
	* **Potential Options**: (1) Failover/retry requests. However, for downtimes longer than function execution times, this method will not work. (2) Using Segment as a Queueing service to keep track of every event and replaying failed events. (3) Using a third party queueing sytem for tracking and replaying failed events. 


## Deployment Steps

##### 1. Copy the env.sample to .env
```
cp env.sample .env
```


##### 2. Update the values to the required environment variables - be sure to get the default webhook URL from your Flex Programmable Chat service.
```
vi .env
```

```
# these values should come from your Flex project.
ACCOUNT_SID=AC...
AUTH_TOKEN=...
WORKSPACE_SID=...
CHAT_SERVICE_SID=IS...
AUTO_ACCEPT_TASKS=true
FLEX_CHAT_DEFAULT_WEBHOOK="https://webhooks.twilio.com/v1/Accounts/.../Proxy/.../Webhooks/ChatEvent/ProxyIdentifier/..."
SMS_NUMBER=+...
WHATSAPP_NUMBER=whatsapp:+...
# these values should come from your Frontline project.
FRONTLINE_ACCOUNT_SID=AC...
FRONTLINE_AUTH_TOKEN=...
FRONTLINE_WORKSPACE_SID=WS...
FRONTLINE_AVAILABLE_STATUS=Available
CONERSATION_SERVICE_SID=IS...
NOTIFICATION_TIMEOUT_MINUTES=0.5
BACKUP_CRM_ENDPOINT=https://...
```

<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/default-webhook.png" style="width:80%;margin:0;"/></p>


##### 3. Deploy web app to serverless environment
```
npm run deploy
```
This will return a list of webhooks your serverless project has created. For example
```
https://YOUR_SERVICE_SUBDOMAIN.twil.io/check-agent-availability
https://YOUR_SERVICE_SUBDOMAIN.twil.io/frontline-to-chat
https://YOUR_SERVICE_SUBDOMAIN.twil.io/frontline/crm
https://YOUR_SERVICE_SUBDOMAIN.twil.io/taskrouter-handler
... etc.
```

##### 4. Update the frontline callbacks (if needed).
<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/frontline-callbacks.png" style="width:80%;margin:0;"/></p>


##### 5. Update the webhooks in both projects.
**NOTE**: *Be sure to have copied the default Programmable Chat Webhook from the account and have it in your .env file before you do this next step.*
```
npm run deploy_routes --route=https://YOUR_SERVICE_SUBDOMAIN.twil.io
```
##### 6. Ensure the following events are enabled for Chat and Conversation
<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/frontline-post-webhook.png" style="width:80%;margin:0;"/></p>
<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/default-webhook.png" style="width:80%;margin:0;"/></p>

## Testing
##### Requires Puppeteer and Chromium
```
npm run test 
```
##### In case the tests are not running properly, try removing all existing conversations and chat channels. Keep in mind this is irreversible. All Conversations history from the Frontline project and all Chat Channels history will be wiped from each project.
```
npm run test --wipe_channels=true --wipe_conversations=true
```
