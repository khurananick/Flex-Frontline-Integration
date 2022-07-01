exports.handler = async function (context, event, callback) {
  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)(context, event);

  if(event.Location == 'GetCustomerDetailsByCustomerId') {
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

  callback(null, null);
}
/*
*/
