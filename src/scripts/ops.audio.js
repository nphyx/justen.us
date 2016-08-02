"use strict";
// Fix up prefixing
window.AudioContext = window.AudioContext || window.webkitAudioContext;
const SILENT = 0.000001;
var ctx = new AudioContext();
var volume = 0.3;
var notes = {
    "C0": 16.35,
    "C#0": 17.32,
    "Db0": 17.32,
    "D0": 18.35,
    "D#0": 19.45,
    "Eb0": 19.45,
    "E0": 20.60,
    "F0": 21.83,
    "F#0": 23.12,
    "Gb0": 23.12,
    "G0": 24.50,
    "G#0": 25.96,
    "Ab0": 25.96,
    "A0": 27.50,
    "A#0": 29.14,
    "Bb0": 29.14,
    "B0": 30.87,
    "C1": 32.70,
    "C#1": 34.65,
    "Db1": 34.65,
    "D1": 36.71,
    "D#1": 38.89,
    "Eb1": 38.89,
    "E1": 41.20,
    "F1": 43.65,
    "F#1": 46.25,
    "Gb1": 46.25,
    "G1": 49.00,
    "G#1": 51.91,
    "Ab1": 51.91,
    "A1": 55.00,
    "A#1": 58.27,
    "Bb1": 58.27,
    "B1": 61.74,
    "C2": 65.41,
    "C#2": 69.30,
    "Db2": 69.30,
    "D2": 73.42,
    "D#2": 77.78,
    "Eb2": 77.78,
    "E2": 82.41,
    "F2": 87.31,
    "F#2": 92.50,
    "Gb2": 92.50,
    "G2": 98.00,
    "G#2": 103.83,
    "Ab2": 103.83,
    "A2": 110.00,
    "A#2": 116.54,
    "Bb2": 116.54,
    "B2": 123.47,
    "C3": 130.81,
    "C#3": 138.59,
    "Db3": 138.59,
    "D3": 146.83,
    "D#3": 155.56,
    "Eb3": 155.56,
    "E3": 164.81,
    "F3": 174.61,
    "F#3": 185.00,
    "Gb3": 185.00,
    "G3": 196.00,
    "G#3": 207.65,
    "Ab3": 207.65,
    "A3": 220.00,
    "A#3": 233.08,
    "Bb3": 233.08,
    "B3": 246.94,
    "C4": 261.63,
    "C#4": 277.18,
    "Db4": 277.18,
    "D4": 293.66,
    "D#4": 311.13,
    "Eb4": 311.13,
    "E4": 329.63,
    "F4": 349.23,
    "F#4": 369.99,
    "Gb4": 369.99,
    "G4": 392.00,
    "G#4": 415.30,
    "Ab4": 415.30,
    "A4": 440.00,
    "A#4": 466.16,
    "Bb4": 466.16,
    "B4": 493.88,
    "C5": 523.25,
    "C#5": 554.37,
    "Db5": 554.37,
    "D5": 587.33,
    "D#5": 622.25,
    "Eb5": 622.25,
    "E5": 659.26,
    "F5": 698.46,
    "F#5": 739.99,
    "Gb5": 739.99,
    "G5": 783.99,
    "G#5": 830.61,
    "Ab5": 830.61,
    "A5": 880.00,
    "A#5": 932.33,
    "Bb5": 932.33,
    "B5": 987.77,
    "C6": 1046.50,
    "C#6": 1108.73,
    "Db6": 1108.73,
    "D6": 1174.66,
    "D#6": 1244.51,
    "Eb6": 1244.51,
    "E6": 1318.51,
    "F6": 1396.91,
    "F#6": 1479.98,
    "Gb6": 1479.98,
    "G6": 1567.98,
    "G#6": 1661.22,
    "Ab6": 1661.22,
    "A6": 1760.00,
    "A#6": 1864.66,
    "Bb6": 1864.66,
    "B6": 1975.53,
    "C7": 2093.00,
    "C#7": 2217.46,
    "Db7": 2217.46,
    "D7": 2349.32,
    "D#7": 2489.02,
    "Eb7": 2489.02,
    "E7": 2637.02,
    "F7": 2793.83,
    "F#7": 2959.96,
    "Gb7": 2959.96,
    "G7": 3135.96,
    "G#7": 3322.44,
    "Ab7": 3322.44,
    "A7": 3520.00,
    "A#7": 3729.31,
    "Bb7": 3729.31,
    "B7": 3951.07,
    "C8": 4186.01
}

function createNoise() {
	var last = 0.0;
	var bufferSize = 4096;
	var noise = ctx.createScriptProcessor(bufferSize, 1, 1);
	noise.onaudioprocess = function(e) {
		var output = e.outputBuffer.getChannelData(0);
		var i, n;
		var white;
		var scale = 32;
		for(i = 0; i < bufferSize; i+=scale) {
			white = Math.random() * 2 - 1;
			for(n = 0; n < scale; n++) output[i+n] = ((last + (1.6 * white)) / 2.6) * (1.0 + volume);
			last = output[i];
		}
		scale *= 8;
		for(i = 0; i < bufferSize; i+=scale) {
			white = Math.random() * 2 - 1;
			for(n = 0; n < scale; n++) output[i+n] += white * 0.3;
		}
	}
	return noise;
}

