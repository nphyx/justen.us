"use strict";
const CLOUD_COUNT = 16;
let body, canvas, ctx, W, H, scrollPercent, R, G, B;
let {random} = Math;
let clouds = [];
let sections;
let MOVE_SPEED = 0.0005;
let FRAMECOUNT = 0;

function generateClouds() {
	let y = 0, height = 0, width = 0, direction = 0;
	let yinc = 2/CLOUD_COUNT;
	for(let i = 0; i < CLOUD_COUNT; ++i) {
		height = (random() + 0.75) * yinc;
		width = (1.75+random());
		direction = (random() < 0.5?1:0);
		clouds.push({
			width:width,//*0.5,
			height:height,
			x:(0.5*random())+(direction?-width:0),
			y:y,
			z:random(),
			direction:direction
		});
		y += height;
		if(y > 1) y -= 1;
		clouds.sort((a, b) => a.z - b.z);
	}
}

function moveClouds() {
	for(let i = 0, len = clouds.length; i < len; ++i) {
		let cloud = clouds[i];
		if((cloud.x < -cloud.width) || cloud.x > 1) {
			if(!cloud.direction) cloud.x = 1;
			else cloud.x = -cloud.width;
			/*
			cloud.y = random();
			cloud.z = random();
			*/
			clouds.sort((a, b) => a.z - b.z);
		}
		else cloud.x += cloud.z*MOVE_SPEED*(cloud.direction?1.0:-1.0);
	}
}

function drawClouds() {
	for(let i = 0, len = clouds.length; i < len; ++i) {
		let a = 1; //0.75 + (0.25*Math.sin((FRAMECOUNT/25)+i)) + (0.25*Math.cos((FRAMECOUNT/30)+i));
		let {x, y, z, width, height} = clouds[i];
		R = G = B = Math.round(6*z)+3;//+192;
		ctx.fillStyle = "rgba("+R+","+G+","+B+","+a+")";
		let ypos = y * (
			H - (H*scrollPercent*0.5)
		) - H*scrollPercent*0.25;
		//ctx.fillRect(x*W, ypos, width*z*W, height*z*W);
		ctx.fillRect(x*W, ypos, width*W, height*W);
	}
}

function drawBackground() {
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	ctx.fillRect(0, 0, W, H);
}

function inView(bounds) {
	return (
		(bounds.bottom > 0 && bounds.top < window.innerHeight) &&
		(bounds.right > 0 && bounds.left < window.innerWidth)
	);
}

function animateHeaders() {
	let bounds, h2, path;
	sections.forEach((section) => {
		bounds = section.getBoundingClientRect();
		if(inView(bounds)) {
			h2 = section.querySelector("h2");
			if(h2) {
				path = section.querySelector("h2 path");
				if(path) path.style.strokeDashoffset = 0;
			}
		}
		else {
			path = section.querySelector("h2 path");
			if(path) path.style.strokeDashoffset = path.getTotalLength();
		}
	});
}

function animate() {
	let broken = false;
	try {
		FRAMECOUNT++;
		W = canvas.width = canvas.clientWidth;
		H = canvas.height = canvas.clientHeight;
		scrollPercent = body.scrollTop/(body.scrollHeight-H);
		moveClouds();
		drawBackground();
		drawClouds();
		animateHeaders();
	}
	catch(e) {
		console.log(e);
		broken = true;
	}
	if(!broken) requestAnimationFrame(animate);
}

function pinHeader() {
	let box = document.querySelector("header");
	let bounds = box.getBoundingClientRect();
	if(bounds.top < 0) box.classList.add("sticky");
	else box.classList.remove("sticky");
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
	pinHeader();
	window.addEventListener("scroll", pinHeader);
	document.querySelector("header div.container").addEventListener("click", function() {
		if(event.target.tagName == "A") this.classList.remove("open");
		else this.classList.toggle("open");
	});
}

window.addEventListener("load", init);

