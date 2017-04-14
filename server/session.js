'use strict';

var session = require("express-session");
var MongoStore = require("connect-mongo")(session);
var db = require("./database");
var config = require("./config");

module.exports = session({
  secret: config.sessionSecret,
  resave: true,
  saveUninitialized: true,
  unset: "destroy",
  store: new MongoStore({mongooseConnection: db.Mongoose.connection})
});
