"use strict";

// useful global constants
const {floor, random} = Math;
import {Color, Palette, GradientTexture} from "./ops.display.2d.color";
const AUTO_FULLSCREEN = false;
const SCALE = 1;

// global variables
var pal; // color palette
var screenCtx; // current rendering context
var compositeCanvas; // temporary draw buffer for compositing
var compositeCtx; // temporary context for compositing
var ops; // game data object
var info; // game info object
var controls; // game controls object
var body; // html document body
var gameScreen; // game screen canvas
var interlaceBufferCanvases = Array(2); // canvases for alternating draw interlaceBufferContexts
var interlaceBufferContexts = Array(2); // draw buffer contexts
var interlaceBufferMasks = Array(2); // draw buffer masks
var fullscreen = false; // whether game is in fullscreen mode
//var lastFrame = new Date().getTime(); // time of last draw frame
var frameCount = 0; // running total of drawn frames
var animating = false; // whether game is currently running animation loop
var gradients; // GradientTexture object
var scanTexture;
var startTime;
var gridData = {};

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
//const FPS_INTERVAL = 1000/FPS;

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

const GRAD_HOLE = 0;
const GRAD_HOLE_FILL = 1;
const GRAD_BURN = 2;
const GRAD_BURN_FILL = 3;
const GRAD_SHORT = 4;
const GRAD_TARGET = 5;
const GRAD_REGISTER = 6;
const GRAD_COMPLETE = 7;

function makeGradients() {
	gradients = new GradientTexture({frames:FPS, gradients:[
		{type:"flicker", speed:1, colors:[pal.colorDim, pal.colorEmpty, pal.colorDark]},
		{type:"flicker", speed:1, colors:[pal.colorDark, pal.colorDim, pal.colorEmpty]},
		{type:"flicker", speed:1, colors:[pal.colorBright, pal.colorBlinding, pal.colorMid]},
		{type:"flicker", speed:1, colors:[pal.colorMid, pal.colorBright, pal.colorBlinding]},
		{type:"flicker", speed:1, colors:[pal.colorMid, pal.colorBright, pal.colorBlinding]},
		{type:"pulse", speed:1, colors:[pal.colorDim, pal.colorMid]},
		{type:"pulse", speed:1, colors:[pal.colorBright, pal.colorBlinding]},
		{type:"pulse", speed:3, colors:[pal.colorMid, pal.colorBlinding]}
	]});
}

function makeTextures() {
	var maskCanvas, maskCtx, scanCanvas, scanlinePattern, scanTexCtx, scanCtx, i = 0;
	var vingette, vingColors, color;
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
		interlaceBufferMasks[i] = maskCtx.createPattern(maskCanvas, "repeat");
	}
	scanCanvas = document.createElement("canvas");
	scanCanvas.width = 1;
	scanCanvas.height = LW;
	scanTexture = document.createElement("canvas");
	scanTexture.width = W;
	scanTexture.height = H;
	scanCtx = scanCanvas.getContext("2d");
	scanTexCtx = scanTexture.getContext("2d");
	// vingette pattern
	vingette = scanTexCtx.createRadialGradient(W*0.5, H*0.5, (OR?H:W)*0.25,W*0.5,H*0.5,(OR?H:W));
	vingColors = [
		pal.colorBright.copy(),
		pal.colorDark.copy()
	];
	vingColors[0].a = 0.7;
	vingColors[1].a = 0.7;
	vingette.addColorStop(0,vingColors[0].asRGBA);
	vingette.addColorStop(1,vingColors[1].asRGBA);
	scanTexCtx.fillStyle = vingette;
	scanTexCtx.fillRect(0,0,W,H);

	// scanline patterns
	color = pal.colorEmpty.copy();
	color.a = 0.5;
	scanCtx.fillStyle = color.asRGBA;
	scanCtx.fillRect(0,LW-1,1,1);
	color.a = 0.125;
	scanCtx.fillStyle = color.asRGBA; 
	scanCtx.fillRect(0,LW-2,1,1);
	scanCtx.fillRect(0,0,1,1);
	scanlinePattern = scanCtx.createPattern(scanCanvas, "repeat");
	scanTexCtx.fillStyle = scanlinePattern;
	scanTexCtx.fillRect(0,0,W,H);
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
		interlaceBufferCanvases[i] = document.createElement("canvas");
		interlaceBufferCanvases[i].width = BW;
		interlaceBufferCanvases[i].height = BH;
		interlaceBufferContexts[i] = interlaceBufferCanvases[i].getContext("2d");
	}
	compositeCanvas = document.createElement("canvas");
	compositeCanvas.width = BW;
	compositeCanvas.height = BH;
	compositeCtx = compositeCanvas.getContext("2d");
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
	GAME_STARTED = true;
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
	W = W - (W%PX);
	H = H - (H%PX);
	gameScreen.width = W;
	gameScreen.height = H;
	BW = ~~(W/PX);
	BH = ~~(H/PX);
	RAY = PX*2;
	makeTextures();
	createBuffers();
}

