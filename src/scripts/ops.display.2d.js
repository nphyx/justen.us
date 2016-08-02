"use strict";

// useful global constants
const {floor} = Math;
const AUTO_FULLSCREEN = false;
const SCALE = 1;
const LW = 4; // relative width of lines

// global variables
var screenCtx; // current rendering context
var curCtx; // current draw buffer
var tmpBuffer; // temporary draw buffer
var tmpCtx; // temporary context
var ops; // game data object
var info; // game info object
var controls; // game controls object
var body; // html document body
var gameScreen; // game screen canvas
var bufferCanvases = Array(2); // canvases for alternating draw bufferContexts
var bufferContexts = Array(2); // draw buffer contexts
var bufferMasks = Array(2); // draw buffer masks
var fullscreen = false; // whether game is in fullscreen mode
var lastFrame = new Date().getTime(); // time of last draw frame
var frameCount = 0; // running total of drawn frames
var animating = false; // whether game is currently running animation loop
var scanlinePattern;

// display state variables
var PX = 1; // pixel size
var OR = 0; // orientation (0 = landscape, 1 = portrait)
var W = 0; // screen width
var H = 0; // screen height
var BW = 0; // draw buffer width
var BH = 0; // draw buffer height
var RAY = PX; // diameter of ray blip
var PAUSE = false; // whether game is paused

// creates a color object
function color(r=0,g=0,b=0,a=1) {
	var c = Uint8Array.of(r,g,b,~~(a*255));
	c.toString = function() {
		return "rgba("+this[0]+","+this[1]+","+this[2]+","+(this[3]/255)+")";
	}
	return c;
}

// colors
const C_DARK = color(0,0,0);
const C_EMPTY = color(2,17,2,0.9);
const C_DIM = color(4,91,4);
const C_MID = color(4,127,4);
const C_BRIGHT = color(4,195,4);
const C_VBRIGHT = color(4,255,4);

/* bit types
const TYPE_R = 0; // register
const TYPE_T = 1; // target
const TYPE_H = 2; // hole
const TYPE_B = 3; // burn
const TYPE_S = 4; // short
const TYPE_G = 5; // gap
*/

const FPS = 60;
const FPS_INTERVAL = 1000/FPS;

function evenNumber(n) {
return n >> 1 << 1;
}

// nearest power of two
function npot(n) {
	var x = 1;
	if(n === 1) return n;
	n--;
	while(x < 16) {
		n |= n >> x;
		x <<= 1;
	}
	n++;
	return n;
}

// pulse and flicker effects
function pulse(a, b, seconds = 1) {
	var len = FPS*seconds;
	return {length:len, timing:[0,len/2,len],colors:[a,b,a]};
}

function flicker(a, b, c) {
	return {length:FPS, timing: [0,FPS/8,FPS/7,FPS/5,FPS/3,FPS], colors:[a, b, c, a, c, a]};
}
//const GRAD_FLICKER = flicker(C_DIM, C_MID, C_BRIGHT, 3);
const GRAD_HOLE = flicker(C_DIM, C_EMPTY, C_DARK);
const GRAD_HOLE_FILL = flicker(C_DARK, C_DIM, C_EMPTY);
const GRAD_BURN = flicker(C_BRIGHT, C_VBRIGHT, C_MID);
const GRAD_BURN_FILL = flicker(C_MID, C_BRIGHT, C_VBRIGHT);
const GRAD_SHORT = flicker(C_MID, C_BRIGHT, C_VBRIGHT);
const GRAD_TARGET = pulse(C_DIM, C_MID, 2);
const GRAD_REGISTER = pulse(C_BRIGHT, C_VBRIGHT, 2);
const GRAD_COMPLETE = pulse(C_MID, C_VBRIGHT, 0.1);

function createTextures() {
	var maskCanvas, maskCtx, scanCanvas, scanCtx, i = 0;
	var maskStyles = [
		"rgba(255,255,255,0.01)",
		"rgba(255,255,255,0.99)"
	];
	for(i = 0; i < 2; ++i) {
		maskCanvas = document.createElement("canvas");
		maskCanvas.width = 1;
		maskCanvas.height = 2;
		maskCtx = maskCanvas.getContext("2d");
		maskCtx.fillStyle = maskStyles[i];
		maskCtx.fillRect(0,0,1,1);
		maskCtx.fillStyle = maskStyles[i==1?0:1];
		maskCtx.fillRect(0,1,1,1);
		bufferMasks[i] = maskCtx.createPattern(maskCanvas, "repeat");
	}
	scanCanvas = document.createElement("canvas");
	scanCanvas.width = 1;
	scanCanvas.height = LW;
	scanCtx = scanCanvas.getContext("2d");
	var color = [C_EMPTY[0],C_EMPTY[1],C_EMPTY[2],0.4];
	scanCtx.fillStyle = "rgba("+color.join(",")+")";
	scanCtx.fillRect(0,LW-1,1,1);
	color[3] = 0.1;
	scanCtx.fillStyle = "rgba("+color.join(",")+")";
	scanCtx.fillRect(0,LW-2,1,1);
	scanCtx.fillRect(0,0,1,1);
	scanlinePattern = scanCtx.createPattern(scanCanvas, "repeat");
}

