function objToFormattedDetailsText(attributes) {
  const obj = { title: "Details", content: "" };
  for(let i in attributes) {
    if(typeof attributes[i] == "object")
      for(let j in attributes[i])
        obj.content += `${i}/${j}:\n ${JSON.stringify(attributes[i][j])}\n\n`
    else
      obj.content += `${i}:\n ${JSON.stringify(attributes[i])}\n\n`
  }
  return obj;
}

function extractPhoneNumber(channel) {
  const phoneNumber = channel.attributes.pre_engagement_data?.phoneNumber;
  if(!phoneNumber) {
    if(channel.attributes.from.match(/^\+\d+$/)) {
      return channel.attributes.from;
    }
    else if(channel.attributes.serviceNumber) {
      if(channel.attributes.serviceNumber.match("sms_")) {
        if(channel.friendlyName.match(/^\+\d+$/)) {
          return channel.friendlyName;
        }
      }
    }
  }
  return phoneNumber;
}

exports.handler = async function (context, event, callback) {
  console.log('frontline/crm.js', event.EventType);

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  if(!helpers.validateXTwilioSignature(context.FRONTLINE_AUTH_TOKEN, context, event)) {
    response.setStatusCode(500);
    return callback(null, response);
  }

  const chat_helpers = require(Runtime.getFunctions()['helpers/chat'].path)();

  if(helpers.isJson(event.CustomerId) && event.Location == 'GetCustomerDetailsByCustomerId') {
    const customer = JSON.parse(event.CustomerId);
    const client = context.getTwilioClient();
    const channel = await chat_helpers.findChatChannel(client, customer.c, context.CHAT_SERVICE_SID);
    const phoneNumber = extractPhoneNumber(channel);
    const friendlyName = channel.attributes.pre_engagement_data?.friendlyName || channel.friendlyName || "User";
    const data = {
      objects: {
        customer: {
          display_name: friendlyName,
          customer_id: event.CustomerId,
          channels: [],
          details: objToFormattedDetailsText(channel.attributes)
        }
      }
    }
    if(phoneNumber)
      data.objects.customer.channels.push({ type: "sms", value: phoneNumber })

    response.setBody(data);
    return callback(null, response)
  }
  else if(context.BACKUP_CRM_ENDPOINT) {
    const proxy = await helpers.proxyRequest(context.BACKUP_CRM_ENDPOINT, context, event);
    response.setBody(proxy.data);
    return callback(null, response);
  }

  callback(null, {});
}
/*
*/
