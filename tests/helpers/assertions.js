const colors = require('colors');
colors.enable()

module.exports = (function() {
  const Self = {};

  Self.testIfObjectExists = function(params, failMsg, passMsg) {
    if(!params) {
      console.log(failMsg.red);
      process.exit();
    }
    else
      console.log(passMsg.green);
  }

  Self.testIfObjectDoesNotExist = function(params, failMsg, passMsg) {
    if(params) {
      console.log(failMsg.red);
      process.exit();
    }
    else
      console.log(passMsg.green);
  }

  Self.testIfAttributeExists = function(object, attribute, failMsg, passMsg) {
    if(!object[attribute]) {
      console.log(failMsg.red);
      process.exit();
    }
    else
      console.log(passMsg.green);
  }

  Self.testIfCollectionHasAttributeValue = function(array, attribute, value, failMsg, passMsg) {
    for(const i in array) {
      if(array[i][attribute] == value) {
        console.log(passMsg.green);
        return;
      }
    }

    console.log(failMsg.red);
    process.exit();
  }

  Self.testCollectDotNaveAttributeValue = function(array, attribute, value, failMsg, passMsg) {
    for(const i in array) {
      if(array[i][attribute] == value) {
        console.log(failMsg.red);
        process.exit();
      }
    }

    console.log(passMsg.green);
  }

  return Self;

})();
