"use strict";
const AUTO_FULLSCREEN = false;
const FLIPTIME = 100;
var PAUSE = false;
function color(r=0,g=0,b=0,a=1) {
	var c = Uint8Array.of(r,g,b,~~(a*255));
	c.toString = function() {
		return "rgba("+this[0]+","+this[1]+","+this[2]+","+(this[3]/255)+")";
	}
	return c;
}
// colors
const C_DARK = color(0,0,0);
const C_EMPTY = color(2,17,2,0.1);
const C_DIM = color(4,91,4);
const C_MID = color(4,127,4);
const C_BRIGHT = color(4,195,4);
const C_VBRIGHT = color(4,255,4);
const C_INTER_A = color(C_VBRIGHT[0],C_VBRIGHT[1],C_VBRIGHT[2],0.7);
const C_INTER_B = color(C_EMPTY[0],C_EMPTY[1],C_EMPTY[2],0.2);

// bit types
const TYPE_R = 0; // register
const TYPE_T = 1; // target
const TYPE_H = 2; // hole
const TYPE_B = 3; // burn
const TYPE_S = 4; // short
const TYPE_G = 5; // gap

const LINE_WIDTH = 2; // relative width of lines

const FPS = 60;
const FPS_INTERVAL = 1000/FPS;

function evenNumber(n) {
return n >> 1 << 1;
}

function pulse(a, b, seconds = 1) {
	var len = FPS*seconds;
	return {length:len, timing:[0,len/2,len],colors:[a,b,a]};
}

function flicker(a, b, c, seconds = 1) {
	return {length:FPS, timing: [0,FPS/8,FPS/7,FPS/5,FPS/3,FPS], colors:[a, b, c, a, c, a]};
}
const GRAD_FLICKER = flicker(C_DIM, C_MID, C_BRIGHT, 3);
const GRAD_HOLE = flicker(C_DIM, C_EMPTY, C_DARK);
const GRAD_HOLE_FILL = flicker(C_DARK, C_DIM, C_EMPTY);
const GRAD_BURN = flicker(C_BRIGHT, C_VBRIGHT, C_MID);
const GRAD_BURN_FILL = flicker(C_MID, C_BRIGHT, C_VBRIGHT);
const GRAD_SHORT = flicker(C_MID, C_BRIGHT, C_VBRIGHT);
const GRAD_TARGET = pulse(C_DIM, C_MID, 2);
const GRAD_REGISTER = pulse(C_BRIGHT, C_VBRIGHT, 2);
const GRAD_COMPLETE = pulse(C_MID, C_VBRIGHT, 0.1);

var ctx, ops, body, grid, canvas, gameScreen, info, controls, interlacePatterns = [], cathodeRay;
var fullscreen = false;
var lastFrame = new Date().getTime();
var PX = 1; // pixel size
var LW = PX*LINE_WIDTH; // line width
var OR = 0; // orientation (0 = landscape, 1 = portrait)
var W = 0; // screen width
var H = 0; // screen height
var RAY = PX; // diameter of ray blip
var frameCount = 0;
const {floor, ceil, abs, pow, min, max} = Math;
var animating = false;

function createTextures() {
	var interlaceGrad, interlaceCtx, interlaceCanvases = [];
	interlaceGrad = ctx.createLinearGradient(0,0,0,PX);
	interlaceGrad.addColorStop(0.0, C_INTER_A.toString());
	interlaceGrad.addColorStop(0.25, C_INTER_B.toString());
	interlaceGrad.addColorStop(0.75, C_INTER_B.toString());
	interlaceGrad.addColorStop(1.0, C_INTER_A.toString());
	interlaceCanvases[0] = document.createElement("canvas");
	interlaceCanvases[0].width = 1;
	interlaceCanvases[0].height = PX;
	interlaceCanvases[1] = document.createElement("canvas");
	interlaceCanvases[1].width = 1;
	interlaceCanvases[1].height = PX;
	interlaceCtx = interlaceCanvases[0].getContext("2d");
	interlaceCtx.fillStyle = interlaceGrad;
	interlaceCtx.fillRect(0,0,1,PX);
	interlaceGrad = ctx.createLinearGradient(0,0,0,PX);
	interlaceGrad.addColorStop(0.0, C_INTER_B.toString());
	interlaceGrad.addColorStop(0.25, C_INTER_A.toString());
	interlaceGrad.addColorStop(0.75, C_INTER_A.toString());
	interlaceGrad.addColorStop(1.0, C_INTER_B.toString());
	interlaceCtx = interlaceCanvases[1].getContext("2d");
	interlaceCtx.fillStyle = interlaceGrad;
	interlaceCtx.fillRect(0,0,1,PX);
	interlacePatterns[0] = ctx.createPattern(interlaceCanvases[0], "repeat");
	interlacePatterns[1] = ctx.createPattern(interlaceCanvases[1], "repeat");

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
	W = document.body.clientWidth;
	H = document.body.clientHeight;
	OR = W > H?0:1;
	gameScreen.width = W;
	gameScreen.height = H;
	PX = evenNumber((OR?W:H) / 120);
	RAY = PX*2;
	LW = PX*LINE_WIDTH;
	createTextures();
}

function calcNextFrameTime() {
}

function getBit(field, pos) {
	return field >> pos & 1;
}

function calcOps() {
	return (info.currentLevel.par - info.ops).toString();
}

