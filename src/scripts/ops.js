"use strict";
const ops = {};
window.ops = ops;
window.addEventListener("load", function() {
	const MAX_OVER_PAR = 5;
	const DEBUG = true;

	var state;
	var controls;
	var validKeys;
	var sounds = window.ops.sounds, levels = window.ops.levels;
	var levelsCleared = 0;
	var glitchesCleared = 0;
	var glitchesFound = 0;
	var glitchIntervals = [3,5,8,13,21,24,55,89,144,233];
	var glitched = false;		
	var glitchExponentBase = 1.5;
	var score = 0;
	var paused = false;
	var levelStarting = true;
	var complete = false;
	var gameOver = false;
	var currentLevel = levels[0]; currentLevel.name = 1;
	var crashed = false;
	var modKey = 0;
	var lastOp = {code:false, id:""};


	// finds the difference between the par score and the current score
	function parScoreDelta() {
		return score - (levelsCleared * 10);
	}

	function whichGlitch() {
		return glitchIntervals[glitchesFound % glitchIntervals.length];
	}

	/**
	 * Creates a new level state from level data.
	 * @param {object} level data
	 * @param {string} name level name
	 * @return {object}
	 */
	function newState(level) {
		var data = new Uint32Array(8);
		var state = {
			data:data
		}
		Object.defineProperties(state, {
			register:{get:() => data[0], set:(val) => {val = val|0; data[0] = val}},
			flip:{get:() => data[1], set:(val) => {val = val|0; data[1] = val}},
			ops:{get:() => data[2], set:(val) => {val = val|0; data[2] = val}},
			par:{get:() => data[3], set:(val) => {val = val|0; data[3] = val}},
			level:{get:() => data[4], set:(val) => {val = val|0; data[4] = val}},
			width:{get:() => data[5], set:(val) => {val = val|0; data[5] = val}},
			height:{get:() => data[6], set:(val) => {val = val|0; data[6] = val}},
			target:{get:() => data[7], set:(val) => {val = val|0; data[7] = val}},
		});
		complete = false;
		state.register = level.register;
		state.target = level.target;
		state.flip = 0;
		// apply special blocks to target to save level design headaches
		if(level.holes) state.target ^= (state.target & level.holes);
		if(level.burns) state.target |= level.burns;
		if(level.shorts) {
			if(state.target & 1) state.target |= currentLevel.shorts;
			else state.target ^= (state.target & currentLevel.shorts);
		}
		state.par = level.par;
		state.name = level.name;
		state.width = level.width;
		state.height = level.height;
		return state;
	}

	function pause() {
		paused = true;
	}

	function unPause() {
		paused = false;
	}

	// trims a value such that its bits all fit within the grid 
	function trim(val, width, height) {
		return val & (Math.pow(2, width * height) - 1);
	}

	function trimStateFields() {
		state.register = trim(state.register, currentLevel.width, currentLevel.height);
		state.target = trim(state.target, currentLevel.width, currentLevel.height);
		state.flip = trim(state.flip, currentLevel.width, currentLevel.height);
	}

	function applyFeatures() {
		if(currentLevel.holes !== undefined) state.register ^= (state.register & currentLevel.holes);
		if(currentLevel.burns !== undefined) state.register |= currentLevel.burns;
		if(currentLevel.shorts !== undefined) {
			if(state.register & 1) state.register |= currentLevel.shorts;
			else state.register ^= (state.register & currentLevel.shorts);
		}
	}

	function createGlitchLevel() {
		var seed = parScoreDelta() + levelsCleared + glitchesCleared + whichGlitch();
		var tmp = 0;
		var width = Math.max(3, (seed & 5) + 1);
		var height = Math.max(2, ((seed & 5) ^ (seed % 2)) + 1);

		var register = trim(state.register ^ seed | (seed << 4) | (seed << 9) + seed, width, height);
		var target = trim(state.target   | seed ^ (seed << 6) | (seed << 16) + seed, width, height);
		if(target == register) register &= 19029;
		if(target == register) register = 0; // just in case that's somehow the same!
		var level = {
			width:width,
			height:height,
			name:"&#"+(seed + 160)+";",
			target:target,
			register:register,
			par: 0
		}
		level.par = level.target.toString(2).split("").reduce((prev, cur) => {
			return parseInt(prev + parseInt(cur));
		}, 0) * 2;
		return level;
	}

	function setupLevel() {
		crashed = false;
		unPause();
		state = newState(currentLevel);
		levelStarting = true;
		applyFeatures();
		ops.setupLevelDisplay();
		levelStarting = false;
	}

	function crash() {
		sounds.crash();
		crashed = true;
		pause();
		score -= 3;
		setTimeout(function() {
			currentLevel = levels[levelsCleared];
			currentLevel.name = levelsCleared + 1;
			glitched = false;
			setupLevel();
		}, 2000); 
		ops.updateDisplay();
	}
	
	function endGame() {
		state.ops = 0;
		currentLevel.par = 0;
		currentLevel.name = "END";
		gameOver = true;
		sounds.endGame();
		ops.updateDisplay();
	}

	function completeLevel() {
		complete = true;
		if(glitched) {
			glitched = false;
			glitchesCleared++;
		}
		else {
			levelsCleared++;
			score += Math.max(0, (10 - (state.ops - state.par)));
		}
		if(parScoreDelta() > whichGlitch()) {
			glitched = true;
			glitchesFound++;
		}
		ops.updateDisplay();
		if(glitched) {
			currentLevel = createGlitchLevel();
			sounds.glitch();
		}
		else {
			if(levels[levelsCleared] !== undefined) {
				currentLevel = levels[levelsCleared];
				currentLevel.name = levelsCleared + 1;
				sounds.complete();
			}
			else {
				return endGame();
			}
		}
		setTimeout(setupLevel, 1000);
	}

	function checkComplete() {
		if(state.register === state.target) {
			pause();
			complete = 1;
			setTimeout(completeLevel, 500);
			return 1;
		}
		else if(state.ops > state.par + MAX_OVER_PAR) {
			crash();
		}
		return 0;
	}

	function controlDown(key) {
		document.getElementById(key).classList.add("down");
	}

	function controlUp(key) {
		document.getElementById(key).classList.remove("down");
	}

	function opCall(control) {
		if(paused) return;
		var {code, id, op, mod, sound, modSound} = control;
		var oldRegister = state.register;
		lastOp = control;
		if(modKey) {
			mod(state);
			modSound();
			lastOp.modded = true;
		}
		else {
			op(state);
			sound();
			lastOp.modded = false;
		}
		controlUp(id);
		state.ops++;
		state.flip = (state.register ^ oldRegister);
		applyFeatures();
		trimStateFields();
		ops.updateDisplay();
		// clear the flips now so they don't flicker
		state.flip = state.register;
		checkComplete();
		return false; // prevent bubbling for click events
	}

	function getControlForKeyCode(code) {
		return controls.filter((el) => el.code === code)[0];
	}

	function getControlForId(id) {
		return controls.filter((el) => el.id === id)[0];
	}

	function setMod(val) {
		modKey = val;
		ops.updateDisplay();
	}

	function toggleMod() {
		setMod(modKey?0:1);
	}

	function bindKeys() {
		window.addEventListener("keydown", function(event) {
			if(event.keyCode === 16) setMod(1);
			if(validKeys.indexOf(event.keyCode) !== -1) {
				event.preventDefault();
				var {id} = getControlForKeyCode(event.keyCode);
				controlDown(id);
				ops.updateDisplay();
				return false;
			}
		});
		window.addEventListener("keyup", function(event) {
			if(event.keyCode === 16) setMod(0);
			if(validKeys.indexOf(event.keyCode) !== -1) {
				event.preventDefault();
				var control = getControlForKeyCode(event.keyCode);
				opCall(control);
				return false;
			}
		});
		document.getElementById("opAdd").addEventListener("click", opCall.bind(null, getControlForId("opAdd")));
		document.getElementById("opSub").addEventListener("click", opCall.bind(null, getControlForId("opSub")));
		document.getElementById("opLShift").addEventListener("click", opCall.bind(null, getControlForId("opLShift")));
		document.getElementById("opRShift").addEventListener("click", opCall.bind(null, getControlForId("opRShift")));
		document.getElementById("opBump").addEventListener("click", opCall.bind(null, getControlForId("opBump")));
		document.getElementById("opFlip").addEventListener("click", opCall.bind(null, getControlForId("opFlip")));
		document.getElementById("opMod").addEventListener("click", function() {toggleMod()});
	}

	ops.stateInfo = function() {
		return {
			glitched,
			levelsCleared,
			glitchesCleared,
			glitchesFound,
			currentLevel,
			gameOver,
			crashed,
			levelStarting,
			score,
			ops:state.ops,
			register:state.register,
			complete:complete,
			flip:state.flip,
			paused:paused,
			modKey:modKey,
			lastOp:lastOp
		}
	}

	if(DEBUG) {
		ops.debug = function() {
			return {
				state:state,
				levelsCleared:levelsCleared, 
				glitchesCleared:glitchesCleared,
				glitched:glitched,
				glitchIntervals:glitchIntervals,
				score:score,
				parDelta:parScoreDelta(),
				modKey:modKey,
				currentLevel
			}
		}

		ops.skip = function(level) {
			levelsCleared = level - 1;
			currentLevel = levels[levelsCleared];
			currentLevel.name = level;
			score = levelsCleared * 10;
			setupLevel();
			ops.updateDisplay();
		}

		ops.glitch = function(delta, lCleared, gCleared) {
			glitched = true;
			levelsCleared = lCleared;
			glitchesCleared = gCleared;
			score = levelsCleared * 10 + delta;
			currentLevel = levels[levelsCleared];
			currentLevel.name = levelsCleared + 1;
			setupLevel();
			currentLevel = createGlitchLevel();
			setupLevel();
			ops.updateDisplay();
		}
	}

	ops.calcFinalScore = function() {
		return score + Math.ceil(score * (Math.pow(glitchExponentBase, glitchesCleared) - 1));
	}

	ops.setupGame = function() {
		ops.setupControls();
		controls = ops.controls;
		validKeys = ops.validKeys;
		setupLevel();
		bindKeys();
	}
});
