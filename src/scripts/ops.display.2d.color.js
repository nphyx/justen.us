"use strict";
export function Color(r=0,g=0,b=0,a=1) {
	var string = "";
	var buf = new Uint8ClampedArray(4);
	function updateString() {
		string = "rgba("+buf[0]+","+buf[1]+","+buf[2]+","+(buf[3]/255)+")";
	}
	function set(pos, val) {
		buf[pos] = val;
		updateString();
	}

	buf.lerp = function(b, t) {
		var out = new Array(4);
		var i = 0, len = buf.length;
		for(; i < len; ++i) {
			out[i] = buf[i] + t*(b[i] - buf[i]);
		}
		return new Color(out[0], out[1], out[2], out[3]);
	}

	buf.copy = function() {
		return new Color(buf[0],buf[1],buf[2],buf[3]);
	}

	Object.defineProperties(buf, {
		"r":{set:set.bind(null, 0),get:() => buf[0]},
		"g":{set:set.bind(null, 1),get:() => buf[1]},
		"b":{set:set.bind(null, 2),get:() => buf[2]},
		"a":{set:(val) => set(3, ~~(val*255)),get:() => buf[3]},
		"asRGBA":{get:() => string}
	});
	buf.r = r;
	buf.g = g;
	buf.b = b;
	buf.a = a;
	return buf;
}

export function Palette(source) {
	var colors = new Array(6);
	colors[0] = new Color(source.r*0.05, source.g*0.05, source.b*0.05, 1.0);
	colors[1] = new Color(source.r*0.125, source.g*0.125, source.b*0.125, 0.9);
	colors[2] = new Color(source.r*0.33, source.g*0.33, source.b*0.33, 1.0);
	colors[3] = new Color(source.r, source.g, source.b, 1.0);
	colors[4] = new Color(source.r*1.15, source.g*1.15, source.b*1.15, 1.0);
	colors[5] = new Color(source.r*2.0, source.g*2.0, source.b*2.0, 1.0);
	Object.defineProperties(colors,{
		"stringDark":{get:() => colors[0].asRGBA},
		"stringEmpty":{get:() => colors[1].asRGBA},
		"stringDim":{get:() => colors[2].asRGBA},
		"stringMid":{get:() => colors[3].asRGBA},
		"stringBright":{get:() => colors[4].asRGBA},
		"stringBlinding":{get:() => colors[5].asRGBA},
		"colorDark":{get:() => colors[0]},
		"colorEmpty":{get:() => colors[1]},
		"colorDim":{get:() => colors[2]},
		"colorMid":{get:() => colors[3]},
		"colorBright":{get:() => colors[4]},
		"colorBlinding":{get:() => colors[5]},
	});
	return colors;
}

// pulse and flicker effects
function pulse(a, b, FPS, seconds = 1) {
	var len = FPS*seconds;
	return {length:len, timing:[0,len/2,len],colors:[a,b,a]};
}

function flicker(a, b, c, FPS) {
	return {length:FPS, timing: [0,FPS/8,FPS/7,FPS/5,FPS/3,FPS], colors:[a, b, c, a, c, a]};
}

export function colorAtTime(gradient, frameCount) {
	var {length, timing, colors} = gradient, setSize = timing.length - 1;
	var offset = frameCount % length, i = 0, t, c, p, nextT, nextC; 
	for(i = 0; i < setSize; ++i) {
		t = timing[i];
		c = colors[i];
		nextT = (i < setSize)?timing[i+1]:length;
		nextC = (i < setSize)?colors[i+1]:colors[0];
		if(offset < nextT) {
			p = (nextT - offset) / (nextT - t);
			return c.lerp(nextC, p).asRGBA;
		}
	}
	//return colors[setSize];
}

export const Gradients = {
	pulse:pulse,
	flicker:flicker
}
