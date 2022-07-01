exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)(context, event);

  if(!helpers.validateXTwilioSignature(context.FRONTLINE_AUTH_TOKEN)) {
    response.setStatusCode(500);
    return callback(null, response);
  }

  const data = JSON.stringify([
    {
      "display_name": "Category Name",
      "templates": [
        { "content": "This is a template." },
        { "content": "This is also a template." },
      ]
    }
  ]);

  callback(null, data);
}
