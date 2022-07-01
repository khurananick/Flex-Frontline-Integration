module.exports = function (context, event) {
  const Self = {};

  Self.generateXTwilioSignature = function(url, payload, authToken) {
    const data = Object.keys(payload).sort().reduce((acc, key) => acc + key + payload[key], url);
    const crypto  = require('crypto');
    const signature =  crypto.createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
    return signature;
  }

  Self.inArray = function(arr, val) {
    return arr.indexOf(val) >= 0
  }

  Self.isJson = function (string) {
    try {
      JSON.parse(string)
    } catch(e) {
      return false
    }
    return true;
  }

  Self.proxyRequest = async function(url) {
    // payload to replicate Default Webhook.
    const payload = Object.assign({}, event);
    delete payload.request;

    // headers to replicate Default Webhook.
    const headers = event.request.headers;
    headers.host = ""
    headers['x-twilio-signature'] = Self.generateXTwilioSignature(url, payload, context.AUTH_TOKEN);

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
