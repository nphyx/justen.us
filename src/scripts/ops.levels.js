"use strict";
const ops = window.ops;
const U = ["opAdd"];
const D = ["opSub"];
const L = ["opLShift"];
const R = ["opRShift"];
const UL = ["opAdd","opLShift"];
const DR = ["opSub","opRShift"];
const LR = ["opLShift","opRShift"];
const LRU = ["opLShift","opRShift","opAdd"];
const DLR = ["opSub","opLShift","opRShift"];
const UDL = ["opAdd","opSub","opLShift"];
const UDLR = ["opAdd","opSub","opLShift","opRShift"];
const UDLRS = ["opAdd","opSub","opLShift","opRShift","opBump"];
export const conditions = {
	F_N:1,   // nightmare
	F_P:2,   // picture
	F_B:4,   // buffer
	F_W:8,   // wrap
	F_T:16,  // toggling targets
	G_P:32,  // parasitic glitch
	G_S:64,  // scrambled glitch
	G_I:128, // invisible glitch mod boxes
	G_V:256, // viral glitch
}
export const levelData = [
	{par:8,width:4,height:1,target:8,register:0,revealed:U}, // add tuts
	{par:8,width:2,height:2,target:8,register:0,revealed:U},
	{par:11,width:3,height:3,target:17,register:6,revealed:U},
	{par:4,width:4,height:4,target:128,register:124,revealed:U},
	{par:3,width:4,height:1,target:8,register:1,revealed:L}, // lshift tuts
	{par:6,width:3,height:3,target:128,register:2,revealed:L},
	{par:1,width:4,height:1,target:10,register:5,revealed:L},
	{par:2,width:3,height:2,target:36,register:9,revealed:L},
	{par:3,width:4,height:1,target:1,register:8,revealed:R}, // rshift tuts
	{par:2,width:2,height:2,target:3,register:12,revealed:R},
	{par:7,width:3,height:3,target:1,register:128,revealed:R},
	{par:1,width:4,height:1,target:5,register:10,revealed:R},
	{par:3,width:4,height:1,target:0,register:3,revealed:D}, // sub tuts
	{par:6,width:4,height:1,target:2,register:8,revealed:D},
	{par:8,width:3,height:2,target:8,register:16,revealed:D},
	{par:6,width:4,height:2,target:124,register:130,revealed:D},
	{par:3,width:4,height:2,target:34,register:8,revealed:UL},
	{par:2,width:4,height:2,target:96,register:194,revealed:DR},
	{par:4,width:4,height:4,target:32769,register:32766,revealed:LRU}, // introvert 
	{par:3,width:4,height:4,target:27030,register:59799,revealed:UDLR}, // all keys revealed
	{par:4,width:5,height:5,target:33554431,register:8388608,revealed:UDLR}, // fill me up!
	{par:8,width:7,height:4,target:114139326,register:1783427,revealed:UDLR}, // mr. hoppy
	{par:5,width:4,height:4,target:1632,register:61543,revealed:UDLR},
	{par:2,width:4,height:4,target:3840,register:61455,revealed:UDLRS}, // spacebar introduced
	{par:2,width:4,height:2,target:153,register:76,revealed:LR}, // lies!
	{par:38,width:5,height:6,target:488293841,register:1058588223,revealed:UDLRS}, // Cyclops!
	{par:9,width:10,height:3,target:1006665696,register:61440,revealed:UDLR}, // damn lies! 
	{par:2,width:3,height:2,target:4,register:1,holes:2,revealed:UDLRS}, // hole introduced
	{par:8,width:4,height:5,target:266304,register:64,holes:50048,revealed:UDLRS}, // DESIGNER
	{par:6,width:5,height:5,target:4194335,register:28672,holes:655360,revealed:UDLRS},
	{par:11,width:3,height:8,target:1048580,register:16416,holes:9052947,revealed:UDLRS}, // bubbles
];

export const disabled = [
	{par:50,width:4,height:4,target:16,register:1,holes:2,burns:4,shorts:8,revealed:UDLRS}, // DESIGNER
	{par:50,width:4,height:2,target:0,register:0,revealed:UDLRS}, // DESIGNER
];
