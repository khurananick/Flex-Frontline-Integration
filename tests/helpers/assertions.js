module.exports = (function() {
  const Self = {};

  Self.testIfObjectExists = function(desc, params, failMsg, passMsg) {
    console.log(desc.yellow);

    if(!params) {
      console.log(failMsg.red);
      process.exit();
    }
    else
      console.log(passMsg.green);
  }

  Self.testIfObjectDoesNotExist = function(desc, params, failMsg, passMsg) {
    console.log(desc.yellow);

    if(params) {
      console.log(failMsg.red);
      process.exit();
    }
    else
      console.log(passMsg.green);
  }

  Self.testIfAttributeExists = function(desc, object, attribute, failMsg, passMsg) {
    console.log(desc.yellow);

    if(!object[attribute]) {
      console.log(failMsg.red);
      process.exit();
    }
    else
      console.log(passMsg.green);
  }

  Self.testIfCollectionHasAttributeValue = function(desc, array, attribute, value, failMsg, passMsg) {
    console.log(desc.yellow);

    for(const i in array) {
      if(array[i][attribute] == value) {
        console.log(passMsg.green);
        return;
      }
    }

    console.log(failMsg.red);
    process.exit();
  }

  Self.testCollectDotNaveAttributeValue = function(desc, array, attribute, value, failMsg, passMsg) {
    console.log(desc.yellow);

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
