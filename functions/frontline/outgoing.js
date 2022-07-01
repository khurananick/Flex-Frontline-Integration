exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)(context, event);

  if(!helpers.validateXTwilioSignature(context.FRONTLINE_AUTH_TOKEN)) {
    response.setStatusCode(500);
    return callback(null, response);
  }

  const channelName = event.ChannelType;
  const proxyAddress = (function() {
    if (channelName === 'whatsapp') {
        return context.WHATSAPP_NUMBER;
    } else {
        return context.SMS_NUMBER;
    }
  })();

  response.setBody({ proxy_address: proxyAddress });
  callback(null, response);
}
