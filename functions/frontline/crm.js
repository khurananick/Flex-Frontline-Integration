exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)(context, event);

  if(!helpers.validateXTwilioSignature(context.FRONTLINE_AUTH_TOKEN)) {
    response.setStatusCode(500);
    return callback(null, response);
  }

  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)(context, event);

  if(helpers.isJson(event.CustomerId) && event.Location == 'GetCustomerDetailsByCustomerId') {
    const customer = JSON.parse(event.CustomerId);
    const client = context.getTwilioClient();
    const channel = await chat_helpers.findChatChannel(client, customer.c);
    const data = {
      objects: {
        customer: {
          display_name: channel.attributes.pre_engagement_data.friendlyName,
          customer_id: event.CustomerId,
          channels: [{ type: "sms", "value": channel.attributes.pre_engagement_data.phoneNumber}],
          details: (function() {
            const obj = {
              title: "Details",
              content: ""
            };
            for(let i in channel.attributes) {
              obj.content += `${i}:\n ${JSON.stringify(channel.attributes[i])}\n\n`
            }
            return obj;
          })()
        }
      }
    }

    response.setBody(data);
    return callback(null, response)
  }
  else {
    const proxy = await helpers.proxyRequest(context.BACKUP_CRM_ENDPOINT);
    response.setBody(proxy.data);
    return callback(null, response);
  }

  callback(null, {});
}
/*
*/