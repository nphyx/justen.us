"use strict";
/* global glMatrix */
const ShaderManager = require("./voctworks.ShaderManager.js");
const vec3 = require("./gl-matrix-min.js").vec3;
const bgID = "background";
const mouseMultiplier = 0.00003;

let gl, sm, renderMode, glCanvasElement, utilCanvas;
let offset = -10;
let ticksPerSecond = 4;
let tickInterval = 1000/ticksPerSecond;
let lastTime = 0;
let lastTick = 0;
let capturing = false;
const currentKeys = {}

const color1 = [11,19,43,1];
const color2 = [28,37,65,1];
const color3 = [50,80,107,1];
const color4 = [91,192,120,1];
const color5 = [112,255,253,1];

let canvasBuffer, canvasVertexAttribLocation; // buffer for our two triangles that serve as the shader canvas

let u_eye = [0, 1, -2];
let u_camUp = [0, 1, 0];
let u_camRight = [1, 0, 0];
let u_camForward;
let u_light0PositionRel = [0, 4, 0];
let u_light0Position = [0, 4, 0];
let u_light0Color = [0.67, 0.87, 0.93, 1.0];
let horizontalAngle = 0.0;
let verticalAngle = 0.0;

var mouseSpeedX = null;
var mouseSpeedY = null;

function rgbaConvert(rgba) {
	return [rgba[0]/256, rgba[1]/256, rgba[2]/256, rgba[3]];
}

const materials = [].concat.apply([], [color1,color2,color3,color4,color5].map((a) => rgbaConvert(a))); 
const glClearColor = rgbaConvert(color1);
const skyColor = rgbaConvert(color1);
const ambientColor = rgbaConvert(color2);


let canvasMaterials = [
];

function initBuffers() {
	// set up canvas triangle locations
  canvasBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, canvasBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER, 
    new Float32Array([
      -1.0, -1.0, 
       1.0, -1.0, 
      -1.0,  1.0, 
      -1.0,  1.0, 
       1.0, -1.0, 
       1.0,  1.0]), 
    gl.STATIC_DRAW
  );
	canvasVertexAttribLocation = gl.getAttribLocation(sm.program, "a_position");
	gl.enableVertexAttribArray(canvasVertexAttribLocation);
	gl.vertexAttribPointer(canvasVertexAttribLocation, 2, gl.FLOAT, false, 0, 0);
}

function initUniforms() {
	// set up uniforms
	sm.program.resolutionUniform = gl.getUniformLocation(sm.program, "u_resolution");
	sm.program.camUpUniform = gl.getUniformLocation(sm.program, "u_camUp");
	sm.program.camRightUniform = gl.getUniformLocation(sm.program, "u_camRight");
	sm.program.camForwardUniform = gl.getUniformLocation(sm.program, "u_camForward");
	sm.program.eyeUniform = gl.getUniformLocation(sm.program, "u_eye");
	sm.program.light0PositionUniform = gl.getUniformLocation(sm.program, "u_light0Position");
	sm.program.light0ColorUniform = gl.getUniformLocation(sm.program, "u_light0Color");
	sm.program.materials = gl.getUniformLocation(sm.program, "u_materials");
	sm.program.materialMax = gl.getUniformLocation(sm.program, "u_materialMax");
	sm.program.skyColor = gl.getUniformLocation(sm.program, "u_sky");
	sm.program.ambientColor = gl.getUniformLocation(sm.program, "u_ambient");
	gl.uniform1i(sm.program.materialMax, materials.length/4);
	gl.uniform4fv(sm.program.materials, materials);
}

