'use strict';

// module.exports = function(){
//   return require("./config.json");
// };

module.exports = {
  "dbURI": "mongodb://localhost/sideboard",
  "sessionSecret": "supersecretprivatekey",
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": ""
  }
};
