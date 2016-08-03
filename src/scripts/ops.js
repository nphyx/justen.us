"use strict";
import * as display from "./ops.display";
import * as controls from "./ops.controls";
import * as levels from "./ops.levels";
import * as audio from "./ops.audio";
export const ops = {
	display:display,
	controls:controls,
	levels:levels.levelData,
	audio:audio
};
window.ops = ops;
window.addEventListener("load", function() {
	const MAX_OVER_PAR = 5;
	const DEBUG = true;
	const LEVEL_END_DELAY = 2000;

	var state;
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
	var currentLevel = levels.levelData[0]; currentLevel.name = 1;
	var crashed = false;
	var modKey = 0;
	var lastOp = {code:false, id:""};
	var designMode = false;

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
			data:data,
			currentLevel:currentLevel
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
			name:(seed + 160),
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
		modKey = 0;
		unPause();
		state = newState(currentLevel);
		levelStarting = true;
		applyFeatures();
		controls.revealKeys(currentLevel.revealed);
		levelStarting = false;
	}
	
	function endGame() {
		state.ops = 0;
		currentLevel.par = 0;
		currentLevel.name = "END";
		gameOver = true;
		audio.sounds.endGame();
	}

	function crash() {
		audio.sounds.crash();
		crashed = true;
		pause();
		score -= 3;
		setTimeout(function() {
			currentLevel = levels.levelData[levelsCleared];
			currentLevel.name = levelsCleared + 1;
			glitched = false;
			setupLevel();
		}, LEVEL_END_DELAY); 
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
			audio.sounds.glitch();
		}
		else {
			if(levels.levelData[levelsCleared] !== undefined) {
				audio.sounds.complete();
			}
			else {
				return endGame();
			}
		}
		setTimeout(function() {
			if(glitched) {
				currentLevel = createGlitchLevel();
			}
			else {
				currentLevel = levels.levelData[levelsCleared];
				currentLevel.name = levelsCleared + 1;
			}
			setupLevel();
		}, LEVEL_END_DELAY); 
	}

	function checkComplete() {
		if(designMode) return;
		if(state.register === state.target) {
			pause();
			setTimeout(completeLevel, LEVEL_END_DELAY/4);
			return 1;
		}
		else if(state.ops >= state.par + MAX_OVER_PAR) {
			crash();
			return 1;
		}
		return 0;
	}

	function opCall(control) {
		if(paused) return;
		var {code, id, op, mod, sound, modSound} = control;
		var oldRegister = state.register;
		lastOp = control;
		// design mode needs updating
		state.designMode = designMode;
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
		state.flip = (state.register ^ oldRegister);
		applyFeatures();
		trimStateFields();
		state.ops++;
		checkComplete(); // check before incrementing
		// clear the flips now so they don't flicker
		state.flip = state.register;
		return false; // prevent bubbling for click events
	}

	function setMod(val) {
		modKey = val;
	}

	function toggleDesignMode() {
		if(designMode === true) {
			designMode = false;
			return;
		}
		designMode = true;
		setupLevel();
	}

	function bindKeys() {
		var btn;
		window.addEventListener("keydown", function(event) {
			if(event.keyCode === 16) setMod(1);
			if(controls.validKeys.indexOf(event.keyCode) !== -1) {
				event.preventDefault();
				btn = controls.getControlByKeyCode(event.keyCode);
				btn.active = true;
				return false;
			}
		});
		window.addEventListener("keyup", function(event) {
			if(event.keyCode === 16) setMod(0);
			if(event.keyCode === 68) toggleDesignMode();
			if(controls.validKeys.indexOf(event.keyCode) !== -1) {
				event.preventDefault();
				btn = controls.getControlByKeyCode(event.keyCode);
				opCall(btn);
				btn.active = false;
				return false;
			}
		});
	}

	ops.logoInfo = function() {
		return {
			glitched:false,
			levelsCleared:0,
			glitchesCleared:0,
			glitchesFound:0,
			currentLevel: {
				par:5,width:4,height:4,
				target:0b0100100000010010,
				holes: 0b0001000000001000,
				shorts:0b0000000110000000,
				burns: 0b0010000000000100,
				register:0,
				revealed:0
			},
			gameOver:0,
			crashed:0,
			levelStarting:0,
			score:0,
			ops:0,
			register:0b1100100100010011,
			complete:0,
			flip:0,
			paused:false,
			modKey:false,
			lastOp:undefined,
			designMode:false
		}
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
			lastOp:lastOp,
			designMode:designMode
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
			currentLevel = levels.levelData[levelsCleared];
			currentLevel.name = level;
			score = levelsCleared * 10;
			setupLevel();
		}

		ops.glitch = function(delta, lCleared, gCleared) {
			glitched = true;
			levelsCleared = lCleared;
			glitchesCleared = gCleared;
			score = levelsCleared * 10 + delta;
			currentLevel = levels.levelData[levelsCleared];
			currentLevel.name = levelsCleared + 1;
			setupLevel();
			currentLevel = createGlitchLevel();
			setupLevel();
		}
	}

	ops.calcFinalScore = function() {
		return score + Math.ceil(score * (Math.pow(glitchExponentBase, glitchesCleared) - 1));
	}

	ops.startGame = function() {
		setupLevel();
		bindKeys();
	}
	display.init(ops);
	display.setup();
});
