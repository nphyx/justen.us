"use strict";
/* global vec3 */
/* global ShaderManager */
/* global requestAnimFrame */
/* global Voctopus */
/* global VoctopusSchemas */
/* global console */

var gl, sm;
var renderMode;
var offset = -10;
var ticksPerSecond = 4;
var tickInterval = 1000/ticksPerSecond;
var lastTime = 0;
var lastTick = 0;
var offset = -10;
var capturing = false;

var canvasBuffer, canvasVertexAttribLocation; // buffer for our two triangles that serve as the shader canvas
var glClearColor = [0.0, 0.0, 0.0, 1.0];
//var skyColor = [0.31, 0.37, 0.67, 1.0];
var skyColor = [0.0, 0.0, 0.0, 1.0];
var ambientColor = [0.15, 0.2, 0.32, 1.0];

var u_eye = [0, 1, -2];
var u_camUp = [0, 1, 0];
var u_camRight = [1, 0, 0];
var u_camForward;
var u_light0Position = [0, 4, 0];
var u_light0Color = [0.67, 0.87, 0.93, 1.0];
var horizontalAngle = 0.0;
var verticalAngle = 0.0;

var materials = [
	0.0, 0.0, 0.0, 0.0,
	1.0, 0.0, 0.0, 1.0,
	0.0, 1.0, 0.0, 1.0,
	0.0, 0.0, 1.0, 1.0,

	1.0, 1.0, 0.0, 1.0,
	0.0, 1.0, 1.0, 1.0,
	1.0, 0.0, 1.0, 1.0
];

var canvasMaterials = [
];

var octreeTexture;
var octreeDepth = 7;
var octreeExtents = Math.pow(2, octreeDepth-1);
var octreeMap, rawMap;
var octree = new Voctopus(octreeDepth, VoctopusSchemas.voctantI8M);
console.log("Total voxels in octree:", Math.pow(octreeExtents, 3));

var utilCanvasElement = document.getElementById("utilCanvas");
var utilCanvas = utilCanvasElement.getContext("2d");

var matNeutral = utilCanvas.createImageData(1,1);
matNeutral.data[0] = 128;
matNeutral.data[1] = 128;
matNeutral.data[2] = 128;
matNeutral.data[3] = 255;

var rawMapCanvasElement = document.getElementById("rawMap");
var rawMap = rawMapCanvasElement.getContext("2d");

var octreeMapCanvasElement = document.getElementById("octreeMap");
var octreeMap = octreeMapCanvasElement.getContext("2d");
octreeMapCanvasElement.width = octreeExtents*8; 
octreeMapCanvasElement.height = Math.pow(octreeExtents, 3)/octreeMapCanvasElement.width;

/**
 * Converts raw materials array to canvas RGBA imageData
 */
function initCanvasMaterials() {
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
 * Creates a texture out of raw ArrayBuffer data.
 * @param data an array buffer
 */
function createTexture(data) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, data.byteLength, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(data));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	// avoid mipmapping
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	// Prevents s-coordinate wrapping (repeating).
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	// Prevents t-coordinate wrapping (repeating).
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return texture;
}


function initGL(canvas) {
	try {
		gl = canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
		gl.clearColor.apply(gl, glClearColor);
		renderMode = gl.TRIANGLES;
	}
	catch (e) {}
	if (!gl) alert("Could not initialise WebGL, sorry :-(");
}

function initOctree() {
	var mid, x, y, z, mat;
	mid = octreeExtents/4;
	console.log("mid", mid);
	var time = new Date().getTime();
	for(y = 0; y < octreeExtents; y++) {
		mat = (y%(canvasMaterials.length-1))+1;
		for(x = 0; x < octreeExtents; x++) {
			for(z = 0; z < octreeExtents; z++) {
				if((z < mid+y && z > mid-y) && (x < mid+y && x > mid-y)) {
					octree.setVoxel([x,y,z], {material:mat});
				}
			}
		}
	}
	console.log("Octree initialization took ", new Date().getTime() - time, "ms"); 
}

function initRawMap() {
	var x, len, raw, dim;
	var canvas = rawMapCanvasElement;
	raw = new Uint8Array(octree.buffer);
	len = raw.byteLength;
	// let's make the map squareish
	dim = Math.round(Math.sqrt(raw.byteLength));
	// align the columns with the octant length
	dim = Math.ceil(dim / octree.octantSize) * octree.octantSize; 
	canvas.width = canvas.height = dim;
	rawMap.clearRect(0, 0, canvas.width, canvas.height);
	for(x = 0; x < len; x+=1) {
		if(x%octree.octantSize === 0) {
			rawMap.putImageData(canvasMaterials[raw[x]], (x%canvas.width), Math.floor(x/canvas.width)%canvas.width);
		}
		else rawMap.putImageData(matNeutral, (x%canvas.width), Math.floor(x/canvas.width)%canvas.width);
	}
}

function initOctreeMap() {
	var x, y, z, vox, xOff = 0, zOff = 0;
	// next power of 2 to fit size
	var canvas = octreeMapCanvasElement;
	var time = new Date().getTime();
	octreeMap.clearRect(0, 0, canvas.width, canvas.height);
	for(y = 0; y < octreeExtents; y++) {
		for(x = 0; x < octreeExtents; x++) {
			for(z = 0; z < octreeExtents; z++) {
				vox = octree.getVoxel([x,y,z]);
				octreeMap.putImageData(canvasMaterials[vox[0]], x+xOff, z+zOff);
			}
		}
		xOff += octreeExtents;
		if(xOff > canvas.width) {
			xOff = 0; 
			zOff += octreeExtents;
		}
		if(zOff > canvas.height) break; 
	}
	console.log("OctreeMap initialization took ", (new Date().getTime() - time), "ms"); 
}

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