function setAliasing(ctx, state) {
	if(ctx.imageSmoothingEnabled !== undefined) {
		ctx.imageSmoothingEnabled = state;
		return;
	}
	else if(ctx.mozImageSmoothingEnabled !== undefined) {
		ctx.mozImageSmoothingEnabled = state;
	}
	else if(ctx.webkitImageSmoothingEnabled !== undefined) {
		ctx.webkitImageSmoothingEnabled = state;
	}
	else if(ctx.msImageSmoothingEnabled !== undefined) {
		ctx.msImageSmoothingEnabled = state;
	}
}

function createBuffers() {
	for(let i = 0; i < 2; ++i) {
		bufferCanvases[i] = document.createElement("canvas");
		bufferCanvases[i].width = BW;
		bufferCanvases[i].height = BH;
		bufferContexts[i] = bufferCanvases[i].getContext("2d");
	}
	tmpBuffer = document.createElement("canvas");
	tmpBuffer.width = BW;
	tmpBuffer.height = BH;
	tmpCtx = tmpBuffer.getContext("2d");
}

function lerpColor(a, b, t) {
	var lerpCol = color(0,0,0,1);
	var i = 0, len = a.length;
	for(; i < len; ++i) {
		lerpCol[i] = a[i] + t*(b[i] - a[i]);
	}
	return lerpCol;
}