function getBit(field, pos) {
	return field >> pos & 1;
}

function calcOps() {
	return (info.currentLevel.par - info.ops).toString();
}

/**
 * Draws the border around the game screen.
 */
function drawBorder(ctx, w, h) {
	var WMOD, HMOD;
	WMOD = w % 2;
	HMOD = h % 2;
	ctx.strokeStyle = pal.stringMid;
	ctx.lineWidth = LW;
	ctx.strokeRect(LW, LW, w-LW*2 - WMOD, h-LW*2 - HMOD);
}

/**
 * Draw a triangle with corners at a, b, c, stroke color, and fill color.
 * @param {vertex} a 2d vertex for first corner
 * @param {vertex} b 2d vertex for second corner
 * @param {vertex} c 2d vertex for third corner
 * @param {color|false} stroke 
 * @param {color|false} fill 
 */
function drawTriangle(ctx, a, b, c, fill) {
	ctx.lineWidth = LW;
	ctx.beginPath();
	ctx.moveTo(a[0],a[1]);
	ctx.lineTo(b[0],b[1]);
	ctx.lineTo(c[0],c[1]);
	ctx.fillStyle = fill;
	ctx.fill();
}

const drawButton = {
	"opAdd":function(ctx, cols, rows, size, fill) {
		var half = size/2, x = cols[1], y = rows[0],
			a = [x+LW*half, y],
			b = [x, y+LW*size],
			c = [x+LW*size, y+LW*size];
		drawTriangle(ctx, a, b, c, fill);
	},
	"opSub":function(ctx, cols, rows, size, fill) {
		var half = size/2, x = cols[1], y = rows[1],
			a = [x, y],
			b = [x+LW*half, y+LW*size],
			c = [x+LW*size, y];
		drawTriangle(ctx, a, b, c, fill);
	},
	"opLShift":function(ctx, cols, rows, size, fill) {
		var half = size/2, x = cols[0], y = rows[1],
			a = [x, y+LW*half],
			b = [x+LW*size, y+LW*size],
			c = [x+LW*size, y];
		drawTriangle(ctx, a, b, c, fill);
	},
	"opRShift":function(ctx, cols, rows, size, fill) {
		var half = size/2, x = cols[2], y = rows[1],
			a = [x, y],
			b = [x+LW*size, y+LW*half],
			c = [x, y+LW*size];
		drawTriangle(ctx, a, b, c, fill);
	},
	"opBump":function(ctx, cols, rows, size, fill) {
		var x = cols[0], y = rows[2], w = LW*size*3+LW*2, h = LW*size/2;
		ctx.fillStyle = fill;
		ctx.fillRect(x, y, w, h);
	}
}

function drawGlitches(ctx, w, h) {
	var x, y, i = 0, cleared = info.glitchesCleared;
	var colorAt = gradients.getColorAtTime.bind(gradients);
	var colors = [colorAt(GRAD_BURN, frameCount), colorAt(GRAD_HOLE, frameCount), colorAt(GRAD_REGISTER, frameCount), colorAt(GRAD_SHORT, frameCount)];
	var colorLength = colors.length;

	for(; i < cleared; ++i) {
		x = evenNumber(random()*w);
		y = evenNumber(random()*h);
		ctx.fillStyle = colors[i%colorLength];
		ctx.fillRect(x,y,LW,LW);
	}
}