function updateUniforms() {
	gl.uniform2f(sm.program.resolutionUniform, gl.viewportWidth, gl.viewportHeight);
	gl.uniform3f(sm.program.camUpUniform, u_camUp[0], u_camUp[1], u_camUp[2]);
	gl.uniform3f(sm.program.camRightUniform, u_camRight[0], u_camRight[1], u_camRight[2]);
	gl.uniform3f(sm.program.camForwardUniform, u_camForward[0], u_camForward[1], u_camForward[2]);
	gl.uniform3f(sm.program.eyeUniform, u_eye[0], u_eye[1], u_eye[2]);
	gl.uniform3f(sm.program.light0PositionUniform, u_light0Position[0], u_light0Position[1], u_light0Position[2]);
	gl.uniform4f(sm.program.light0ColorUniform, u_light0Color[0], u_light0Color[1], u_light0Color[2], u_light0Color[3]);
	gl.uniform4f(sm.program.skyColor, skyColor[0], skyColor[1], skyColor[2], skyColor[3]);
	gl.uniform4f(sm.program.ambientColor, ambientColor[0], ambientColor[1], ambientColor[2], ambientColor[3]);
}

function initCamera() {
	u_eye = [0, 1, -2];
	u_camUp = [0, 1, 0];
	u_camRight = [1, 0, 0];
	u_camForward = vec3.create();
	vec3.cross(u_camForward, u_camRight, u_camUp);
	vec3.normalize(u_camForward, u_camForward);
}

function handleMouseMove(event) {
/*
	if(!capturing) {
		mouseSpeedX = mouseSpeedY = 0;
		return;
	}
*/
	var mouseX = event.clientX;
	var mouseY = event.clientY;

	var rect = document.getElementById(bgID).getBoundingClientRect();
	var dx = mouseX - (rect.left + rect.width / 2);
	var dy = mouseY - (rect.top + rect.height / 2);

	mouseSpeedX = dx * mouseMultiplier;
	mouseSpeedY = dy * mouseMultiplier;
}


function updateCamera() {
	horizontalAngle += mouseSpeedX;
	verticalAngle += mouseSpeedY;

	if(horizontalAngle > 2.0 * Math.PI)
		horizontalAngle += 2.0 * Math.PI;
	else if(horizontalAngle < 0.0)
		horizontalAngle -= 2.0 * Math.PI;

	if(verticalAngle > 2.0 * Math.PI)
		verticalAngle -= 2.0 * Math.PI;
	else if(verticalAngle < 0.0)
		verticalAngle += 2.0 * Math.PI;

	// Update camera vectors
	var sintheta = Math.sin(horizontalAngle);
	var costheta = Math.cos(horizontalAngle);
	var sinphi = Math.sin(verticalAngle);
	var cosphi = Math.cos(verticalAngle);
	u_camForward = [cosphi * sintheta, -sinphi, cosphi * costheta];
	u_camRight = [costheta, 0.0, -sintheta];
	vec3.cross(u_camUp, u_camForward, u_camRight);
	vec3.normalize(u_camUp, u_camUp);
}

/**
 * Converts raw materials array to canvas RGBA imageData
 */
function initCanvasMaterials(utilCanvas) {
	var i, imageData, offset, n;
	var len = materials.length/4;
	for(i = 0; i < len; i++) {
		imageData = utilCanvas.createImageData(1,1);
		offset = 4*i;
		for(n = 0; n < 4; n++) imageData.data[n] = Math.floor(256*materials[offset+n]);
		canvasMaterials.push(imageData);
	}
}

/**
 * Initializes GL context
 */
function initGL(canvas, err=function(){}, res=function(){}) {
	try {
		gl = canvas.getContext("experimental-webgl");
		gl.clearColor.apply(gl, glClearColor);
		renderMode = gl.TRIANGLES;
	}
	catch (e) {}
	if (!gl) return err();
	res(gl);
}

function handleKeyDown(event) {
	currentKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
	currentKeys[event.keyCode] = false;
}

