exports.handler = async function (context, event, callback) {
  console.log('frontline/templates.js', event.Location);

  const helpers = require(Runtime.getFunctions()['helpers/functions'].path)();

  if(!helpers.requestHasValidXTwilioSignature(context, event)) {
    return callback(null, 'Invalid Signature');
  }

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');

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
