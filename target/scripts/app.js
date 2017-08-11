"use strict";

var _triangles = require("./triangles");

var triangles = _interopRequireWildcard(_triangles);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var CLOUD_COUNT = 30;
var MOUNTAIN_COUNT = 7;

var tts = require("../../node_modules/text-to-svg");
var body = void 0,
    canvas = void 0,
    ctx = void 0,
    W = void 0,
    H = void 0,
    scrollPercent = void 0,
    R = void 0,
    G = void 0,
    B = void 0;
var random = Math.random,
    abs = Math.abs,
    min = Math.min;

var clouds = [];
var mountains = [];
var sections = void 0;

function generateClouds() {
	for (var i = 0; i < CLOUD_COUNT; ++i) {
		clouds.push({
			width: (0.5 + random() / 2) * 0.5,
			height: (0.5 + random() / 2) * 0.25,
			x: random(),
			y: random(),
			z: random()
		});
		clouds.sort(function (a, b) {
			return a.z - b.z;
		});
	}
}

function moveClouds() {
	for (var i = 0, len = clouds.length; i < len; ++i) {
		var cloud = clouds[i];
		if (cloud.x + cloud.width < 0) {
			cloud.x = 1 + cloud.width;
			cloud.y = random();
			cloud.z = random();
			clouds.sort(function (a, b) {
				return a.z - b.z;
			});
		} else cloud.x -= cloud.z * 0.0025;
	}
}

function drawClouds() {
	var a = min(1, 0.95 * (1 - scrollPercent * scrollPercent) + 0.05);
	for (var i = 0, len = clouds.length; i < len; ++i) {
		var _clouds$i = clouds[i],
		    x = _clouds$i.x,
		    y = _clouds$i.y,
		    z = _clouds$i.z,
		    width = _clouds$i.width,
		    height = _clouds$i.height;

		R = ~~(63 * z) + 192;
		G = ~~(63 * z) + 192;
		B = ~~(16 * z) + 239;
		ctx.fillStyle = "rgba(" + R + "," + G + "," + B + "," + a + ")";
		var ypos = y * (H - H * scrollPercent * 0.5) - H * scrollPercent * 0.25;
		ctx.fillRect(x * W, ypos, width * z * W, height * z * W);
	}
}

function generateMountains() {
	for (var i = 0; i < MOUNTAIN_COUNT; ++i) {
		mountains.push({
			width: (0.5 + random() * 0.5) * 0.75,
			height: (0.25 + random() * 0.75) * 0.7,
			x: random(),
			y: random(),
			z: random()
		});
		mountains.sort(function (a, b) {
			return a.z - b.z;
		});
	}
}

function drawMountains() {
	if (1) {
		//scrollPercent > 0.5) {
		var hmod = H * (0.5 - scrollPercent * 0.5);
		for (var i = 0, len = mountains.length; i < len; ++i) {
			var _mountains$i = mountains[i],
			    x = _mountains$i.x,
			    z = _mountains$i.z,
			    width = _mountains$i.width,
			    height = _mountains$i.height;

			R = ~~(127 * z) + 92;
			G = ~~(127 * z) + 92;
			B = ~~(64 * z) + 192;
			ctx.beginPath();
			ctx.moveTo(x * W, H - H * height + hmod);
			ctx.lineTo((x - width / 2) * W, H + hmod);
			ctx.lineTo((x + width / 2) * W, H + hmod);
			ctx.closePath();
			ctx.fillStyle = "rgb(" + R + "," + G + "," + B + ")";
			ctx.fill();
		}
	}
}

function drawBackground() {
	var grad = ctx.createLinearGradient(W / 2, 0, W / 2, H);
	R = ~~(192 * (1 - abs(scrollPercent * 2 - 1)));
	G = 32;
	B = ~~(128 * (1 - scrollPercent)) + 64;
	grad.addColorStop(0, "rgb(" + R + "," + G + "," + B + ")");
	R = ~~(128 * (1 - scrollPercent)) + 16;
	G = ~~(239 * (1 - scrollPercent)) + 16;
	B = ~~(223 * (1 - scrollPercent)) + 32;
	grad.addColorStop(1, "rgb(" + R + "," + G + "," + B + ")");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, W, H);
}

function inView(bounds) {
	return bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth;
}

function drawHeaderBG() {
	var bounds = void 0,
	    h2 = void 0,
	    height = void 0,
	    path = void 0;
	sections.forEach(function (section) {
		bounds = section.getBoundingClientRect();
		if (inView(bounds)) {
			h2 = section.querySelector("h2");
			if (h2) {
				height = h2.clientHeight + h2.offsetHeight;
				ctx.fillStyle = "yellow";
				ctx.fillRect(0, bounds.top, W, height);
				path = section.querySelector("h2 path");
				if (path) path.style.strokeDashoffset = 0;
			}
		} else {
			path = section.querySelector("h2 path");
			if (path) path.style.strokeDashoffset = path.getTotalLength();
		}
	});
}

function animate() {
	requestAnimationFrame(animate);
	W = canvas.width = canvas.clientWidth;
	H = canvas.height = canvas.clientHeight;
	scrollPercent = body.scrollTop / (body.scrollHeight - H);
	moveClouds();
	drawBackground();
	/*
 drawMountains();
 drawClouds();
 */
	drawHeaderBG();
}

function animateLineArtPath(path) {
	var length = path.getTotalLength();
	path.style.transition = "none";
	path.style.strokeDasharray = length + " " + length;
	path.style.strokeDashoffset = length;
	path.getBoundingClientRect();
	path.style.strokeDashoffset = 0;
	path.style.transition = "stroke-dashoffset 7s ease-in-out";
}

function initHeaders(tts) {
	var text = void 0,
	    svgEl = void 0,
	    path = void 0,
	    length = void 0;
	var headers = document.querySelectorAll("section h2");
	var div = document.createElement("div");
	headers = Array.prototype.slice.apply(headers);
	headers.forEach(function (header) {
		text = header.childNodes[0].data;
		div.innerHTML = tts.getSVG(text, {
			fontSize: 128,
			y: 128
		});
		svgEl = div.childNodes[0];
		svgEl.style.overflow = "visible";
		path = svgEl.querySelector("path");
		path.style.stroke = "white"; //header.style.color;
		path.style.strokeWidth = 2;
		path.style.fill = "none";
		length = path.getTotalLength();
		path.style.strokeDasharray = length + " " + length;
		path.style.strokeDashoffset = length;
		path.style.transition = "stroke-dashoffset 7s ease-in-out";
		header.innerHTML = "";
		header.appendChild(svgEl);
		//animateLineArtPath(path);
	});
	/*
 setInterval(() => {
 	Array.prototype.slice.apply(
 		document.querySelectorAll("path")
 	).forEach(animateLineArtPath);
 }, 7000);
 */
}

function init() {
	tts.load("https://fonts.gstatic.com/s/poiretone/v4/HrI4ZJpJ3Fh0wa5ofYMK8RsxEYwM7FgeyaSgU71cLG0.woff", function (err, tts) {
		if (err) console.log(err);else initHeaders(tts);
	});
	canvas = document.getElementById("background");
	body = document.getElementsByTagName("body")[0];
	ctx = canvas.getContext("2d");
	generateClouds();
	generateMountains();
	sections = Array.prototype.slice.apply(document.querySelectorAll("header, section"));
	animate();
}

window.addEventListener("load", init);