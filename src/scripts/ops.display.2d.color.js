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
const gradientGenerators = {
	pulse:function(frames, a, b) {
		return {timing:[0,frames/2,frames],colorSet:[a,b,a]};
	},
	flicker:function(frames, a, b, c) {
		return {timing: [0,frames/8,frames/7,frames/5,frames/3,frames], colorSet:[a, b, c, a, c, a]};
	}
}

export function GradientTexture(opts = {gradients:[],frames:60}) {
	var canvas, ctx, gradStyles, data, strings;
	var frames = opts.frames, gradients = opts.gradients;

	this.generate = function() {
		var i, n, gradientsLength = gradients.length, gradientStops, style, dataLength;
		gradStyles = [];
		canvas = document.createElement("canvas");
		canvas.width = frames;
		canvas.height = gradientsLength;
		ctx = canvas.getContext("2d");
		for(i = 0; i < gradientsLength; ++i) {
			let {type, colors} = gradients[i];
			let {timing, colorSet} = gradientGenerators[type].apply(null, [frames].concat(colors));
			style = ctx.createLinearGradient(0,0,frames,1);
			gradientStops = timing.length;
			for(n = 0; n < gradientStops; n++) {
				style.addColorStop(timing[n]/frames, colorSet[n].asRGBA);
			}
			gradStyles.push(style);
			ctx.fillStyle = style;
			ctx.fillRect(0,i,frames,1);
		}
		data = ctx.getImageData(0,0,frames,gradientsLength).data;
		dataLength = data.length;
		console.log(dataLength);
		strings = new Array(dataLength/4);
		// now pregenerate color strings because stupid canvas is stupid
		for(i = 0; i < dataLength; i+=4) {
			strings[i/4] = "rgba("+data[i]+","+data[i+1]+","+data[i+2]+","+(data[i+3]/255)+")";
		}
	}

	Object.defineProperties(this, {
		texture:{get:() => canvas},
		context:{get:() => ctx}
	});

	this.addGradient = function(gradient) {
		gradients.push(gradient);
		this.generate();
	}

	function colorAt(y, x) {
		var offset = ((y*frames)+x);
		return strings[offset];
	}

	this.getGradient = function(grad) {
		return gradients[grad];
	}

	this.getColorAtTime = function(grad, frameCount) {
		return colorAt(grad, ~~(frameCount % frames));
	}

	this.getColorAtPosition = function(grad, pos) {
		return colorAt(grad, ~~(pos % frames));
	}

	this.generate();

	return this;
}