function drawControls(ctx) {
	var size = (OR?6:5), fill, off = (OR?(BW+LW*size*5)/2:BW),
	    cols = [off-LW*size*4-LW*2, off-LW*size*3-LW, off-LW*size*2],
	    rows = [BH-LW*size*3-LW*3, BH-LW*size*2-LW*2, BH-LW*size-LW];
	controls.buttons.forEach((btn) => {
		if(btn.revealed && typeof(drawButton[btn.id]) !== "undefined") {
			fill = (btn.active?pal.stringBright:pal.stringMid);
			drawButton[btn.id](ctx, cols, rows, size, fill);
		}
	});
}

function calcFPS() {
	var now = Date.now();
	return ((now - startTime)/frameCount).toPrecision(2);
}

function makeScoreboardText() {
	var name = info.currentLevel.name;
	return "score:"+info.score+
	       " level:"+(info.glitched?String.fromCharCode(name):name)+
				 " ops:"+calcOps()+
				 " FPS:"+calcFPS();
}

function drawScoreboard(ctx) {
	var text = makeScoreboardText(), fontSize = 8;
	ctx.font = fontSize+"px 'Press Start 2P'";
	ctx.fillStyle = pal.stringMid;
	ctx.textAlign = "center";
	ctx.fillText(text, evenNumber(BW/2), LW*3+fontSize);
}

function drawBitOutline(ctx, bit, xOff, yOff, bitSize, color) {
	ctx.strokeStyle = color;
	ctx.strokeRect(xOff-LW, yOff-LW, -bitSize+LW*2, -bitSize+LW*2);
}

function drawBitFill(ctx, bit, xOff, yOff, bitSize, color) {
	ctx.strokeStyle = color;
	ctx.strokeRect(xOff-LW*2, yOff-LW*2, -bitSize+LW*4, -bitSize+LW*4);
}

/**
 * Draws a single bit (cell).
 * @param {CanvasRenderingContext2D} ctx framebuffer being drawn to
 * @param {int} bit bit number
 * @param {int} xOff bit x offset (calculated in drawGrid)
 * @param {int} yOff bit y offset (calculated in drawGrid)
 * @param {string} borderStyle bit outer border color in RGBA format
 * @param {int} bit dimensions in pixels
 */
function drawBit(ctx, bit, xOff, yOff, borderStyle, bitSize) {
	var target = getBit(info.currentLevel.target, bit);
	var burn = getBit(info.currentLevel.burns, bit);
	var hole = getBit(info.currentLevel.holes, bit);
	var shorted = getBit(info.currentLevel.shorts, bit);
	var register = getBit(info.register, bit);
	var outline = pal.stringEmpty;
	var fill = pal.stringEmpty;
	var colorAt = gradients.getColorAtTime.bind(gradients);
	var glitchMod = 0;

	ctx.lineWidth = LW;
	ctx.strokeStyle = borderStyle;
	// handle glitch mode
	if(info.glitched && info.complete) {
		glitchMod = (bit % 2)*2*(frameCount % (FPS/4+(bit % 2)*2) % 2?-1:1);
		ctx.strokeStyle =  colorAt(GRAD_BURN, frameCount);
		ctx.fillStyle = colorAt(GRAD_BURN, frameCount);
		ctx.fillRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
		ctx.strokeRect(xOff+glitchMod, yOff+glitchMod, -bitSize+glitchMod, -bitSize+glitchMod);
	}
	else {
		ctx.strokeRect(xOff, yOff, -bitSize, -bitSize);
		if(register) fill = colorAt(GRAD_REGISTER, frameCount);
		if(hole) {
			outline = colorAt(GRAD_HOLE, frameCount);
			fill = colorAt(GRAD_HOLE_FILL, frameCount);
		}
		else if(burn) {
			outline = colorAt(GRAD_BURN, frameCount);
			fill = colorAt(GRAD_BURN_FILL, frameCount);
		}
		else if(shorted) {
			outline = colorAt(GRAD_SHORT, frameCount);
			if(register) fill = colorAt(GRAD_TARGET, frameCount);
		}
		else if(target) {
			if(info.complete) {
				let color = colorAt(GRAD_COMPLETE, frameCount);
				outline = fill = color;
			}
			else outline = colorAt(GRAD_TARGET, frameCount);
		}
		if(outline !== pal.stringEmpty) drawBitOutline(ctx, bit, xOff, yOff, bitSize, outline);
		if(fill !== pal.stringEmpty) drawBitFill(ctx, bit, xOff, yOff, bitSize, fill);
	}
}