// from MDN
function toggleFullScreen() {
	if(fullscreen) return;
	fullscreen = true;
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function startGame() {
	ops.startGame();
	body.removeEventListener("click", startGame);
	body.classList.remove("start");
	if(AUTO_FULLSCREEN) toggleFullScreen();
}

function pressEnter(event) {
	if(event.keyCode === 13) {
		document.removeEventListener("keyup", pressEnter);
		startGame();
	}
}

function fullscreenOff(ev) {
	ev.preventDefault();
	if(document.webkitIsFullScreen || document.mozIsFullScreen || document.msIsFullScreen) fullscreen = true;
	else fullscreen = false;
	return false;
}

function updateRatio() {
	W = evenNumber(document.body.clientWidth);
	H = evenNumber(document.body.clientHeight);
	OR = W > H?0:1;
	gameScreen.width = W;
	gameScreen.height = H;
	PX = npot((OR?W:H) / 240);
	BW = ~~(W/PX);
	BH = ~~(H/PX);
	RAY = PX*2;
	createTextures();
	createBuffers();
	console.log(PX,W,H,BW,BH);
}

function getBit(field, pos) {
	return field >> pos & 1;
}

function calcOps() {
	return (info.currentLevel.par - info.ops).toString();
}

/*
function lPad(string, len) {
	return ((" ").repeat(len)+string).slice(-len);
}

function rPad(string, len) {
	return (string+(" ").repeat(len)).slice(0, len);
}
*/
function colorAtTime(colorSet) {
	var {length, timing, colors} = colorSet, setSize = timing.length - 1;
	var offset = frameCount % length, i = 0, t, c, p, nextT, nextC; 
	for(i = 0; i < setSize; ++i) {
		t = timing[i];
		c = colors[i];
		nextT = (i < setSize)?timing[i+1]:length;
		nextC = (i < setSize)?colors[i+1]:colors[0];
		if(offset < nextT) {
			p = (nextT - offset) / (nextT - t);
			return lerpColor(c, nextC, p);
		}
	}
	//return colors[setSize];
}

function drawBorder() {
	var WMOD, HMOD;
	WMOD = BW % 2;
	HMOD = BW % 2;
	curCtx.strokeStyle = C_MID; //colorAtTime(GRAD_FLICKER).toString();
	curCtx.lineWidth = 2;
	curCtx.strokeRect(LW, LW, BW-LW*2 - WMOD, BH-LW*2 - HMOD);
}

/**
 * Draw a triangle with corners at a, b, c, stroke color, and fill color.
 * @param {vertex} a 2d vertex for first corner
 * @param {vertex} b 2d vertex for second corner
 * @param {vertex} c 2d vertex for third corner
 * @param {color|false} stroke 
 * @param {color|false} fill 
 */
function drawTriangle(a, b, c, fill) {
	curCtx.lineWidth = LW;
	curCtx.beginPath();
	curCtx.moveTo(a[0],a[1]);
	curCtx.lineTo(b[0],b[1]);
	curCtx.lineTo(c[0],c[1]);
	curCtx.fillStyle = fill.toString();
	curCtx.fill();
}

const drawButton = {
	"opAdd":function(cols, rows, size, fill) {
		var half = size/2, x = cols[1], y = rows[0],
			a = [x+LW*half, y],
			b = [x, y+LW*size],
			c = [x+LW*size, y+LW*size];
		drawTriangle(a, b, c, fill);
	},
	"opSub":function(cols, rows, size, fill) {
		var half = size/2, x = cols[1], y = rows[1],
			a = [x, y],
			b = [x+LW*half, y+LW*size],
			c = [x+LW*size, y];
		drawTriangle(a, b, c, fill);
	},
	"opLShift":function(cols, rows, size, fill) {
		var half = size/2, x = cols[0], y = rows[1],
			a = [x, y+LW*half],
			b = [x+LW*size, y+LW*size],
			c = [x+LW*size, y];
		drawTriangle(a, b, c, fill);
	},
	"opRShift":function(cols, rows, size, fill) {
		var half = size/2, x = cols[2], y = rows[1],
			a = [x, y],
			b = [x+LW*size, y+LW*half],
			c = [x, y+LW*size];
		drawTriangle(a, b, c, fill);
	},
	"opBump":function(cols, rows, size, fill) {
		var x = cols[0], y = rows[2], w = LW*size*3+LW*2, h = LW*size/2;
		curCtx.fillStyle = fill;
		curCtx.fillRect(x, y, w, h);
	}
}

function drawControls() {
	var size = (OR?6:5), fill, off = (OR?(BW+LW*size*5)/2:BW),
	    cols = [off-LW*size*4-LW*2, off-LW*size*3-LW, off-LW*size*2],
	    rows = [BH-LW*size*3-LW*3, BH-LW*size*2-LW*2, BH-LW*size-LW];
	controls.buttons.forEach((btn) => {
		if(btn.revealed && typeof(drawButton[btn.id]) !== "undefined") {
			fill = (btn.active?C_BRIGHT:C_MID);
			drawButton[btn.id](cols, rows, size, fill);
		}
	});
}

function makeScoreboardText() {
	var name = info.currentLevel.name;
	return "score:"+info.score+
	       " level:"+(info.glitched?String.fromCharCode(name):name)+
				 " ops:"+calcOps();
}

function drawScoreboard() {
	var text = makeScoreboardText(), fontSize = 8;
	curCtx.font = fontSize+"px 'Press Start 2P'";
	curCtx.fillStyle = C_MID.toString();
	curCtx.textAlign = "center";
	setAliasing(curCtx, false);
	curCtx.fillText(text, evenNumber(BW/2), LW*3+fontSize);
	setAliasing(curCtx, true);
}

function drawBitOutline(bit, xOff, yOff, bitSize, color) {
	curCtx.strokeStyle = color.toString();
	curCtx.strokeRect(xOff-LW, yOff-LW, -bitSize+LW*2, -bitSize+LW*2);
}

function drawBitFill(bit, xOff, yOff, bitSize, color) {
	curCtx.strokeStyle = color.toString();
	curCtx.strokeRect(xOff-LW*2, yOff-LW*2, -bitSize+LW*4, -bitSize+LW*4);
}

function drawBit(bit, xOff, yOff, border, bitSize) {
	var target = getBit(info.currentLevel.target, bit);
	var burn = getBit(info.currentLevel.burns, bit);
	var hole = getBit(info.currentLevel.holes, bit);
	var shorted = getBit(info.currentLevel.shorts, bit);
	var register = getBit(info.register, bit);
	var outline = C_EMPTY;
	var fill = C_EMPTY;
	var glitchMod = 0;
	curCtx.lineWidth = LW;
	curCtx.strokeStyle = border;
	// handle glitch mode
	if(info.glitched && info.complete) {
		glitchMod = (bit % 2)*2*(frameCount % (FPS/4+(bit % 2)*2) % 2?-1:1);
		curCtx.strokeStyle =  colorAtTime(GRAD_BURN);
		curCtx.fillStyle = colorAtTime(GRAD_COMPLETE);
		curCtx.fillRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
		curCtx.strokeRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
	}
	else {
		curCtx.strokeRect(xOff, yOff, -bitSize, -bitSize);
		if(register) fill = colorAtTime(GRAD_REGISTER);
		if(hole) {
			outline = colorAtTime(GRAD_HOLE);
			fill = colorAtTime(GRAD_HOLE_FILL);
		}
		else if(burn) {
			outline = colorAtTime(GRAD_BURN);
			fill = colorAtTime(GRAD_BURN_FILL);
		}
		else if(shorted) {
			outline = colorAtTime(GRAD_SHORT);
			if(register) fill = colorAtTime(GRAD_TARGET);
		}
		else if(target) {
			if(info.complete) {
				let color = colorAtTime(GRAD_COMPLETE);
				outline = fill = color;
			}
			else outline = colorAtTime(GRAD_TARGET);
		}
		if(outline !== C_EMPTY) drawBitOutline(bit, xOff, yOff, bitSize, outline);
		if(fill !== C_EMPTY) drawBitFill(bit, xOff, yOff, bitSize, fill);
	}
}

function drawGrid() {
	var bitSize = LW*5, width = info.currentLevel.width, height = info.currentLevel.height;
	var gridOffsetX = evenNumber((BW-width*bitSize)/2);
	var gridOffsetY = evenNumber((BH-height*bitSize)/2);
	var gridMaxX = bitSize*width;
	var gridMaxY = bitSize*height;
	var numBits = width*height
	var xOff = 0, yOff = 0, x = 0, y = 0;
	var border = C_MID;
	if(info.crashed) {
		border = colorAtTime(GRAD_COMPLETE);
		curCtx.strokeStyle = border;
		curCtx.fillStyle = border;
		curCtx.lineWidth = LW;
		curCtx.strokeRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
		curCtx.fillRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
	}
	else {
		if(info.complete) border = colorAtTime(GRAD_COMPLETE);
		for(var i = 0; i < numBits; ++i) {
			x = i % width;
			y = floor(i/width);
			xOff = gridOffsetX+gridMaxX - bitSize*x;
			yOff = gridOffsetY+gridMaxY - bitSize*y;
			drawBit(i, xOff, yOff, border, bitSize, 0);
		}
	}
}

function drawEffects() {
	screenCtx.fillStyle = scanlinePattern;
	screenCtx.globalCompositeOperation = "multiply";
	screenCtx.fillRect(0,0,W,H);
	screenCtx.globalCompositeOperation = "source-over";
}

function animate() {
	var now = Date.now();
	if(PAUSE) return;
	if((now - lastFrame) < FPS_INTERVAL) {
		requestAnimationFrame(animate);
		return;
	}
	info = ops.stateInfo();
	frameCount++;
	var which = ~~((frameCount)%2);
	curCtx = tmpCtx;
	curCtx.fillStyle = C_EMPTY.toString();
	curCtx.globalCompositeOperation = "source-over";
	curCtx.fillRect(0,0, BW, BH);
	drawBorder();
	drawScoreboard();
	drawGrid();
	drawControls();

	curCtx = bufferContexts[which];
	curCtx.fillStyle = bufferMasks[which];
	curCtx.fillRect(0, 0, BW, BH);
	curCtx.globalCompositeOperation = "source-in";
	curCtx.drawImage(tmpBuffer, 0, 0);

	if(SCALE) {
		setAliasing(screenCtx, false);
		screenCtx.globalCompositeOperation = "source-over";
		screenCtx.drawImage(bufferCanvases[which],0,0,W,H);
		drawEffects(which);
		setAliasing(screenCtx, true);
		screenCtx.globalCompositeOperation = "screen";
		screenCtx.drawImage(bufferCanvases[which],0,0,W,H);
	}
	else screenCtx.drawImage(bufferCanvases[which],(W-BW)/2,(H-BH)/2);
	lastFrame = now;
	requestAnimationFrame(animate);
}

export function setup() {
	body.innerHTML = "";
	body.appendChild(gameScreen);
	if(!animating) requestAnimationFrame(animate);
	animating = true;
}

export function init(env) {
	ops = env;
	controls = ops.controls;
	body = document.getElementsByTagName("body")[0];
	body.classList.add("2d");
	gameScreen = document.createElement("canvas");
	gameScreen.id = "game-screen";
	screenCtx = gameScreen.getContext("2d");
	body.addEventListener("click", startGame);
	document.addEventListener("keyup", pressEnter);
	window.addEventListener("resize", updateRatio);
	updateRatio();
	if(AUTO_FULLSCREEN) {
		body.addEventListener("click", toggleFullScreen);
		document.addEventListener("fullscreenchange", fullscreenOff);
		document.addEventListener("mozfullscreenchange", fullscreenOff);
		document.addEventListener("msfullscreenchange", fullscreenOff);
		document.addEventListener("webkitfullscreenchange", fullscreenOff);
	}
}
