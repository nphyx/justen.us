"use strict";
var grid, body, info;
var ops = window.ops;
var glitchChars = [9632,9600,9625,9622,9626,9630,9631,9628,9627];

function flashElement(el, time) {
	el.classList.add("flash");
	setTimeout(() => el.classList.remove("flash"), time);
}

function levelFlashes() {
	flashElement(document.getElementById("score-level"), 750);
	setTimeout(() => flashElement(document.getElementById("score-par"), 750), 750);
	setTimeout(() => flashElement(document.getElementById("controls"), 750), 1500);
}

function makeGlitches() {
	var i;
	var string = "";
	for(i = 0; i < info.glitchesCleared; i++) {
		string += "&#"+glitchChars[(Math.floor(Math.random()*glitchChars.length))]+";";
	}
	return string;
}

function updateGrid() {
	var width = info.currentLevel.width;
	var height = info.currentLevel.height;
	var register = info.register;
	var target = info.currentLevel.target;
	var i = 0, max = width*height, nodes = new Array(max),
			targets = target.toString(2).split("").reverse(),
			registers = register.toString(2).split("").reverse(),
			node;
	grid.innerHTML = "";

	for(; i < max; ++i) {
		node = document.createElement("span");
		node.classList.add("bit");
		if(targets[i] === "1") node.classList.add("target");
		if(registers[i] === "1") node.classList.add("filled");
		nodes.push(node);
		if((i > 0) && ((i+1) % width === 0)) nodes.push(document.createElement("br"));
	}
	nodes.reverse();
	nodes.forEach((node, i) => grid.appendChild(node));
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
}

function keysOn(keys) {
	["up","down","left","right","space"].forEach((key) => document.getElementById(key).classList.add("hidden"));
	keys.forEach((key) => document.getElementById(key).classList.remove("hidden"));
}

function startEffects() {
	if(info.glitched) body.classList.add("glitched");
	if(info.crashed) grid.classList.add("crashed");
	if(info.complete) grid.classList.add("complete");
	if(info.levelStarting) levelFlashes();
}

function updateScoreboard() {
	document.getElementById("score-ops").innerHTML = info.ops.toString();
	document.getElementById("score-hi").innerHTML = info.score;
	document.getElementById("score-par").innerHTML = info.currentLevel.par;
	document.getElementById("score-level").innerHTML = info.currentLevel.name;
	document.getElementById("glitches").innerHTML = makeGlitches();
}

ops.setupDisplay = function() {
	grid = document.getElementById("grid");
	body = document.getElementsByTagName("body")[0];
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
