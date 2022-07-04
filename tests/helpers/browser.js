const puppeteer = require('puppeteer'); // ensure puppeteer is installed.

module.exports = (function() {

  const Self = {};

  Self.loadAndStartChatAsUser = async function () {
    console.log("Starting browser chat session.");
    // open browser to the page hosting Flex WebChat.
    const browser = await puppeteer.launch({
      executablePath: '/usr/local/bin/chromium'
    });
    const page = await browser.newPage();
    await page.goto('https://flex-chat-ui-with-config-9297-dev.twil.io/index.html');
    // wait for chat button to show on page, then start chat.
    await page.waitForSelector("button.Twilio-EntryPoint");
    await page.click("button.Twilio-EntryPoint");
    // assuming pre engagement form is already filled out.
    // submit the pre engagement form.
    await page.waitForSelector("button.Twilio-DynamicForm-submit");
    await page.click("button.Twilio-DynamicForm-submit");
    // send a chat message to get the taskrouter/flex side engaged.
    await page.waitForSelector("textarea");
    await page.type("textarea", "hello this is test user.");
    await page.click("button.Twilio-MessageInput-SendButton");
    return { browser, page }
  }

  Self.closeBrowserSession = async function (browser, page) {
    console.log("Closing browser chat session.");
    setTimeout(async function() {
      //await page.screenshot({ path: 'example.png' });
      await browser.close();
    }, 1000);
  }

  return Self;
})();
