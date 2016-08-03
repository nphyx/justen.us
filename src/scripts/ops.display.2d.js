"use strict";

// useful global constants
const {floor} = Math;
import {Color, Palette, Gradients, colorAtTime} from "./ops.display.2d.color";
const AUTO_FULLSCREEN = false;
const SCALE = 1;

// global variables
var pal; // color palette
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
var vingette; // vingette effect
var fullscreen = false; // whether game is in fullscreen mode
var lastFrame = new Date().getTime(); // time of last draw frame
var frameCount = 0; // running total of drawn frames
var animating = false; // whether game is currently running animation loop
var scanlinePattern;

// display state variables
var PX = 1; // pixel size
var LW = 4; // relative width of lines
var OR = 0; // orientation (0 = landscape, 1 = portrait)
var W = 0; // screen width
var H = 0; // screen height
var BW = 0; // draw buffer width
var BH = 0; // draw buffer height
var RAY = PX; // diameter of ray blip
var PAUSE = false; // whether game is paused
var GAME_STARTED = false; // whether game has started (otherwise display splash)

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

//const GRAD_FLICKER = flicker(pal.stringDim, pal.stringMid, pal.stringBright, 3);
var GRAD_HOLE, GRAD_HOLE_FILL, GRAD_BURN, GRAD_BURN_FILL, GRAD_SHORT, GRAD_TARGET, GRAD_REGISTER, GRAD_COMPLETE;
function makeGradients() {
	GRAD_HOLE = Gradients.flicker(pal.colorDim, pal.colorEmpty, pal.colorDark, FPS);
	GRAD_HOLE_FILL = Gradients.flicker(pal.colorDark, pal.colorDim, pal.colorEmpty, FPS);
	GRAD_BURN = Gradients.flicker(pal.colorBright, pal.colorBlinding, pal.colorMid, FPS);
	GRAD_BURN_FILL = Gradients.flicker(pal.colorMid, pal.colorBright, pal.colorBlinding, FPS);
	GRAD_SHORT = Gradients.flicker(pal.colorMid, pal.colorBright, pal.colorBlinding, FPS);
	GRAD_TARGET = Gradients.pulse(pal.colorDim, pal.colorMid, 2, FPS);
	GRAD_REGISTER = Gradients.pulse(pal.colorBright, pal.colorBlinding, 2, FPS);
	GRAD_COMPLETE = Gradients.pulse(pal.colorMid, pal.colorBlinding, 0.1, FPS);
}

