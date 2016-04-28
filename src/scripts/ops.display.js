"use strict";
var grid, body, info, controls;
var ops = window.ops;
var glitchChars = [9632,9600,9625,9622,9626,9630,9631,9628,9627];
var fullscreen = false;
var flippin;
var flipout;
const AUTO_FULLSCREEN = true;
const FLIPTIME = 100;

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
	controls.classList.remove("mod");
}

function keysOn(keys) {
	ops.controls.map((control) => control.id)
		.forEach((key) => document.getElementById(key).classList.add("hidden"));
	keys.forEach((key) => document.getElementById(key).classList.remove("hidden"));
}

function startEffects() {
	if(info.glitched) body.classList.add("glitched");
	if(info.crashed) grid.classList.add("crashed");
	if(info.complete) grid.classList.add("complete");
	if(info.levelStarting) levelFlashes();
	if(info.modKey) controls.classList.add("mod");
}

function fullscreenOff(ev) {
	ev.preventDefault();
	if(document.webkitIsFullScreen || document.mozIsFullScreen || document.msIsFullScreen) fullscreen = true;
	else fullscreen = false;
	return false;
}

function flashElement(el, time) {
	el.classList.add("flash");
	setTimeout(() => el.classList.remove("flash"), time);
}

function levelFlashes() {
	flashElement(document.getElementById("score-level"), 750);
	setTimeout(() => flashElement(document.getElementById("score-ops"), 750), 750);
	setTimeout(() => flashElement(controls, 750), 1500);
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
	document.getElementById("glitches").innerHTML = makeGlitches();
}

function splitBits(val, max) {
	var string = (("0").repeat(max) + val.toString(2)).slice(-max);
	return string.split("").map((n) => n === "1");
}

function updateGrid() {
	var width = info.currentLevel.width;
	var height = info.currentLevel.height;
	var i = 0, max = width*height, holes = [], burns = [], shorts = [],
			registers = splitBits(info.register, max).reverse(),
			flips = splitBits(info.flip, max).reverse(),
			node, elements, bits, gen;
	var lastOp = info.lastOp.id;
	elements = document.querySelectorAll("#grid span.bit");
	bits = Array.prototype.slice.call(elements, 0);
	bits.reverse();
if(info.currentLevel.holes) holes = splitBits(info.currentLevel.holes, max).reverse();
		if(info.currentLevel.burns) burns = splitBits(info.currentLevel.burns, max).reverse();
		if(info.currentLevel.shorts) shorts = splitBits(info.currentLevel.shorts, max).reverse();

	bits.forEach(function(node, i) {
		node.classList.remove("filled");
		node.classList.remove("flipped");
		if((registers[i] && !holes[i] && !burns[i]) ||
			 (registers[0] && shorts[i])
			) node.classList.add("filled");
		if(flips[i]) node.classList.add("flipped");
	});

	if(flipout || flippin) {
		clearInterval(flippin);
		clearTimeout(flipout);
		flipout = undefined;
	}

	// now apply flipped animations
	elements = document.querySelectorAll("#grid span.bit.flipped");
	bits = Array.prototype.slice.call(elements, 0);
	gen = bitGenerator(bits);
	i = 0;
	if(lastOp === "opAdd" || 
	   lastOp === "opLShift" ||
		 lastOp === "opBump" && !lastOp.modded
	) bits.reverse();
	else flips.reverse();
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
ops.setupLevelDisplay = function() {
	clearEffects();
	info = ops.stateInfo();
	var width = info.currentLevel.width;
	var height = info.currentLevel.height;
	var holes = [], burns = [], shorts = [], feature;
	var i = 0, max = width*height, nodes = new Array(max),
			targets = splitBits(info.currentLevel.target, max).reverse(),
			registers = splitBits(info.register, max).reverse(),
			flips = splitBits(info.flip, max).reverse(),
			node;
	if(info.currentLevel.holes) holes = splitBits(info.currentLevel.holes, max).reverse();
	if(info.currentLevel.burns) burns = splitBits(info.currentLevel.burns, max).reverse();
	if(info.currentLevel.shorts) shorts = splitBits(info.currentLevel.shorts, max).reverse();
	grid.innerHTML = "";

	for(; i < max; ++i) {
		feature = false;
		node = document.createElement("span");
		node.classList.add("bit");
		if(targets[i] && !holes[i] && !burns[i] && !shorts[i]) node.classList.add("target");
		if(holes[i]) node.classList.add("hole");
		if(burns[i]) node.classList.add("burn");
		if(shorts[i]) node.classList.add("short");
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

function *bitGenerator(bits) {
	var i = 0;
	while(i < bits.length) {
		yield(bits[i]);
		i++;
	}
}

ops.bitGenTest = bitGenerator;

function endScreen() {
	grid.innerHTML = "";
	var node = document.createElement("span");
	node.id = "complete";
	node.appendChild(document.createTextNode("THE END"));
	node.appendChild(document.createElement("br"));
	node.appendChild(document.createTextNode("Final score: " + ops.calcFinalScore()));
	grid.appendChild(node);
}


ops.updateDisplay = function() {
	info = ops.stateInfo();
	clearEffects();
	if(info.gameOver) endScreen();
	else if(!info.complete) updateGrid();
	updateScoreboard();
	if(info.currentLevel.keysOn) keysOn(info.currentLevel.keysOn);
	startEffects();
}

function startGame() {
	ops.setupGame();
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

window.addEventListener("load", function() {
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
});
