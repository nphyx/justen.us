"use strict";
window.addEventListener("load", function() {
	var state;

	var glitches = [5];
	var glitched = false;
	var glitchesCleared = 0;
	var glitchChars = [9632,9633,9600,9625,9622,9626,9630,9631,9628,9627];
	var score = 0;

	var levels = [
		{par:1,width:4,height:1,target:1,register:0,keysOn:["up"]},
		{par:2,width:4,height:1,target:2,register:0},
		{par:3,width:4,height:1,target:3,register:0},
		{par:9,width:4,height:1,target:9,register:0},
		{par:1,width:4,height:1,target:2,register:1,keysOn:["left"]},
		{par:3,width:4,height:1,target:8,register:1},
		{par:1,width:4,height:1,target:10,register:5},
		{par:2,width:4,height:1,target:12,register:3},
		{par:1,width:4,height:1,target:1,register:2,keysOn:["right"]},
		{par:3,width:4,height:1,target:1,register:8},
		{par:1,width:4,height:1,target:5,register:10},
		{par:2,width:4,height:1,target:3,register:12},
		{par:1,width:4,height:1,target:0,register:1,keysOn:["down"]},
		{par:3,width:4,height:1,target:0,register:3},
		{par:1,width:4,height:1,target:6,register:7},
		{par:6,width:4,height:1,target:9,register:15},
		{par:2,width:4,height:2,target:32,register:8,keysOn:["up","left"]},
	];

	var grid = document.getElementById("grid");


	function makeGlitchScore() {
		var i;
		var string = "";
		for(i = 0; i < glitchesCleared; i++) {
			string += "&#"+glitchChars[(Math.floor(Math.random()*glitchChars.length))]+";";
		}
		return string;
	}

	function newState(level, number) {
		var data = new Uint8Array(10);
		var state = {
			data:data
		};
		Object.defineProperties(state, {
			register:{get:() => data[0], set:(val) => {val = val|0; data[0] = val}},
			target:{get:() => data[1], set:(val) => {val = val|0; data[1] = val}},
			ops:{get:() => data[2], set:(val) => {val = val|0; data[2] = val}},
			par:{get:() => data[3], set:(val) => {val = val|0; data[3] = val}},
			level:{get:() => data[4], set:(val) => {val = val|0; data[4] = val}},
			width:{get:() => data[5], set:(val) => {val = val|0; data[5] = val}},
			height:{get:() => data[6], set:(val) => {val = val|0; data[6] = val}},
			complete:{get:() => data[7], set:(val) => {val = val|0; data[7] = val}},
			paused:{get:() => data[8], set:(val) => {val = val|0; data[8] = val}},
			nextLevel:{get:() => data[9], set:(val) => {val = val|0; data[9] = val}}
		});
		state.register = level.register;
		state.target = level.target;
		state.par = level.par;
		state.level = number;
		state.nextLevel = number;
		state.width = level.width;
		state.height = level.height;
		state.complete = 0;
		state.paused = 0;
		return state;
	}



	function updateGrid() {
		var i = 0, max = state.width*state.height, nodes = new Array(max),
		    targets = state.target.toString(2).split("").reverse(),
		    registers = state.register.toString(2).split("").reverse(),
				node;
		grid.innerHTML = "";

		for(; i < max; ++i) {
			node = document.createElement("span");
			node.classList.add("bit");
			if(targets[i] === "1") node.classList.add("target");
			if(registers[i] === "1") node.classList.add("filled");
			nodes.push(node);
			if((i > 0) && ((i+1) % state.width === 0)) nodes.push(document.createElement("br"));
		}
		nodes.reverse();
		nodes.forEach((node, i) => grid.appendChild(node));
	}

	function updateScoreboard() {
		document.getElementById("score-ops").innerHTML = state.ops.toString();
		document.getElementById("score-hi").innerHTML = score;
		document.getElementById("score-par").innerHTML = state.par;
		document.getElementById("score-level").innerHTML = state.level;
		document.getElementById("score-glitch").innerHTML = makeGlitchScore();
	}

	function keysOn(keys) {
		["up","down","left","right"].forEach((key) => document.getElementById(key).classList.add("hidden"));
		keys.forEach((key) => document.getElementById(key).classList.remove("hidden"));
	}

	function setupGlitch() {
		var number = state.level;
		var grid = document.getElementById("grid");
		var level = levels[state.nextLevel];
		var tmp = 0;
		glitched = true;
		console.log("setting up glitch before level "+number);
		grid.classList.remove("glitching");
		document.getElementsByTagName("body")[0].classList.add("glitched");
		state = newState(level, number);
		tmp = state.width;
		state.width = state.height;
		state.height = tmp;
		state.par *= number;
		state.register ^= number;
		state.target |= number;
		if(level.keysOn) keysOn(level.keysOn);
		updateScoreboard();
		updateGrid();
	}

	function glitch() {
		console.log("glitched!");
		document.getElementById("grid").classList.remove("complete");
		document.getElementById("grid").classList.add("glitching");
		glitches.shift();
		setTimeout(setupGlitch, 1000);
	}

	function crash() {
		state.paused = 1;
		score -= 3;
		document.getElementById("grid").classList.add("crashed");
	}

	function setupLevel(num) {
		var grid = document.getElementById("grid");
		var level = levels[num];
		grid.classList.remove("crashed");
		grid.classList.remove("glitching");
		document.getElementsByTagName("body")[0].classList.remove("glitched");
		state = newState(level, num+1);
		if(level.keysOn) keysOn(level.keysOn);
		updateScoreboard();
		updateGrid();
	}

	function nextLevel() {
		document.getElementById("grid").classList.remove("complete");
		var level;
		var next = state.level;
		if(levels[next] !== undefined) setupLevel(next);
		else {
			state.ops = 0;
			state.par = 0;
			state.level = 0;
			updateScoreboard();
			grid.innerHTML = "";
			var node = document.createElement("span");
			node.id = "complete";
			var finalScore = score + Math.ceil(score * (Math.pow(1.5, glitchesCleared) - 1));
			node.appendChild(document.createTextNode("You finished the game!"));
			node.appendChild(document.createElement("br"));
			node.appendChild(document.createTextNode("Your score: " + finalScore));
			grid.appendChild(node);
		}
	}

	function completeLevel() {
		document.getElementById("grid").classList.add("complete");
		if(glitched) {
			glitched = false;
			glitchesCleared++;
			console.log("cleared", glitchesCleared);
		}
		else score += Math.max(0, (10 - (state.ops - state.par)));
		if((glitches.length > 0) && score >= ((state.level) * 10 + glitches[0])) {
			glitch();
		}
		else setTimeout(nextLevel, 1000);
		updateGrid();
	}

	function checkComplete() {
		if(state.register === state.target) {
			state.complete = 1;
			state.paused = 1;
			updateGrid();
			setTimeout(completeLevel, 500);
			return 1;
		}
		else if(state.ops > state.par + 10) {
			glitched = false;
			crash();
			setTimeout(setupLevel.bind(null, state.level - 1), 2000); 
		}
		return 0;
	}

	function controlDown(key) {
		document.getElementById(key).classList.add("down");
	}

	function controlUp(key) {
		document.getElementById(key).classList.remove("down");
	}

	function trimRegister() {
		state.register &= Math.pow(2, state.width * state.height) - 1;
	}

	function opAdd() {
		state.register++;
		state.ops++;
		trimRegister();
	}

	function opSub() {
		if(state.register > 0) {
			state.register = state.register - 1;
			trimRegister();
		}
		state.ops = state.ops + 1;
	}

	function opLShift() {
		state.register = state.register << 1;
		state.ops++;
		trimRegister();
	}

	function opRShift() {
		state.register = state.register >> 1;
		state.ops++;
		trimRegister();
	}

	function bindKeys() {
		window.addEventListener("keydown", function(event) {
			if(!state.paused) switch(event.keyCode) {
				case 38:
					event.preventDefault();
					controlDown("up");
				break;
				case 40:
					event.preventDefault();
					controlDown("down");
				break;
				case 37:
					event.preventDefault();
					controlDown("left");
				break;
				case 39:
					event.preventDefault();
					controlDown("right");
				break;
			}
		});
		window.addEventListener("keyup", function(event) {
			if(!state.paused) {
				switch(event.keyCode) {
					case 38:
						event.preventDefault();
						controlUp("up");
						opAdd();
					break;
					case 40:
						event.preventDefault();
						controlUp("down");
						opSub();
					break;
					case 37:
						event.preventDefault();
						controlUp("left");
						opLShift();
					break;
					case 39:
						event.preventDefault();
						controlUp("right");
						opRShift();
					break;
				}
				updateScoreboard();
				if(!checkComplete()) updateGrid();
			}
		});
	}
	setupLevel(0, 0);
	bindKeys();
	updateGrid();
	updateScoreboard();
});