function lPad(string, len) {
	return ((" ").repeat(len)+string).slice(-len);
}

function rPad(string, len) {
	return (string+(" ").repeat(len)).slice(0, len);
}

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
	WMOD = W % 2;
	HMOD = W % 2;
	ctx.strokeStyle = C_MID; //colorAtTime(GRAD_FLICKER).toString();
	ctx.lineWidth = PX;
	ctx.strokeRect(LW, LW, W-LW*2 - WMOD, H-LW*2 - HMOD);
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
	ctx.lineWidth = LW;
	ctx.beginPath();
	ctx.moveTo(a[0],a[1]);
	ctx.lineTo(b[0],b[1]);
	ctx.lineTo(c[0],c[1]);
	ctx.fillStyle = fill.toString();
	ctx.fill();
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
		ctx.fillRect(x, y, w, h);
	}
}

function drawControls() {
	var size = 3, btn, fill,
	    cols = [W-LW*size*4-LW*2, W-LW*size*3-LW, W-LW*size*2],
	    rows = [H-LW*size*3-LW*3, H-LW*size*2-LW*2, H-LW*size-LW];
	controls.buttons.forEach((btn) => {
		if(btn.revealed && typeof(drawButton[btn.id]) !== "undefined") {
			fill = (btn.active?C_BRIGHT:C_MID);
			drawButton[btn.id](cols, rows, size, fill);
		}
	});
}

function makeScoreboardText() {
	var name = info.currentLevel.name;
	return "score: "+rPad(info.score, 6)+
	       "level: "+rPad((info.glitched?String.fromCharCode(name):name), 5)+
				 "ops: "+calcOps();
}

function drawScoreboard() {
	var text, scoreboardOffset, fontSize = 4*PX, fontWidth = 2.5*(PX+1);
	ctx.fillStyle = C_MID.toString();
	ctx.font = fontSize+"px 'Pixel Operator 8'";
	text = makeScoreboardText();
	scoreboardOffset = evenNumber((W-text.length*fontWidth)/2);
	ctx.fillText(text, (PX*8)+scoreboardOffset, PX*8);
}

function drawBitOutline(bit, xOff, yOff, bitSize, color) {
	ctx.strokeStyle = color.toString();
	ctx.strokeRect(xOff-LW, yOff-LW, -bitSize+LW*2, -bitSize+LW*2);
}

function drawBitFill(bit, xOff, yOff, bitSize, color) {
	ctx.strokeStyle = color.toString();
	ctx.strokeRect(xOff-LW*2, yOff-LW*2, -bitSize+LW*4, -bitSize+LW*4);
}

function drawBit(bit, xOff, yOff, border, bitSize, type) {
	var target = getBit(info.currentLevel.target, bit);
	var burn = getBit(info.currentLevel.burns, bit);
	var hole = getBit(info.currentLevel.holes, bit);
	var shorted = getBit(info.currentLevel.shorts, bit);
	var register = getBit(info.register, bit);
	var outline = C_EMPTY;
	var fill = C_EMPTY;
	var glitchMod = 0;
	ctx.lineWidth = LW;
	ctx.strokeStyle = border;
	// handle glitch mode
	if(info.glitched && info.complete) {
		glitchMod = (bit % 2)*2*(frameCount % (FPS/4+(bit % 2)*2) % 2?-1:1);
		ctx.strokeStyle =  colorAtTime(GRAD_BURN);
		ctx.fillStyle = colorAtTime(GRAD_COMPLETE);
		ctx.fillRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
		ctx.strokeRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
	}
	else {
		ctx.strokeRect(xOff, yOff, -bitSize, -bitSize);
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
	var gridOffsetX = evenNumber((W-width*bitSize)/2);
	var gridOffsetY = evenNumber((H-height*bitSize)/2);
	var gridMaxX = bitSize*width;
	var gridMaxY = bitSize*height;
	var numBits = width*height
	var xOff = 0, yOff = 0, x = 0, y = 0;
	var border = C_MID;
	var targets = info.targets, register = info.register; 
	if(info.crashed) {
		border = colorAtTime(GRAD_COMPLETE);
		ctx.strokeStyle = border;
		ctx.fillStyle = border;
		ctx.lineWidth = LW;
		ctx.strokeRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
		ctx.fillRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
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
	var w = gameScreen.width, h = gameScreen.height, rx, ry, fr, pixels; 
	ctx.fillStyle = interlacePatterns[frameCount%2];
	ctx.globalCompositeOperation = "multiply";
	ctx.fillRect(0,0,w,h);
	ctx.globalCompositeOperation = "source-over";
	/*
	pixels = w * h;
	fr = frameCount % pixels; // frame ratio
	rx = fr % w;
	ry = fr / h % w;
	ctx.fillStyle = cathodeRay;
	ctx.globalCompositeOperation = "source-over";
	cathodeRay = ctx.createRadialGradient(rx,ry,1,rx,ry,RAY);
	cathodeRay.addColorStop(0.0,C_INTER_A.toString());
	cathodeRay.addColorStop(1.0,C_INTER_B.toString());
	ctx.fillRect(0,0,w,h);
	*/
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
	ctx.fillStyle = C_EMPTY.toString();
	ctx.fillRect(0, 0, W, H);
	drawBorder();
	drawScoreboard();
	drawGrid();
	drawControls();
	drawEffects();
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
	ctx = gameScreen.getContext("2d");
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
