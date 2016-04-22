"use strict";
window.addEventListener("load", function() {
	var state;

	var levels = [
		{par:1,width:4,height:1,target:1,register:0,keysOn:["up"]},
		{par:2,width:4,height:1,target:2,register:0},
		{par:3,width:4,height:1,target:3,register:0},
		{par:1,width:4,height:1,target:2,register:1,keysOn:["left"]},
		{par:3,width:4,height:1,target:8,register:1},
		{par:1,width:4,height:1,target:10,register:5},
		{par:1,width:4,height:1,target:0,register:1,keysOn:["down"]},
		{par:3,width:4,height:1,target:0,register:3},
		{par:1,width:4,height:1,target:6,register:7},
		{par:1,width:4,height:1,target:1,register:2,keysOn:["right"]},
		{par:3,width:4,height:1,target:1,register:8},
		{par:1,width:4,height:1,target:5,register:10},
		/*
		{par:2,width:4,height:2,target:32,register:8},
		*/
	];

	var grid = document.getElementById("grid");

	function newState(level, number, score) {
		var state = {
			register:new Uint8Array(1),
			target:new Uint8Array(1),
			ops:new Uint8Array(1),
			par:level.par,
			score:score,
			width:level.width,
			height:level.height,
			level:number,
			complete:0,
			paused:0
		}
		state.target[0] = level.target;
		state.register[0] = level.register;
		return state;
	}


	function updateGrid() {
		var i = 0, max = state.width*state.height, nodes = new Array(max),
		    targets = state.target[0].toString(2).split("").reverse(),
		    registers = state.register[0].toString(2).split("").reverse(),
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
		document.getElementById("score-ops").innerHTML = state.ops;
		document.getElementById("score-hi").innerHTML = state.score;
		document.getElementById("score-par").innerHTML = state.par;
		document.getElementById("score-level").innerHTML = state.level;
	}

	function keysOn(keys) {
		["up","down","left","right"].forEach((key) => document.getElementById(key).classList.add("hidden"));
		keys.forEach((key) => document.getElementById(key).classList.remove("hidden"));
	}

	function nextLevel() {
		document.getElementById("grid").classList.remove("complete");
		var level;
		var score = state.score + Math.max(0, (10 - (state.ops - state.par)));
		var next = state.level;
		if(levels[next] !== undefined) {
			level = levels[next];
			state = newState(level, next+1, score);
			state.score = score;
			if(level.keysOn) keysOn(level.keysOn);
			updateScoreboard();
			updateGrid();
		}
		else {
			state.score = score;
			state.ops = 0;
			state.par = 0;
			state.level = 0;
			updateScoreboard();
			grid.innerHTML = "";
			var node = document.createElement("span");
			node.id = "complete";
			node.appendChild(document.createTextNode("You finished the game!"));
			node.appendChild(document.createElement("br"));
			node.appendChild(document.createTextNode("Your score: " + score));
			grid.appendChild(node);
		}
	}

	function completeLevel() {
		document.getElementById("grid").classList.add("complete");
		updateGrid();
		setTimeout(nextLevel, 1000);
	}

	function checkComplete() {
		if(state.register[0] === state.target[0]) {
			state.complete = 1;
			state.paused = 1;
			updateGrid();
			setTimeout(completeLevel, 500);
			return 1;
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
		state.register[0] &= Math.pow(2, state.width * state.height) - 1;
	}

	function opAdd() {
		state.register[0]++;
		state.ops[0]++;
		trimRegister();
	}

	function opSub() {
		if(state.register[0] > 0) {
			state.register[0]--;
			trimRegister();
		}
		state.ops[0]++;
	}

	function opLShift() {
		state.register[0] = state.register[0] << 1;
		state.ops[0]++;
		trimRegister();
	}

	function opRShift() {
		state.register[0] = state.register[0] >> 1;
		state.ops[0]++;
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

	state = newState(levels[0], 1, 0);
	state.target[0] = state.level;
	bindKeys();
	updateGrid();
	updateScoreboard();
});
