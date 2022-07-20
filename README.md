**Please note this is not an official Twilio supported application.** 
**This application does not come with any warranties. You may use this application at your own risk.** 

# Flex + Frontline Integration

This Twilio Serverless app takes webhooks from the Programmable Chat API used in the Twilio Flex project and webhooks from the Conversations API used in the Frontline project to sync the two resources together with messages posted by participants.

This app assumes that the Flex Project and the Frontline Project are two entire separate Projects/Accounts, and that the Worker in the Flex Project has the same username as the user in the Frontline project. 

## Demo Video

[![Demo](https://play.vidyard.com/5ahUuHUURTwr4Zd5Bqpcuq.jpg)](https://share.vidyard.com/watch/KBBq8gf2sRsmuFbFAmuxqn?)

## Pre-requisites

You must have a working Flex Account and a working Frontline Account.
You should deploy this application only to your Flex Account.

## Covered Use Cases and Channels
Channels: Chat and SMS only. Voice to come soon.
1. When a reservation is created in Flex, a notification is sent over Frontline to the agent as well.
2. The agent can accept the task in Flex or in Frontline. 
3. Once a task is accepted in flex, the chat/conversation will also show in Frontline.
4. Agent can receive messages via Flex or Frontline, and respond from either interface as well. 
5. Agent can transfer the chat in Flex (*not available in Frontline yet*). The transferred chat will be reflected on the Frontline side.
6. Agent can end the chat/conversation from either Flex or Frontline, and the other project will update automatically.
## Architecture

<h4 align="center">Action > Webhook > Replication</h4></h4>

***

<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/diagram.png" style="width:60%;margin:0;" /></p>

* **Flex Is The Primary Orchestrator**: This would be the best way to track SLAs (agent response times, duration of conversations, average wait time, etc.)

###### Endpoints

* **/chat-to-frontline**: Prog Chat webhook from the Flex project.
	* Triggers
		* **onMessageSent** - everytime a message is posted to the channel, we confirm if the channel has a corresponding Conversation (create if not), then post the message to the conversation.
		* **onMemberRemoved** - if the member removed from chat is an agent, we remove that member from the corresponding Conversation.
		* **onMessageSent, onChannelUpdated, onChannelDestroyed** - default events that come with the project. We're simply proxying these to the default URL.
* **/check-agent-availability** *(optional)*: Checks if the agent is online. If not, sends a system notification to the agent to alert them. 
	* Triggers
		* AJAX request from the client page.
* **/frontline-to-chat**: 
	* Triggers
		* **onMessageAdded** - posts the message back to chat channel. Creates channel if not exists.
		* **onConversationStateUpdated** - if closed, closes the channel.
		* **onConversationAdded** - create the corresponding Chat Channel.
* **/taskrouter-handler**: 
	* Triggers
		* **reservation.created** - sets reservation to accepted if auto accept is enabled.
		* **reservation.accepted**  - adds the agent to chat channel as member if agent is not a member. adds agent to conversation if not a participant.
		* **worker.activity.update'** - listens for worker status update in flex and frontline and replicates to the other side.
* **/frontline/crm**: 
	* Triggers
		* **GetCustomersList** - List of customers to show in frontline.
		* **GetCustomerDetailsByCustomerId** - Details of a particular customer in frontline.
* **/frontline/outgoing**:
	* Triggers
		* Gathers the proxy phone number needed to start conversation.
* **/frontline/templates**: 
	* Triggers
		* Gathers templates to display for frontline agent.

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
WORKSPACE_SID=WS...
WORKFLOW_SID=WW...
CHAT_SERVICE_SID=IS...
SMS_CHANNEL_SID=TC...
PROXY_SERVICE_SID=KS...
AUTO_ACCEPT_TASKS=true
SMS_NUMBER=+...
FLEX_CHAT_DEFAULT_WEBHOOK="https://webhooks.twilio.com/v1/Accounts/.../Proxy/.../Webhooks/ChatEvent/ProxyIdentifier/..."
# these values should come from your Frontline project.
FRONTLINE_ACCOUNT_SID=AC...
FRONTLINE_AUTH_TOKEN=...
FRONTLINE_WORKSPACE_SID=WS...
FRONTLINE_AVAILABLE_STATUS=Available
CONERSATION_SERVICE_SID=IS...
FRONTLINE_SMS_NUMBER=+...
FRONTLINE_WHATSAPP_NUMBER=whatsapp:+1...
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
