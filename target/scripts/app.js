"use strict";

var CLOUD_COUNT = 12;
var body = void 0,
    canvas = void 0,
    ctx = void 0,
    W = void 0,
    H = void 0,
    scrollPercent = void 0,
    R = void 0,
    G = void 0,
    B = void 0;
var random = Math.random;

var clouds = [];
var sections = void 0;
var MOVE_SPEED = 0.0005;
var FRAMECOUNT = 0;
var BROKE = false;

function generateClouds() {
	var y = 0,
	    height = 0,
	    width = 0,
	    direction = 0,
	    i = void 0,
	    yinc = 2 / CLOUD_COUNT;
	for (i = 0; i < CLOUD_COUNT; ++i) {
		height = (random() * 0.5 + 0.75) * yinc;
		width = 1.0 + random();
		direction = random() < 0.5 ? 1 : 0;
		clouds.push({
			width: width, //*0.5,
			height: height,
			x: 0.5 * random() + (direction ? -width : 0),
			y: y,
			z: random(),
			direction: direction,
			speed: 0.4 + random() * 0.6
		});
		y += height;
		if (y > 1) y -= 1;
		clouds.sort(function (a, b) {
			return a.z - b.z;
		});
	}
}

function moveClouds() {
	var i = void 0,
	    len = void 0,
	    cloud = void 0;
	for (i = 0, len = clouds.length; i < len; ++i) {
		cloud = clouds[i];
		if (cloud.x < -cloud.width || cloud.x > 1) {
			if (!cloud.direction) cloud.x = 1;else cloud.x = -cloud.width;
			clouds.sort(function (a, b) {
				return a.z - b.z;
			});
		} else cloud.x += cloud.speed * MOVE_SPEED * (cloud.direction ? 1.0 : -1.0);
	}
}

function drawClouds() {
	var a = void 0,
	    x = void 0,
	    y = void 0,
	    z = void 0,
	    width = void 0,
	    height = void 0,
	    i = void 0,
	    len = void 0,
	    ypos = void 0;
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.2)";
	ctx.shadowBlur = 20;
	ctx.shadowOffsetY = 15;
	for (i = 0, len = clouds.length; i < len; ++i) {
		a = 1;
		var _clouds$i = clouds[i];
		x = _clouds$i.x;
		y = _clouds$i.y;
		z = _clouds$i.z;
		width = _clouds$i.width;
		height = _clouds$i.height;

		R = G = B = Math.round(6 * z) * 2 + 1; //+192;
		ctx.fillStyle = "rgba(" + R + "," + G + "," + B + "," + a + ")";
		ypos = y * (H - H * scrollPercent * 0.5) - H * scrollPercent * 0.25;
		ctx.fillRect(x * W, ypos, width * W, height * W);
	}
	ctx.restore();
}

function drawBackground() {
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	ctx.fillRect(0, 0, W, H);
}

function inView(bounds) {
	return bounds.bottom > window.innerHeight * 0.2 && bounds.top < window.innerHeight * 0.8 && bounds.right > 0 && bounds.left < window.innerWidth;
}

function checkInView() {
	var sections = document.querySelectorAll("section");
	sections.forEach(function (section) {
		if (inView(section.getBoundingClientRect())) section.classList.add("in-view");else section.classList.remove("in-view");
	});
}

function animate() {
	if (!BROKE) {
		requestAnimationFrame(animate);
		try {
			FRAMECOUNT++;
			if (W !== canvas.clientWidth) W = canvas.width = canvas.clientWidth;
			if (H !== canvas.clientHeight) H = canvas.height = canvas.clientHeight;
			scrollPercent = body.scrollTop / (body.scrollHeight - H);
			moveClouds();
			drawBackground();
			drawClouds();
		} catch (e) {
			console.log(e);
			BROKE = true;
		}
	}
}

function pinHeader() {
	var box = document.querySelector("header");
	var bounds = box.getBoundingClientRect();
	if (bounds.top < 0) box.classList.add("sticky");else box.classList.remove("sticky");
}

function init() {
	canvas = document.getElementById("background");
	body = document.getElementsByTagName("body")[0];
	sections = Array.prototype.slice.apply(document.querySelectorAll("header, section"));
	ctx = canvas.getContext("2d");
	animate();
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, W, H);
	generateClouds();
	checkInView();
	pinHeader();
	window.addEventListener("scroll", function () {
		checkInView();
		pinHeader();
	});
	document.querySelector("header div.container").addEventListener("click", function (event) {
		if (event.target.tagName == "A") this.classList.remove("open");else this.classList.toggle("open");
	});
}

window.addEventListener("load", init);