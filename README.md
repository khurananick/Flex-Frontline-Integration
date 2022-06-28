# Flex + Frontline Integration

This simple web app takes webhooks from the Programmable Chat API used in the Twilio Flex project and webhooks Conversations API in the Frontline project to sync the two resources together with messages posted by participants.

This app assumes that the Flex Project and Frontline Project are two entire separate Projects/Accounts, and that the Worker in the Flex Project has the same username as the user in the Frontline project. 

### Architecture

<img src="https://flex-frontline-integration-1058-dev.twil.io/diagram.png" />

### Deployment Steps
1. Copy the env.sample to .env
2. Update the values to the required environment variables - be sure to get the default webhook URL from your Flex Programmable Chat service.
<img src="https://flex-frontline-integration-1058-dev.twil.io/default-webhook.png" />
3. Deploy web app to serverless environment
4. Add webhook to the Programmable Chat service
<img src="https://flex-frontline-integration-1058-dev.twil.io/flex-chat-webhook.png" />
5. Add webhook to the Conversation Service
<img src="https://flex-frontline-integration-1058-dev.twil.io/frontline-conversations-webhook.png" />

