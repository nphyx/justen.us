"use strict";
var grid, body, info, controls;
var glitchChars = [9632,9600,9625,9622,9626,9630,9631,9628,9627];
var fullscreen = false;
var flippin;
var flipout;
var ops;
const AUTO_FULLSCREEN = false;
const FLIPTIME = 100;

/**
 * Generator for iterating though a list of bits.
 */
function *bitGenerator(bits) {
	var i = 0;
	while(i < bits.length) {
		yield(bits[i]);
		i++;
	}
}

function flashElement(el, time) {
	el.classList.add("flash");
	setTimeout(() => el.classList.remove("flash"), time);
}

/**
 * Makes certain elements blink to highlight them at the beginning of a level.
 */
function levelFlashes() {
	flashElement(document.getElementById("score-level"), 750);
	setTimeout(() => flashElement(document.getElementById("score-ops"), 750), 750);
	setTimeout(() => flashElement(controls, 750), 1500);
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

function clearEffects() {
	grid.classList.remove("crashed");
	grid.classList.remove("glitching");
	grid.classList.remove("complete");
	body.classList.remove("glitched");
	body.classList.remove("designMode");
	controls.classList.remove("mod");
}

function keysOn(keys) {
	ops.controls.buttons.map((control) => control.id)
		.forEach((key) => document.getElementById(key).classList.add("hidden"));
	keys.forEach((key) => document.getElementById(key).classList.remove("hidden"));
}

function startEffects() {
	if(info.glitched) body.classList.add("glitched");
	if(info.crashed) grid.classList.add("crashed");
	if(info.complete) grid.classList.add("complete");
	if(info.levelStarting) levelFlashes();
	if(info.modKey) controls.classList.add("mod");
	if(info.designMode) body.classList.add("designMode");
}

function fullscreenOff(ev) {
	ev.preventDefault();
	if(document.webkitIsFullScreen || document.mozIsFullScreen || document.msIsFullScreen) fullscreen = true;
	else fullscreen = false;
	return false;
}

/**
 * Populates the glitch overlay
 */
function makeGlitches() {
	var i;
	var string = "";
	for(i = 0; i < info.glitchesCleared; i++) {
		string += "&#"+glitchChars[(Math.floor(Math.random()*glitchChars.length))]+";";
	}
	return string;
}

function updateScoreboard() {
	document.getElementById("score-ops").innerHTML = (info.currentLevel.par - info.ops).toString();
	document.getElementById("score-hi").innerHTML = info.score;
	document.getElementById("score-level").innerHTML = info.currentLevel.name;
	if(!info.designMode) document.getElementById("glitches").innerHTML = makeGlitches();
}

function updateGrid() {
	var width = info.currentLevel.width;
	var height = info.currentLevel.height;
	var i = 0, max = width*height,
			node, elements, bits, gen,
	    lastOp = info.lastOp.id,
	    holes = info.currentLevel.holes,
	    shorts = info.currentLevel.shorts,
	    burns = info.currentLevel.burns,
	    flips = info.flip;

	elements = document.querySelectorAll("#grid span.bit");
	bits = Array.prototype.slice.call(elements, 0);
	bits.reverse();

	bits.forEach(function(node, i) {
		node.classList.remove("filled");
		node.classList.remove("flipped");
		var regBit = getBit(info.register, i);
		if((regBit && !getBit(holes, i) && !getBit(burns, i)) ||
			 (regBit && getBit(shorts, i))
			) node.classList.add("filled");
		if(getBit(flips, i)) node.classList.add("flipped");
	});

	if(flipout || flippin) {
		clearInterval(flippin);
		clearTimeout(flipout);
		flipout = undefined;
	}

	// now apply flipped animations
	elements = document.querySelectorAll("#grid span.bit.flipped");
	bits = Array.prototype.slice.call(elements, 0).reverse();
	gen = bitGenerator(bits);
	i = 0;
	/*
	if(lastOp === "opAdd" || 
	   lastOp === "opLShift" ||
		 lastOp === "opBump" && !lastOp.modded
	) bits.reverse();
	else flips.reverse();
	*/
	//else if(lastOp === "opSub") flips.reverse();
	//flipout = setTimeout(function() {
	flippin = setInterval(function() {
		var next = gen.next();
		if(next.done === true) clearInterval(flippin);
		else next.value.classList.remove("flipped");
		i++;
	}, FLIPTIME);
		//clearTimeout(flipout);
	//}, 100);
}

/**
 * Sets up a level's initial display.
 */
export const setup = function() {
	clearEffects();
	info = ops.stateInfo();
	var level = info.currentLevel;
	var width = level.width;
	var height = level.height;
	var feature;
	var i = 0, max = width*height, nodes = new Array(max),
			node;
	var holes = level.holes || 0, shorts = level.shorts || 0, burns = level.burns || 0, register = info.register, target = level.target, flips = info.flip || 0;
	grid.innerHTML = "";

	for(; i < max; ++i) {
		node = document.createElement("span");
		node.classList.add("bit");
		if(getBit(holes, i)) node.classList.add("hole");
		else if(getBit(burns, i)) node.classList.add("burn");
		else if(getBit(shorts, i)) node.classList.add("short");
		else if(getBit(target, i)) node.classList.add("target");
		nodes.push(node);
		if((i > 0) && ((i+1) % width === 0)) nodes.push(document.createElement("br"));
	}
	nodes.reverse();
	nodes.forEach((node, i) => grid.appendChild(node));
	updateScoreboard();
	updateGrid();
	if(info.currentLevel.keysOn) keysOn(info.currentLevel.keysOn);
	startEffects();
}

function endScreen() {
	grid.innerHTML = "";
	var node = document.createElement("span");
	node.id = "complete";
	node.appendChild(document.createTextNode("THE END"));
	node.appendChild(document.createElement("br"));
	node.appendChild(document.createTextNode("Final score: " + ops.calcFinalScore()));
	grid.appendChild(node);
}


export const render = function() {
	info = ops.stateInfo();
	clearEffects();
	if(info.gameOver) endScreen();
	else if(!info.complete) updateGrid();
	updateScoreboard();
	if(info.currentLevel.keysOn) keysOn(info.currentLevel.keysOn);
	startEffects();
}

function startGame() {
	ops.startGame();
	body.removeEventListener("click", startGame);
	body.classList.remove("start");
	if(AUTO_FULLSCREEN) toggleFullScreen();
}

function pressEnter() {
	if(event.keyCode === 13) {
		document.removeEventListener("keyup", pressEnter);
		startGame();
	}
}

export const init = function(env) {
	ops = env;
	controls = document.getElementById("controls");
	grid = document.getElementById("grid");
	body = document.getElementsByTagName("body")[0];
	body.addEventListener("click", startGame);
	document.addEventListener("keyup", pressEnter);
	if(AUTO_FULLSCREEN) {
		body.addEventListener("click", toggleFullScreen);
		document.addEventListener("fullscreenchange", fullscreenOff);
		document.addEventListener("mozfullscreenchange", fullscreenOff);
		document.addEventListener("msfullscreenchange", fullscreenOff);
		document.addEventListener("webkitfullscreenchange", fullscreenOff);
	}
}