var mouseSpeedX = null;
var mouseSpeedY = null;

function handleMouseMove(event) {
	if(!capturing) {
		mouseSpeedX = mouseSpeedY = 0;
		return;
	}
	var mouseX = event.clientX;
	var mouseY = event.clientY;

	var rect = document.getElementById("voctworks").getBoundingClientRect();
	var dx = mouseX - (rect.left + rect.width / 2);
	var dy = mouseY - (rect.top + rect.height / 2);

	mouseSpeedX = dx * 0.00005;
	mouseSpeedY = dy * 0.00005;
}

var currentKeys = {};

function handleKeyDown(event) {
	currentKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
	currentKeys[event.keyCode] = false;
}


function handleInput() {
	var moveSpeed = 0.05;
	if(currentKeys[27]) capturing = false;
	if(!capturing) return;
	if(currentKeys[87]) { // Forward
		u_eye[0] += u_camForward[0] * moveSpeed;
		u_eye[1] += u_camForward[1] * moveSpeed;
		u_eye[2] += u_camForward[2] * moveSpeed;
	} else if(currentKeys[83]) { // Backward
		u_eye[0] -= u_camForward[0] * moveSpeed;
		u_eye[1] -= u_camForward[1] * moveSpeed;
		u_eye[2] -= u_camForward[2] * moveSpeed;
	}

	if(currentKeys[68]) { // Right
		u_eye[0] += u_camRight[0] * moveSpeed;
		u_eye[1] += u_camRight[1] * moveSpeed;
		u_eye[2] += u_camRight[2] * moveSpeed;
	} else if(currentKeys[65]) { // Left
		u_eye[0] -= u_camRight[0] * moveSpeed;
		u_eye[1] -= u_camRight[1] * moveSpeed;
		u_eye[2] -= u_camRight[2] * moveSpeed;
	}

	if(currentKeys[37]) { // Arrow left
		u_light0Position[0] -= u_camRight[0] * moveSpeed;
		u_light0Position[1] -= u_camRight[1] * moveSpeed;
		u_light0Position[2] -= u_camRight[2] * moveSpeed;
	} else if(currentKeys[39]) { // Arrow right
		u_light0Position[0] += u_camRight[0] * moveSpeed;
		u_light0Position[1] += u_camRight[1] * moveSpeed;
		u_light0Position[2] += u_camRight[2] * moveSpeed;
	}

	if(currentKeys[38]) { // Arrow up
		u_light0Position[0] += u_camUp[0] * moveSpeed;
		u_light0Position[1] += u_camUp[1] * moveSpeed;
		u_light0Position[2] += u_camUp[2] * moveSpeed;
	} else if(currentKeys[40]) { // Arrow down
		u_light0Position[0] -= u_camUp[0] * moveSpeed;
		u_light0Position[1] -= u_camUp[1] * moveSpeed;
		u_light0Position[2] -= u_camUp[2] * moveSpeed;
	}
}

function updateCamera() {
	horizontalAngle += mouseSpeedX;
	verticalAngle += mouseSpeedY;

	if(horizontalAngle > 2.0 * Math.PI)
		horizontalAngle -= 2.0 * Math.PI;
	else if(horizontalAngle < 0.0)
		horizontalAngle += 2.0 * Math.PI;

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

function drawScene() {
	handleInput();
	updateCamera();
	updateUniforms();
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function doTickStuff(lastTick, delta) {
	console.log(lastTick, delta); 
	return 0;
}

/**
 * Animating stuff
 */
function animate() {
	var delta, elapsed, timeNow;
	timeNow = new Date().getTime();
	if(lastTime === 0 || lastTick === 0) {
		lastTime = lastTick = timeNow; 
		return;
	}
	else {delta = timeNow - lastTick; elapsed = timeNow - lastTime;}
	//tick approximately (ticksPerSecond) times per second, and catch up if you fell behind
	while(delta >= 100) {
		doTickStuff(lastTick, delta);
		offset++;
		delta = delta - tickInterval;
		lastTick = timeNow;
	}
	lastTime = timeNow;
}

function tick() {
	requestAnimFrame(tick);
	animate();
	drawScene();
}

/**
 * Initializes webgl stuffs
 */
function webGLStart() {
	console.log("starting webgl");
	initGL(document.getElementById("webgl"));
	var shaderList = [
		{url:"/shaders/fs/main.c", type:gl.FRAGMENT_SHADER},
		{url:"/shaders/vs/main.c", type:gl.VERTEX_SHADER}
	];
	sm = new ShaderManager(gl, shaderList, function() {
		console.log("shader manager callback");
		gl.linkProgram(sm.program);
		if (!gl.getProgramParameter(sm.program, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}
		gl.useProgram(sm.program);
		sm.program.vertexPositionAttribute = gl.getAttribLocation(sm.program, "aVertexPosition");
		initCanvasMaterials();
		initOctree();
		initOctreeMap();
		initRawMap();
		initBuffers();
		initCamera();
		initUniforms();
		octreeTexture = createTexture(octree.buffer);
		tick();
	});
	document.getElementById("voctworks").onclick = function() {
		capturing = true;
	}
	window.addEventListener("keydown", function(e) {
		// space and arrow keys
		if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1 && capturing) {
			e.preventDefault();
		}
	}, false);
	document.onmousemove = handleMouseMove;
	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;
}
window.onload = function() {webGLStart();}
