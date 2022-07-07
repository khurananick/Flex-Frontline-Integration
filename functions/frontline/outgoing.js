exports.handler = async function(context, event, callback) {
  console.log('frontline/outgoing.js', event.Location);

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  if(!helpers.requestHasValidXTwilioSignature(context, event)) {
    return callback(null, 'Invalid Signature');
  }

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const channelName = event.ChannelType;
  const proxyAddress = (function() {
    if (channelName === 'whatsapp') {
        return context.FRONTLINE_WHATSAPP_NUMBER;
    } else {
        return context.FRONTLINE_SMS_NUMBER;
    }
  })();

  response.setBody({ proxy_address: proxyAddress });
  callback(null, response);
}
