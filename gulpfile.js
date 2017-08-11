"use strict";
const gulp = require("gulp");
const babel = require("gulp-babel");
const pug = require("gulp-pug");
const sass = require("gulp-sass");
const webpack = require("webpack");
const del = require("del");
const path = require("path");
const babelRegister = require("babel-core/register");
const mocha = require("gulp-mocha");
/*
var exec = require("child_process").exec;
var istanbul = require("gulp-babel-istanbul");
*/

const webpackConfig = {
	entry:path.resolve(__dirname, "target/scripts/app.js"),
	devtool:"source-map",
	output:{
		filename:"app.js",
		path:path.resolve(__dirname, "dist/scripts")
	},
	plugins:[
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.UglifyJsPlugin()
  ]
}

gulp.task("clean:scripts", function() {
	return del(["target/scripts/*", "dist/scripts/*"]);
});

gulp.task("clean:styles", function() {
	return del(["dist/styles/*"]);
});

gulp.task("clean:markup", function() {
	return del(["dist/*.html"]);
});

gulp.task("scripts", ["clean:scripts"], function() {
	return gulp.src(["src/scripts/*js"])
	.pipe(babel())
	.pipe(gulp.dest("target/scripts/"));
});

gulp.task("markup", ["clean:markup"], function() {
	return gulp.src(["src/markup/*pug"])
	.pipe(pug())
	.pipe(gulp.dest("dist"))
});

gulp.task("styles", ["clean:styles"], function() {
	return gulp.src(["src/styles/*scss"])
	.pipe(sass().on("error", sass.logError))
	.pipe(gulp.dest("dist/styles/"))
});

gulp.task("webpack", ["scripts", "markup", "styles"], function(callback) {
	webpack(webpackConfig, function(err) {
		if(err) console.log(err);
		callback();
	});
});

gulp.task("test", function() {
	return gulp.src(["test/*.js"])
	.pipe(mocha({
		bail:true,
		compilers: {
		js:babelRegister
		}
	}));
});

gulp.task("default", ["webpack"]);
