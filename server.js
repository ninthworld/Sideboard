'use strict';

// Dependencies
var express = require("express");
var app = express();
var path = require("path");
var bodyParser = require("body-parser");
var flash = require("connect-flash");

// App Components
var routes = require("./app/routes");
var session = require("./app/session");
var passport = require("./app/auth")();
var ioServer = require("./app/socket")(app);
var logger = require("./app/logger");

// Port
var port = process.env.PORT || 8080;

// View engine
app.set("views", path.join(__dirname, "app/views"));
app.set("view engine", "ejs");

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static("public"));
app.use(logger);

app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Attach routes
app.use("/", routes);

// Start server
ioServer.listen(port);
console.log("Server running on port " + port);
