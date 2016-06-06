"use strict";
const MAX_INT = Math.pow(2,32) - 1;
const ops = window.ops;
const mod = false;
import * as audio from "./ops.audio";
export const buttons = [
	{code:38,id:"opAdd",
		op:(state) => state.register++, 
		mod:(state) => state.register |= (Math.pow(2,state.width) - 1),
		sound:audio.sounds.plus, modSound:audio.sounds.fill,
		active:false, revealed:false
	},
	{code:40,id:"opSub",
		op:(state) => {if(state.register > 0) state.register--}, 
		mod:(state) => state.register &= (MAX_INT - (Math.pow(2,state.width) - 1)),
		sound:audio.sounds.minus, modSound:audio.sounds.flush,
		active:false, revealed:false
	},
	{code:37,id:"opLShift",
		op:(state) => state.register <<= 1, mod:(state) => false,
		sound:audio.sounds.lshift, modSound:() => false,
		active:false, revealed:false
	},
	{code:39,id:"opRShift",
		op:(state) => state.register >>= 1, mod:(state) => false, 
		sound:audio.sounds.rshift, modSound:() => false,
		active:false, revealed:false,
	},
	{code:32,id:"opBump",
		op:(state) => state.register <<= state.width, mod:(state) => state.register >>= state.width, 
		sound:audio.sounds.bump, modSound:audio.sounds.unbump,
		active:false, revealed:false
	},
	{code:88,id:"opFlip",
		op:(state) => state.register ^= MAX_INT, mod:(state) => state.register = 0, 
		sound:() => false, modSound:() => false,
		active:false, revealed:false
	},
	{code:104, id:"opDesignTaller",
		op:(state) => {if(state.designMode) state.currentLevel.height++}, mod:(state) => false,
		sound:() => false, modSound:() => false,
		active:false, revealed:false
	},
	{code:98,id:"opDesignShorter",
		op:(state) => {if(state.designMode && state.currentLevel.height > 1) state.currentLevel.height--}, mod:(state) => false,
		sound:() => false, modSound:() => false,
		active:false, revealed:false
	},
	{code:100,id:"opDesignWider",
		op:(state) => {if(state.designMode) state.currentLevel.width++}, mod:(state) => false,
		sound:() => false, modSound:() => false,
		active:false, revealed:false
	},
	{code:102,id:"opDesignNarrower",
		op:(state) => {if(state.designMode && state.currentLevel.width > 1) state.currentLevel.width--}, mod:(state) => false,
		sound:() => false, modSound:() => false,
		active:false, revealed:false
	},
];

export function getControl(name) {
	return buttons.filter((btn) => btn.id == name)[0];
}

export function getControlByKeyCode(code) {
	return buttons.filter((btn) => btn.code == code)[0];
}

export function revealKeys(keys) {
	var def = (keys === undefined?true:false);
	buttons.forEach((btn) => btn.revealed = def);
	if(keys !== undefined) buttons.filter((btn) => keys.indexOf(btn.id) !== -1).forEach((btn) => btn.revealed = true);
}

export const validKeys = buttons.map((button) => button.code);
