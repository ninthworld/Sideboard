'use strict';

// Dependencies
var express = require("express");
var app = express();
var path = require("path");
var bodyParser = require("body-parser");
var flash = require("connect-flash");

// App Components
var routes = require("./server/routes");
var session = require("./server/session");
var passport = require("./server/auth")();
var ioServer = require("./server/socket")(app);
var logger = require("./server/logger");

// Port
var port = process.env.PORT || 8080;

// View engine
app.set("views", path.join(__dirname, "server/views"));
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
