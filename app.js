"use strict";
var express = require("express");
var babelify = require("express-babelify-middleware");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("express-bunyan-logger")({
	name:"justen.us",
	streams: [{
		level:"error",
		path:"log/error.log"
	}]
});
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var lex = require("letsencrypt-express");
var sassMiddleware = require("node-sass-middleware");

var routes = require("./routes/index");
var users = require("./routes/users");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(logger);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
    src: path.join(__dirname, "src"),
    dest: path.join(__dirname, "public"),
    debug: true,
    outputStyle: "compressed",
    prefix:  ""
}));
app.use("/scripts", babelify(
	path.join(__dirname, "src/scripts"), {}, {
		presets:["es2015"],
		plugins:[["transform-runtime", {"regenerator":true,"polyfill":true}]] 
	})
);
app.use(express.static(path.join(__dirname, "public")));


app.use("/", routes);
app.use("/users", users);

app.get("/ops", function(req, res) {
	res.render("ops");
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {}
  });
});


module.exports = app;
