exports.handler = async function (context, event, callback) {
  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)(context, event);
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)(context, event);

  if(helpers.isJson(event.CustomerId) && event.Location == 'GetCustomerDetailsByCustomerId') {
    const customer = JSON.parse(event.CustomerId);
    const client = context.getTwilioClient();
    const channel = await chat_helpers.findChatChannel(client, customer.c);
    const response = {
      "objects": {
        "customer": {
          "display_name": channel.attributes.pre_engagement_data.friendlyName,
          "customer_id": event.CustomerId,
          "channels": [{ type: "sms", "value": channel.attributes.pre_engagement_data.phoneNumber}],
          "details": (function() {
            const obj = {
              "title": "Details",
              "content": ""
            };
            for(let i in channel.attributes) {
              obj.content += `${i}:\n ${JSON.stringify(channel.attributes[i])}\n\n`
            }
            return obj;
          })()
        }
      }
    }

    return callback(null, response)
  }
  else {
    const response = await helpers.proxyRequest("https://frontline-serverless-project-5473-dev.twil.io/frontline/crm");
    return callback(null, response.data);
  }

  callback(null, {});
}
/*
*/
