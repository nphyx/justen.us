"use strict";
const CLOUD_COUNT = 30;
const MOUNTAIN_COUNT = 7;
let body, canvas, ctx, W, H, scrollPercent, R, G, B;
let {random, abs, min} = Math;
let clouds = [];
let mountains = [];

function generateClouds() {
	for(let i = 0; i < CLOUD_COUNT; ++i) {
		clouds.push({
			width:(0.5+(random()/2))*0.5,
			height:(0.5+(random()/2))*0.25,
			x:random(),
			y:random(),
			z:random(),
		});
		clouds.sort((a, b) => a.z - b.z);
	}
}

function moveClouds() {
	for(let i = 0, len = clouds.length; i < len; ++i) {
		let cloud = clouds[i];
		if(cloud.x + cloud.width < 0) {
			cloud.x = 1+cloud.width;
			cloud.y = random();
			cloud.z = random();
			clouds.sort((a, b) => a.z - b.z);
		}
		else cloud.x -= cloud.z*0.0025;
	}
}

function drawClouds() {
	let a = min(1, 0.95*(1-(scrollPercent*scrollPercent))+0.05);
	for(let i = 0, len = clouds.length; i < len; ++i) {
		let {x, y, z, width, height} = clouds[i];
		R = ~~(63*z)+192;
		G = ~~(63*z)+192;
		B = ~~(16*z)+239;
		ctx.fillStyle = "rgba("+R+","+G+","+B+","+a+")";
		let ypos = y * (
			H - (H*scrollPercent*0.5)
		) - H*scrollPercent*0.25;
		ctx.fillRect(x*W, ypos, width*z*W, height*z*W);
	}
}

function generateMountains() {
	for(let i = 0; i < MOUNTAIN_COUNT; ++i) {
		mountains.push({
			width:(0.5+(random()/2)),
			height:(0.5+(random()/2))*0.3,
			x:random(),
			y:random(),
			z:random(),
		});
		mountains.sort((a, b) => a.z - b.z);
	}
}

function drawMountains() {
	if(1) { //scrollPercent > 0.5) {
		let hmod = H*(0.5-(scrollPercent*0.5));
		for(let i = 0, len = mountains.length; i < len; ++i) {
			let {x, y, z, width, height} = mountains[i];
			R = ~~(127*z)+92;
			G = ~~(127*z)+92;
			B = ~~(64*z)+192;
			ctx.beginPath();
			ctx.moveTo(x*W, H-(H*height)+hmod);
			ctx.lineTo((x-(width/2))*W,H+hmod);
			ctx.lineTo((x+(width/2))*W,H+hmod);
			ctx.closePath();
			ctx.fillStyle = "rgb("+R+","+G+","+B+")";
			ctx.fill();
		}
	}
}

function drawBackground() {
	let grad = ctx.createLinearGradient(W/2, 0, W/2, H);
	R = ~~(192*(1-abs((scrollPercent*2)-1)));
	G = 32;
	B = ~~(128*(1-scrollPercent))+64;
	grad.addColorStop(0, "rgb("+R+","+G+","+B+")");
	R = ~~(128*(1-scrollPercent))+16;
	G = ~~(239*(1-scrollPercent))+16;
	B = ~~(223*(1-scrollPercent))+32;
	grad.addColorStop(1, "rgb("+R+","+G+","+B+")");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, W, H);
}

function animate() {
	requestAnimationFrame(animate);
	W = canvas.width = canvas.clientWidth;
	H = canvas.height = canvas.clientHeight;
	scrollPercent = body.scrollTop/(body.scrollHeight-H);
	moveClouds();
	drawBackground();
	drawMountains();
	drawClouds();
}

function init() {
	canvas = document.getElementById("background");
	body = document.getElementsByTagName("body")[0];
	ctx = canvas.getContext("2d");
	generateClouds();
	generateMountains();
	animate();
}

window.addEventListener("load", init);