/**
 * Calculates grid dimensions for use in various draw operations
 */
function calcGridData(w, h) {
	var bitSize = LW*5, bitsX = info.currentLevel.width, bitsY = info.currentLevel.height;
	gridData.bitSize=bitSize;
	gridData.bitsX=bitsX;
	gridData.bitsY=bitsY;
	gridData.numBits=bitsX*bitsY;
	gridData.gridOffsetX=evenNumber((w-bitsX*bitSize)/2);
	gridData.gridOffsetY=evenNumber((h-bitsY*bitSize)/2);
	gridData.gridMaxX=bitSize*bitsX;
	gridData.gridMaxY=bitSize*bitsY;
}

/**
 * Draws the "PLAY/OPS" logo screen text.
 * @param {CanvasRenderingContext2D} ctx framebuffer being drawn to
 */
function drawTitleText(ctx) {
	var {bitSize,gridOffsetX,gridOffsetY} = gridData;
	// need to calculate location of grid
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
	ctx.fillStyle = pal.stringBright;
	ctx.font = fontSize+"px 'Press Start 2P'";
	ctx.textAlign = "left";
	ctx.fillText(text[0], gridOffsetX+bitSize+LW-1,gridOffsetY+bitSize*2-1);
	ctx.fillText(text[1], gridOffsetX+bitSize*2+LW-1,gridOffsetY+bitSize*2-1);
	ctx.fillText(text[2], gridOffsetX+bitSize+LW-1,gridOffsetY+bitSize*3-1);
	ctx.fillText(text[3], gridOffsetX+bitSize*2+LW-1,gridOffsetY+bitSize*3-1);
}

function drawGrid(ctx) {
	var {bitSize,bitsX,numBits,gridOffsetX,gridOffsetY,gridMaxX,gridMaxY} = gridData;
	var xOff = 0, yOff = 0, x = 0, y = 0;
	var border = pal.stringMid;
	var colorAt = gradients.getColorAtTime.bind(gradients);
	if(info.crashed) {
		border = colorAt(GRAD_COMPLETE, frameCount);
		ctx.strokeStyle = border;
		ctx.fillStyle = border;
		ctx.lineWidth = LW;
		ctx.strokeRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
		ctx.fillRect(gridOffsetX, gridOffsetY, gridMaxX, gridMaxY);
	}
	else {
		if(info.complete) border = colorAt(GRAD_COMPLETE, frameCount);
		for(var i = 0; i < numBits; ++i) {
			x = i % bitsX;
			y = floor(i/bitsX);
			xOff = gridOffsetX+gridMaxX - bitSize*x;
			yOff = gridOffsetY+gridMaxY - bitSize*y;
			drawBit(ctx, i, xOff, yOff, border, bitSize, 0);
		}
	}
}

/**
 * Draws the title screen grid.
 * @param {CanvasRenderingContext2D} ctx framebuffer being drawn to
 * @param {int} w framebuffer width
 * @param {int} w framebuffer height
 */
function drawTitleGrid(ctx) {
	var {bitsX,numBits,bitSize,gridOffsetX,gridOffsetY,gridMaxX,gridMaxY} = gridData;
	var xOff = 0, yOff = 0, x = 0, y = 0;
	var border = pal.stringMid;
	for(var i = 0; i < numBits; ++i) {
		x = i % bitsX;
		y = floor(i/bitsX);
		xOff = gridOffsetX+gridMaxX - bitSize*x;
		yOff = gridOffsetY+gridMaxY - bitSize*y;
		drawBit(ctx, i, xOff, yOff, border, bitSize, 0);
	}
}

/**
 * Draws an image over a destination context using a given composition operation, 
 * scaled to the size of the destination. 
 * @param {CanvasRenderingContext2D} ctx framebuffer being drawn to
 * @param {Canvas} src source image
 * @param {String} operation operation type
 * @param {int} w width of framebuffer
 * @param {int} h height of framebuffer
 * @param {string} operation composite operation type (default source-over)
 */
