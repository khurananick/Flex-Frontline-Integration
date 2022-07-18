module.exports = function () {
  const Self = {};

  Self.generateXTwilioSignature = function(url, payload, authToken) {
    const data = Object.keys(payload).sort().reduce((acc, key) => acc + key + payload[key], url);
    const crypto  = require('crypto');
    const signature =  crypto.createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
    return signature;
  }

  Self.getServiceUrl = function(context, event) {
    if(context.DOMAIN_NAME.match("localhost"))
      return event.request.headers.host || context.DOMAIN_NAME;
    return context.DOMAIN_NAME;
  }

  Self.validateXTwilioSignature = function(authToken, context, event) {
    const client = require('twilio');

    const params = Object.assign({}, event);
    delete params.request;

    const signature = event.request.headers['x-twilio-signature'];
    const url = `https://${Self.getServiceUrl(context, event)}${context.PATH}`;

    return client.validateRequest(authToken, signature, url, params);
  }

  Self.requestHasValidXTwilioSignature = function(context, event) {
    if(
      Self.validateXTwilioSignature(context.AUTH_TOKEN, context, event) || 
      Self.validateXTwilioSignature(context.FRONTLINE_AUTH_TOKEN, context, event))
    {
      return true;
    }
    return false;
  }

  Self.inArray = function(arr, val) {
    return arr.indexOf(val) >= 0
  }

  Self.isJson = function (item) {
    item = typeof item !== "string" ? JSON.stringify(item) : item;

    try {
        item = JSON.parse(item);
    }
    catch (e) { return false; }

    if (typeof item === "object" && item !== null) return true;

    return false;
  }

  Self.proxyRequest = async function(url, authToken, event) {
    // payload to replicate Default Webhook.
    const payload = Object.assign({}, event);
    delete payload.request;

    // headers to replicate Default Webhook.
    const headers = Object.assign({}, event.request.headers);
    headers.host = ""
    headers['x-twilio-signature'] = Self.generateXTwilioSignature(url, payload, authToken);

    // replicate Default Webhook
    const axios   = require('axios');
    const qs      = require('qs');
    const post = await axios({
      method: "post",
      url: url,
      data: qs.stringify(payload),
      headers: headers
    })
    .catch(function(e) {
      return {};
    });

    return post;
  }

  return Self;
}
