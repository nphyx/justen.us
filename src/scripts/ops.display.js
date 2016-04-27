"use strict";
var grid, body, info, controls;
var ops = window.ops;
var glitchChars = [9632,9600,9625,9622,9626,9630,9631,9628,9627];
var fullscreen = false;

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

function makeGlitches() {
	var i;
	var string = "";
	for(i = 0; i < info.glitchesCleared; i++) {
		string += "&#"+glitchChars[(Math.floor(Math.random()*glitchChars.length))]+";";
	}
	return string;
}

function splitBits(val) {
	return val.toString(2).split("").reverse().map((n) => n === "1");
}
var flipout;
function updateGrid() {
	var width = info.currentLevel.width;
	var height = info.currentLevel.height;
	var holes, burns, shorts, feature;
	var i = 0, max = width*height, nodes = new Array(max),
			targets = splitBits(info.currentLevel.target),
			registers = splitBits(info.register),
			flips = splitBits(info.flip),
			node;
	if(info.currentLevel.holes) holes = splitBits(info.currentLevel.holes);
	if(info.currentLevel.burns) burns = splitBits(info.currentLevel.burns);
	if(info.currentLevel.shorts) shorts = splitBits(info.currentLevel.shorts);
	grid.innerHTML = "";

	for(; i < max; ++i) {
		feature = false;
		node = document.createElement("span");
		node.classList.add("bit");
		if(targets[i]) node.classList.add("target");
		if(holes && holes[i]) {
			feature = true;
			node.classList.add("hole");
		}
		if(burns && burns[i]) {
			feature = true;
			node.classList.add("burn");
		}
		if(shorts && shorts[i]) node.classList.add("short");
		if(registers[i] && !feature) node.classList.add("filled");
		if(flips[i]) node.classList.add("flipped");
		nodes.push(node);
		if((i > 0) && ((i+1) % width === 0)) nodes.push(document.createElement("br"));
	}
	nodes.reverse();
	nodes.forEach((node, i) => grid.appendChild(node));

	// now apply changed animations
	if(flipout) {
		clearTimeout(flipout);
		flipout = undefined;
	}
	setTimeout(function() {
		var nodes = document.querySelectorAll("#grid span.bit.flipped");
		if(nodes.length) {
		  nodes = Array.prototype.slice.call(nodes, 0);
			nodes.reverse();
			nodes.forEach(function(el, i) {
				el.classList.remove("flipped");
			});
		}
	}, 350);
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

function updateScoreboard() {
	document.getElementById("score-ops").innerHTML = (info.currentLevel.par - info.ops).toString();
	document.getElementById("score-hi").innerHTML = info.score;
	document.getElementById("score-level").innerHTML = info.currentLevel.name;
	document.getElementById("glitches").innerHTML = makeGlitches();
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
	toggleFullScreen();
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
	body.addEventListener("click", toggleFullScreen);
	document.addEventListener("fullscreenchange", fullscreenOff);
	document.addEventListener("mozfullscreenchange", fullscreenOff);
	document.addEventListener("msfullscreenchange", fullscreenOff);
	document.addEventListener("webkitfullscreenchange", fullscreenOff);
});