function composite(dest, src, w, h, operation="source-over") {
	dest.globalCompositeOperation = operation;
	dest.drawImage(src, 0, 0, w, h);
}

/**
 * Fills a buffer with the given style.
 * @param CanvasRenderingContext2D ctx framebuffer being drawn to
 * @param {int} w width of framebuffer
 * @param {int} h height of framebuffer
 * @param {string} operation composite operation type (default source-over)
 */
function drawFill(ctx, w, h, style, operation="source-over") {
	ctx.globalCompositeOperation = operation;
	ctx.fillStyle = style;
	ctx.fillRect(0, 0, w, h);
}

/**
 * Draws post-processing effects
 */
function drawPostEffects(ctx, w, h) {
	composite(ctx, scanTexture, w, h, "overlay");
}

function drawGameScreen(ctx, w, h) {
	calcGridData(w,h);
	drawFill(ctx, w, h, pal.stringWipe);
	drawBorder(ctx, w, h);
	drawScoreboard(ctx, w, h);
	drawGrid(ctx, w, h);
	drawControls(ctx, w, h);
	drawGlitches(ctx, w, h);
}

/**
 * Draws the splash screen.
 * @param CanvasRenderingContext2D ctx framebuffer being drawn to
 * @param int w width of framebuffer
 * @param int h height of framebuffer
 */
function drawTitleScreen(ctx, w, h) {
	calcGridData(w,h);
	drawFill(ctx, w, h, pal.stringWipe);
	drawBorder(ctx, w, h);
	drawTitleGrid(ctx, w, h);
	drawTitleText(ctx, w, h);
}

/**
 * Draws the vingette effect.
 * @param CanvasRenderingContext2D ctx framebuffer being drawn to
 * @param int w width of framebuffer
 * @param int h height of framebuffer
 */
function drawVingette(ctx, w, h) {
	composite(ctx, vingCanvas, w, h, "overlay");
}

/**
 * Draws the vingette effect.
 * @param CanvasRenderingContext2D ctx framebuffer being drawn to
 * @param int w width of framebuffer
 * @param int h height of framebuffer
 */
function drawInterlaceMask(ctx, mask, w, h) {
	drawFill(ctx, w, h, "black", "source-over");
	drawFill(ctx, w, h, mask, "source-in");
}

function animate() {
	var curCtx, curCanvas;
	if(PAUSE) return;
	if(GAME_STARTED) {
		info = ops.stateInfo();
		drawGameScreen(compositeCtx, BW, BH);
	}
	else {
		info = ops.logoInfo();
		drawTitleScreen(compositeCtx, BW, BH);
	}
	//drawVingette(compositeCtx, BW, BH);

	var which = ~~((frameCount)%2);

	curCtx = interlaceBufferContexts[which];
	curCanvas = interlaceBufferCanvases[which];

	// draw interlace mask (gets its own function for debugging/profiling)
	drawInterlaceMask(curCtx, interlaceBufferMasks[which], BW, BH);
	composite(curCtx,compositeCanvas,BW,BH,"source-in");

	if(SCALE) {
		setAliasing(screenCtx, false);
		composite(screenCtx,curCanvas, W, H);
		drawPostEffects(screenCtx, W, H);
		setAliasing(screenCtx, true);
		composite(screenCtx, curCanvas, W, H, "overlay");
	}
	else composite(screenCtx, curCanvas, (W-BW)/2, (H-BH)/2);

	// reset canvas styles
	screenCtx.globalCompositeOperation = "source-over";

	frameCount++;
	requestAnimationFrame(animate);
}

export function setup() {
	body.innerHTML = "";
	body.appendChild(gameScreen);
	startTime = Date.now();
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
	drawFill(screenCtx, W, H, pal.stringEmpty);
	setup();
	if(AUTO_FULLSCREEN) {
		body.addEventListener("click", toggleFullScreen);
		document.addEventListener("fullscreenchange", fullscreenOff);
		document.addEventListener("mozfullscreenchange", fullscreenOff);
		document.addEventListener("msfullscreenchange", fullscreenOff);
		document.addEventListener("webkitfullscreenchange", fullscreenOff);
	}
}
