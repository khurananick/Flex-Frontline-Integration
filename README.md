# Flex + Frontline Integration

This simple web app takes webhooks from the Programmable Chat API used in the Twilio Flex project and webhooks Conversations API in the Frontline project to sync the two resources together with messages posted by participants.

This app assumes that the Flex Project and Frontline Project are two entire separate Projects/Accounts, and that the Worker in the Flex Project has the same username as the user in the Frontline project. 

## Demo Video

[![Demo](https://play.vidyard.com/5ahUuHUURTwr4Zd5Bqpcuq.jpg)](https://share.vidyard.com/watch/5ahUuHUURTwr4Zd5Bqpcuq?)

### Architecture

<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/diagram.png" style="width:60%;margin:0;" /></p>

### Deployment Steps
1. Copy the env.sample to .env
```
cp env.sample .env
```

***

2. Update the values to the required environment variables - be sure to get the default webhook URL from your Flex Programmable Chat service.
```
vi .env
```

```
ACCOUNT_SID=AC...
AUTH_TOKEN=...
WORKSPACE_SID=WS...
FRONTLINE_ACCOUNT_SID=AC...
FRONTLINE_AUTH_TOKEN=...
FLEX_CHAT_DEFAULT_WEBHOOK="https://webhooks.twilio.com/v1/Accounts/.../Proxy/.../Webhooks/ChatEvent/ProxyIdentifier/..."
```

<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/default-webhook.png" style="width:80%;margin:0;"/></p>

***

3. Deploy web app to serverless environment
```
npm run deploy
```

***

4. Add webhook to the Programmable Chat service
```
https://YOUR_SERVICE_SUBDOMAIN.twil.io/chat-to-frontline
```
<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/flex-chat-webhook.png" style="width:80%;margin:0;" /></p>

***

5. Add webhook to the Conversation Service
```
https://YOUR_SERVICE_SUBDOMAIN.twil.io/frontline-to-chat
```
<p align="center"><img src="https://flex-frontline-integration-1058-dev.twil.io/imgs/frontline-conversations-webhook.png" style="width:80%;margin:0;" /></p>



