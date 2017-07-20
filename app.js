"use strict";
var express = require("express");
var babelify = require("express-babelify-middleware");
var path = require("path");
var logger = require("express-bunyan-logger")({
	name:"justen.us",
	streams: [{
		level:"error",
		path:"log/error.log"
	}]
});
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var sassMiddleware = require("node-sass-middleware");

var routes = require("./routes/index");
var users = require("./routes/users");

var app = express();

var browserifyOptions = {
	precompile:false,
	minify:false,
	gzip:true,
	debug:true,
	cache:false,
	production:{
		precompile:true,
		minify:true,
		gzip:true,
		debug:true
	},
	development:{
		precompile:true,
		minify:true,
		gzip:true,
		debug:true
	}
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

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
	path.join(__dirname, "src/scripts"), 
	browserifyOptions,
	{
		presets:["es2015"],
		plugins:[["transform-runtime", {"regenerator":true,"polyfill":true}]] 
	}
));
app.use(express.static(path.join(__dirname, "public")));


app.use("/", routes);
app.use("/users", users);

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
