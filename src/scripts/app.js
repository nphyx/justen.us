"use strict";
const CLOUD_COUNT = 30;
let body, canvas, ctx, W, H, scrollPercent, R, G, B;
let {random, abs, min} = Math;
let clouds = [];

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
		ctx.fillRect(x*W, y*H, width*z*W, height*z*W);
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
	drawClouds();
}

function init() {
	canvas = document.getElementById("background");
	body = document.getElementsByTagName("body")[0];
	ctx = canvas.getContext("2d");
	generateClouds();
	animate();
}

window.addEventListener("load", init);