function startSound(o, g, time) {
	o.start(0);
	g.gain.value = volume;
}

function stopSound(o, g, time) {
	g.gain.value = SILENT;
	o.stop(0);
}

export function playNote(note, type, start = 0, stop = 1) {
	var o = ctx.createOscillator();
	var g = ctx.createGain();
	g.gain.value = SILENT;
	g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start);
	o.connect(g);
	g.connect(ctx.destination);

	var frq = notes[note];
	if (frq) {
		o.type = type;
		o.frequency.value = frq;
		setTimeout(startSound.bind(null, o, g), start*1000);
		setTimeout(stopSound.bind(null, o, g), (stop)*1000);	
	}
}

export function playNoise(start, stop, fadeIn, fadeOut) {
	if(start === undefined) start = 0;
	if(stop === undefined) stop = 1;
	var o = createNoise();
	var g = ctx.createGain();
	var currentTime = ctx.currentTime;
	o.connect(g);
	g.connect(ctx.destination);
	g.gain.setValueAtTime(0, currentTime);
	g.gain.linearRampToValueAtTime(volume, currentTime+fadeIn);
	setTimeout(() => {
		g.gain.linearRampToValueAtTime(0.0, currentTime+fadeOut);
		setTimeout(() => o.disconnect(), fadeOut*1000+100);
	}, (fadeIn+(stop-fadeOut))*1000);
}

export const sounds = {
	plus:function() {
		playNote("A4", "triangle", 0, 0.05); 
		playNote("E5", "triangle", 0.05, 0.1);
	},
	minus:function() {
		playNote("E5", "triangle", 0, 0.05); 
		playNote("A4", "triangle", 0.05, 0.1);
	},
	lshift:function() {
		playNote("E5", "triangle", 0, 0.05);
		playNote("E5", "triangle", 0.07, 0.12);
	},
	rshift:function() {
		playNote("A4", "triangle", 0, 0.05); 
		playNote("A4", "triangle", 0.07, 0.12);
	},
	bump:function() {
		playNote("C3", "square", 0, 0.1); 
	},
	unbump:function() {
		playNote("G2", "sawtooth", 0, 0.1);
		playNote("G2", "square", 0, 0.1);
	},
	fill:function() {
		playNoise(0.0, 0.6, 0.5, 0.6);
		playNote("G2", "sawtooth", 0.2, 0.32);
		playNote("A5", "sine", 0.2, 0.25); 
		playNote("E6", "sine", 0.27, 0.32);
	},
	flush:function() {
		playNoise(0.0, 0.6, 0.5, 0.6);
		playNote("G2", "sawtooth", 0.2, 0.32);
		playNote("E6", "sine", 0.2, 0.25); 
		playNote("A5", "sine", 0.27, 0.32);
	},

	crash:function() {
		playNoise(0.0, 1.8, 0.2, 1.6);
	},
	complete:function() {
		var i = 0.1; // interval
		var g = 0.01; // gap between notes
		var t = 0;    // time
		playNote("C4", "square", t, t+i);
		playNote("C4", "square", t+i+g, t+i*2+g*2);
		playNote("C3", "sawtooth", t, t+i*2+g*2);
		t += i*2+g*2;

		playNote("E5", "square", t, t+i);
		playNote("F5", "square", t+i+g, t+i*3+g*2);
		playNote("E4", "sawtooth", t, t+i*3+g*2);
	},
	glitch:function() {
		playNoise(0.0, 1.36, 0.1, 1.35);
		var i = 0.1; // interval
		var g = 0.01; // gap between notes
		var t = 0;    // time
		playNote("F3", "square", t, t+i);
		playNote("C4", "square", t+i+g, t+i*2+g*2);
		playNote("E4", "sawtooth", t, t+i*2+g*2);
		t += i*2+g*2;

		playNote("D#4", "square", t, t+i);
		playNote("C5", "square", t+i+g, t+i*3+g*2);
		playNote("F5", "sawtooth", t, t+i*3+g*2);
	},
	endGame:function() {
		var i = 0.1; // interval
		var g = 0.01; // gap between notes
		var t = 0;    // time
		playNote("C4", "square", t, t+i);
		playNote("C4", "square", t+i+g, t+i*2+g*2);
		playNote("C3", "sawtooth", t, t+i*2+g*2);
		t += i*2+g*2;

		playNote("E5", "square", t, t+i);
		playNote("F5", "square", t+i+g, t+i*3+g*2);
		playNote("E4", "sawtooth", t, t+i*3+g*2);
		t += i*2+g*2;

		playNote("C4", "square", t, t+i);
		playNote("C4", "square", t+i+g, t+i*2+g*2);
		playNote("C3", "sawtooth", t, t+i*2+g*2);
		t += i*2+g*2;

		playNote("E5", "square", t, t+i);
		playNote("F5", "square", t+i+g, t+i*3+g*2);
		playNote("E4", "sawtooth", t, t+i*3+g*2);
	}
}