function handleInput() {
	var moveSpeed = 0.05;
	if(currentKeys[27]) capturing = false;
	//if(!capturing) return;
	if(currentKeys[87]) { // Forward
		u_eye.forEach((el, i, arr) => {
			u_eye[i] += u_camForward[i] * moveSpeed;
			u_light0Position[i] = u_eye[i] + u_light0PositionRel[i];
		});
	}
	if(currentKeys[83]) { // Backward
		u_eye.forEach((el, i, arr) => {
			u_eye[i] -= u_camForward[i] * moveSpeed;
			u_light0Position[i] = u_eye[i] + u_light0PositionRel[i];
		});
	}

	if(currentKeys[68]) { // Right
		u_eye.forEach((el, i, arr) => {
			u_eye[i] += u_camRight[i] * moveSpeed;
			u_light0Position[i] = u_eye[i] + u_light0PositionRel[i];
		});
	} 

	if(currentKeys[65]) { // Left
		u_eye.forEach((el, i, arr) => {
			u_eye[i] -= u_camRight[i] * moveSpeed;
			u_light0Position[i] = u_eye[i] + u_light0PositionRel[i];
		});
	}

	if(currentKeys[37]) { // Arrow left
		u_light0Position.forEach((el, i, arr) => {
			u_light0PositionRel[i] -= u_camRight[i] * moveSpeed;
		});
	} 

	if(currentKeys[39]) { // Arrow right
		u_light0Position.forEach((el, i, arr) => {
			u_light0PositionRel[i] += u_camRight[i] * moveSpeed;
		});
	}

	if(currentKeys[38]) { // Arrow up
		u_light0Position.forEach((el, i, arr) => {
			u_light0PositionRel[i] += u_camUp[i] * moveSpeed;
		});
	} 

	if(currentKeys[40]) { // Arrow down
		u_light0Position.forEach((el, i, arr) => {
			u_light0PositionRel[i] -= u_camUp[i] * moveSpeed;
		});
	}
}

function drawScene() {
	handleInput();
	updateCamera();
	updateUniforms();
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * Resize canvas to background size, then update viewport.
 */
function resizeCanvas() {
	let background = document.getElementById("background");
	glCanvasElement.width = background.clientWidth;
	glCanvasElement.height = background.clientHeight;
	gl.viewportWidth = glCanvasElement.width;
	gl.viewportHeight = glCanvasElement.height;
}

/**
 * Animating stuff
 */
function animate() {
	let delta, elapsed, timeNow;
	timeNow = new Date().getTime();
	if(lastTime === 0 || lastTick === 0) {
		lastTime = lastTick = timeNow; 
		return;
	}
	else {delta = timeNow - lastTick; elapsed = timeNow - lastTime;}
	//tick approximately (ticksPerSecond) times per second, and catch up if you fell behind
	while(delta >= 100) {
		offset++;
		delta = delta - tickInterval;
		lastTick = timeNow;
	}
	lastTime = timeNow;
}

function tick() {
	requestAnimationFrame(tick);
	animate();
	drawScene();
}

function shadersDone() {
	console.log("shader manager callback");
	gl.linkProgram(sm.program);
	if (!gl.getProgramParameter(sm.program, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}
	gl.useProgram(sm.program);
	sm.program.vertexPositionAttribute = gl.getAttribLocation(sm.program, "aVertexPosition");
	//initCanvasMaterials();
	document.addEventListener("mousemove", handleMouseMove);
	document.addEventListener("keyup", handleKeyUp);
	document.addEventListener("keydown", handleKeyDown);

	initBuffers();
	initCamera();
	initUniforms();
	resizeCanvas();
	tick();
}

window.addEventListener("load", function() {
	console.log("loaded");
	var utilCanvasElement = document.getElementById("utilCanvas");
	utilCanvas = utilCanvasElement.getContext("2d");

	glCanvasElement = document.getElementById("webglCanvas");
	initGL(glCanvasElement, 
		() => console.log("Could not initialise WebGL, sorry :-("),
		(gl) => {
			console.log("GL Initialized.")
			sm = new ShaderManager(gl, [
				{url:"/shaders/fs/main.c", type:gl.FRAGMENT_SHADER},
				{url:"/shaders/vs/main.c", type:gl.VERTEX_SHADER}
			], shadersDone); 
		}
	);

	window.addEventListener("resize", resizeCanvas);
});
