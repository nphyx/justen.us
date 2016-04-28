"use strict";
const MAX_INT = Math.pow(2,32) - 1;
const ops = window.ops;
ops.setupControls = function() {
	var mod = false;
	ops.controls = [
		{code:38,id:"opAdd",
			op:(state) => state.register++, 
			mod:(state) => state.register |= (Math.pow(2,state.width) - 1),
			sound:ops.sounds.plus, modSound:ops.sounds.fill},
		{code:40,id:"opSub",
			op:(state) => {if(state.register > 0) state.register--}, 
			mod:(state) => state.register &= (MAX_INT - (Math.pow(2,state.width) - 1)),
			sound:ops.sounds.minus, modSound:ops.sounds.flush},
		{code:37,id:"opLShift",
			op:(state) => state.register <<= 1, mod:(state) => false,
			sound:ops.sounds.lshift, modSound:() => false},
		{code:39,id:"opRShift",
			op:(state) => state.register >>= 1, mod:(state) => false, 
			sound:ops.sounds.rshift, modSound:() => false},
		{code:32,id:"opBump",
			op:(state) => state.register <<= state.width, mod:(state) => state.register >>= state.width, 
			sound:ops.sounds.bump, modSound:ops.sounds.unbump},
		{code:88,id:"opFlip",
			op:(state) => state.register ^= MAX_INT, mod:(state) => state.register = 0, 
			sound:() => false, modSound:() => false},
		{code:104, id:"opDesign",
			op:(state) => {if(state.designMode) state.currentLevel.height++}, mod:(state) => false,
			sound:() => false, modSound:() => false
		},
		{code:98,id:"opDesign",
			op:(state) => {if(state.designMode && state.currentLevel.height > 1) state.currentLevel.height--}, mod:(state) => false,
			sound:() => false, modSound:() => false
		},
		{code:100,id:"opDesign",
			op:(state) => {if(state.designMode) state.currentLevel.width++}, mod:(state) => false,
			sound:() => false, modSound:() => false
		},
		{code:102,id:"opDesign",
			op:(state) => {if(state.designMode && state.currentLevel.width > 1) state.currentLevel.width--}, mod:(state) => false,
			sound:() => false, modSound:() => false
		},

	];
	ops.validKeys = ops.controls.map((el) => el.code);
}