function createTextures() {
	var maskCanvas, maskCtx, scanCanvas, scanCtx, i = 0;
	var maskStyles = [
		new Color(255,255,255,0.01).asRGBA,
		new Color(255,255,255,0.99).asRGBA
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
	var color = pal.colorEmpty.copy();
	color.a = 0.5;
	scanCtx.fillStyle = color.asRGBA;
	scanCtx.fillRect(0,LW-1,1,1);
	color.a = 0.125;
	scanCtx.fillStyle = color.asRGBA; 
	scanCtx.fillRect(0,LW-2,1,1);
	scanCtx.fillRect(0,0,1,1);
	scanlinePattern = scanCtx.createPattern(scanCanvas, "repeat");
	var vingColors = [
		pal.colorBright.copy(),
		pal.colorDark.copy()
	];
	vingColors[0].a = 0.5;
	vingColors[1].a = 1.0;
	vingette = screenCtx.createRadialGradient(BW*0.5, BH*0.5, (OR?BH:BW)*0.25,BW*0.5,BH*0.5,(OR?BH:BW));
	vingette.addColorStop(0,vingColors[0].asRGBA);
	vingette.addColorStop(1,vingColors[1].asRGBA);

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
	console.log("STARTING GAME");
	GAME_STARTED = true;
	updateRatio(); // we do this because logo screen is double size
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
	PX = npot((OR?W:H) / 240);
	if(!GAME_STARTED) PX <<= 1;
	W = W - (W%PX);
	H = H - (H%PX);
	gameScreen.width = W;
	gameScreen.height = H;
	BW = ~~(W/PX);
	BH = ~~(H/PX);
	RAY = PX*2;
	createTextures();
	createBuffers();
}

function getBit(field, pos) {
	return field >> pos & 1;
}

function calcOps() {
	return (info.currentLevel.par - info.ops).toString();
}

function drawBorder() {
	var WMOD, HMOD;
	WMOD = BW % 2;
	HMOD = BW % 2;
	curCtx.strokeStyle = pal.stringMid;
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
	curCtx.fillStyle = fill;
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
			fill = (btn.active?pal.stringBright:pal.stringMid);
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
	curCtx.fillStyle = pal.stringMid;
	curCtx.textAlign = "center";
	curCtx.fillText(text, evenNumber(BW/2), LW*3+fontSize);
}

function drawBitOutline(bit, xOff, yOff, bitSize, color) {
	curCtx.strokeStyle = color;
	curCtx.strokeRect(xOff-LW, yOff-LW, -bitSize+LW*2, -bitSize+LW*2);
}

function drawBitFill(bit, xOff, yOff, bitSize, color) {
	curCtx.strokeStyle = color;
	curCtx.strokeRect(xOff-LW*2, yOff-LW*2, -bitSize+LW*4, -bitSize+LW*4);
}

function drawBit(bit, xOff, yOff, border, bitSize) {
	var target = getBit(info.currentLevel.target, bit);
	var burn = getBit(info.currentLevel.burns, bit);
	var hole = getBit(info.currentLevel.holes, bit);
	var shorted = getBit(info.currentLevel.shorts, bit);
	var register = getBit(info.register, bit);
	var outline = pal.stringEmpty;
	var fill = pal.stringEmpty;
	var glitchMod = 0;
	curCtx.lineWidth = LW;
	curCtx.strokeStyle = border;
	// handle glitch mode
	if(info.glitched && info.complete) {
		glitchMod = (bit % 2)*2*(frameCount % (FPS/4+(bit % 2)*2) % 2?-1:1);
		curCtx.strokeStyle =  colorAtTime(GRAD_BURN, frameCount);
		curCtx.fillStyle = colorAtTime(GRAD_COMPLETE, frameCount);
		curCtx.fillRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
		curCtx.strokeRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
	}
	else {
		curCtx.strokeRect(xOff, yOff, -bitSize, -bitSize);
		if(register) fill = colorAtTime(GRAD_REGISTER, frameCount);
		if(hole) {
			outline = colorAtTime(GRAD_HOLE, frameCount);
			fill = colorAtTime(GRAD_HOLE_FILL, frameCount);
		}
		else if(burn) {
			outline = colorAtTime(GRAD_BURN, frameCount);
			fill = colorAtTime(GRAD_BURN_FILL, frameCount);
		}
		else if(shorted) {
			outline = colorAtTime(GRAD_SHORT, frameCount);
			if(register) fill = colorAtTime(GRAD_TARGET, frameCount);
		}
		else if(target) {
			if(info.complete) {
				let color = colorAtTime(GRAD_COMPLETE, frameCount);
				outline = fill = color;
			}
			else outline = colorAtTime(GRAD_TARGET, frameCount);
		}
		if(outline !== pal.stringEmpty) drawBitOutline(bit, xOff, yOff, bitSize, outline);
		if(fill !== pal.stringEmpty) drawBitFill(bit, xOff, yOff, bitSize, fill);
	}
}

function drawGrid() {
	var bitSize = LW*5, width = info.currentLevel.width, height = info.currentLevel.height;
	var gridOffsetX = evenNumber((BW-width*bitSize)/2);
	var gridOffsetY = evenNumber((BH-height*bitSize)/2);
	var gridMaxX = bitSize*width;
	var gridMaxY = bitSize*height;
	var numBits = width*height;
	var xOff = 0, yOff = 0, x = 0, y = 0;
	var border = pal.stringMid;
	if(info.crashed) {
		border = colorAtTime(GRAD_COMPLETE, frameCount);
		curCtx.strokeStyle = border;
		curCtx.fillStyle = border;
		curCtx.lineWidth = LW;
		curCtx.strokeRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
		curCtx.fillRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
	}
	else {
		if(info.complete) border = colorAtTime(GRAD_COMPLETE, frameCount);
		for(var i = 0; i < numBits; ++i) {
			x = i % width;
			y = floor(i/width);
			xOff = gridOffsetX+gridMaxX - bitSize*x;
			yOff = gridOffsetY+gridMaxY - bitSize*y;
			drawBit(i, xOff, yOff, border, bitSize, 0);
		}
	}
}

function drawLogoText() {
	// need to calculate location of grid
	var bitSize = LW*5, width = info.currentLevel.width, height = info.currentLevel.height;
	var gridOffsetX = evenNumber((BW-width*bitSize)/2);
	var gridOffsetY = evenNumber((BH-height*bitSize)/2);
	var fontSize = 16;
	var text = ["P","L","A","Y"];
	var time = (frameCount % (FPS*4));
	if(time < 31) text[3] = "Y";
	if(time > 30) text[0] = "O";
	if(time > 60) text[1] = "P";
	if(time > 90) text[2] = "S";
	if(time > 120) text[3] = " ";
	if(time > 150) text[0] = "P";
	if(time > 180) text[1] = "L";
	if(time > 210) text[2] = "A";
	curCtx.fillStyle = pal.stringBright;
	curCtx.font = fontSize+"px 'Press Start 2P'";
	curCtx.textAlign = "left";
	

	curCtx.fillText(text[0], gridOffsetX+bitSize+LW-1,gridOffsetY+bitSize*2-1);
	curCtx.fillText(text[1], gridOffsetX+bitSize*2+LW-1,gridOffsetY+bitSize*2-1);
	curCtx.fillText(text[2], gridOffsetX+bitSize+LW-1,gridOffsetY+bitSize*3-1);
	curCtx.fillText(text[3], gridOffsetX+bitSize*2+LW-1,gridOffsetY+bitSize*3-1);
}

function drawLogoBox() {
	var bitSize = LW*5, width = info.currentLevel.width, height = info.currentLevel.height;
	var gridOffsetX = evenNumber((BW-width*bitSize)/2);
	var gridOffsetY = evenNumber((BH-height*bitSize)/2);
	var gridMaxX = bitSize*width;
	var gridMaxY = bitSize*height;
	var numBits = width*height;
	var xOff = 0, yOff = 0, x = 0, y = 0;
	var border = pal.stringMid;
	for(var i = 0; i < numBits; ++i) {
		x = i % width;
		y = floor(i/width);
		xOff = gridOffsetX+gridMaxX - bitSize*x;
		yOff = gridOffsetY+gridMaxY - bitSize*y;
		drawBit(i, xOff, yOff, border, bitSize, 0);
	}
}

function drawEffects() {
	screenCtx.fillStyle = scanlinePattern;
	screenCtx.globalCompositeOperation = "multiply";
	screenCtx.fillRect(0,0,W,H);
	screenCtx.globalCompositeOperation = "source-over";
}

function animateGame() {
	curCtx = tmpCtx;
	curCtx.globalCompositeOperation = "source-over";
	var color = pal.colorEmpty.copy();
	color.a = 1.0;
	curCtx.fillStyle = color.asRGBA;
	curCtx.fillRect(0,0, BW, BH);
	drawBorder();
	drawScoreboard();
	drawGrid();
	drawControls();
}

function animateSplash() {
	curCtx = tmpCtx;
	curCtx.globalCompositeOperation = "source-over";
	var color = pal.colorEmpty.copy();
	color.a = 1.0;
	curCtx.fillStyle = color.asRGBA;
	curCtx.fillRect(0,0, BW, BH);
	drawBorder();
	drawLogoBox();
	drawLogoText();
}

function animate() {
	var now = Date.now();
	if(PAUSE) return;
	if((now - lastFrame) < FPS_INTERVAL) {
		requestAnimationFrame(animate);
		return;
	}
	frameCount++;
	if(GAME_STARTED) {
		info = ops.stateInfo();
		animateGame();
	}
	else {
		info = ops.logoInfo();
		animateSplash();
	}

	var which = ~~((frameCount)%2);
	curCtx.globalCompositeOperation = "overlay";
	curCtx.fillStyle = vingette;
	curCtx.fillRect(0,0, BW, BH);

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
		screenCtx.globalCompositeOperation = "overlay";
		screenCtx.drawImage(bufferCanvases[which],0,0,W,H);
		screenCtx.globalCompositeOperation = "source-over";
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
	pal = new Palette(new Color(16,128,16));
	makeGradients();
	body = document.getElementsByTagName("body")[0];
	body.classList.add("2d");
	gameScreen = document.createElement("canvas");
	gameScreen.id = "game-screen";
	screenCtx = gameScreen.getContext("2d");
	body.addEventListener("click", startGame);
	document.addEventListener("keyup", pressEnter);
	window.addEventListener("resize", updateRatio);
	updateRatio();
	setup();
	if(AUTO_FULLSCREEN) {
		body.addEventListener("click", toggleFullScreen);
		document.addEventListener("fullscreenchange", fullscreenOff);
		document.addEventListener("mozfullscreenchange", fullscreenOff);
		document.addEventListener("msfullscreenchange", fullscreenOff);
		document.addEventListener("webkitfullscreenchange", fullscreenOff);
	}
}
