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

  Self.inArray = function(arr, val) {
    return arr.indexOf(val) >= 0
  }

  return Self;
}
