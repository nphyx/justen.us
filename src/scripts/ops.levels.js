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
ops.conditions = {
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
ops.levels = [
	{par:1,width:4,height:1,target:1,register:0,keysOn:U}, // add tuts
	{par:2,width:4,height:1,target:2,register:0},
	{par:3,width:4,height:1,target:3,register:0},
	{par:9,width:4,height:1,target:9,register:0}, // subpar
	{par:1,width:4,height:1,target:2,register:1,keysOn:L}, // lshift tuts
	{par:3,width:4,height:1,target:8,register:1},
	{par:1,width:4,height:1,target:10,register:5},
	{par:2,width:4,height:1,target:12,register:3},
	{par:1,width:4,height:1,target:1,register:2,keysOn:R}, // rshift tuts
	{par:3,width:4,height:1,target:1,register:8},
	{par:1,width:4,height:1,target:5,register:10},
	{par:2,width:4,height:1,target:3,register:12},
	{par:1,width:4,height:1,target:0,register:1,keysOn:D}, // sub tuts
	{par:3,width:4,height:1,target:0,register:3}, // subpar
	{par:1,width:4,height:1,target:6,register:7},
	{par:6,width:4,height:1,target:9,register:15}, // supbar
	{par:3,width:4,height:2,target:34,register:8,keysOn:UL},
	{par:2,width:4,height:2,target:96,register:194,keysOn:DR},
	{par:4,width:4,height:4,target:32769,register:32766,keysOn:LRU}, // introvert 
	{par:3,width:4,height:4,target:27030,register:59799,keysOn:UDLR}, // all keys revealed
	{par:4,width:5,height:5,target:33554431,register:8388608,keysOn:UDLR}, // fill me up!
	{par:8,width:7,height:4,target:114139326,register:1783427,keysOn:UDLR}, // mr. hoppy
	{par:5,width:4,height:4,target:1632,register:61543,keysOn:UDLR}, // subpar
	{par:2,width:4,height:4,target:3840,register:61455,keysOn:UDLRS}, // spacebar introduced
	{par:2,width:4,height:2,target:153,register:76,keysOn:LR}, // lies!
	{par:38,width:5,height:6,target:488293841,register:1058588223,keysOn:UDLRS}, // Cyclops!
	{par:9,width:10,height:3,target:1006665696,register:61440,keysOn:UDLR}, // damn lies! 
	{par:2,width:3,height:2,target:4,register:1,holes:2,keysOn:UDLRS}, // hole introduced
	{par:8,width:4,height:5,target:266304,register:64,holes:50048,keysOn:UDLRS}, // DESIGNER
	{par:6,width:5,height:5,target:4194335,register:28672,holes:655360,keysOn:UDLRS},
	{par:11,width:3,height:8,target:1048580,register:16416,holes:9052947,keysOn:UDLRS}, // bubbles
];

const disabled = [
	{par:50,width:4,height:2,target:0,register:0,keysOn:UDLRS}, // DESIGNER
];
