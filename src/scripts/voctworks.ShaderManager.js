"use strict";

function ShaderManager(gl, shaderList, callback) {
	var i;
	this._countdown = shaderList.length;
	this._callback = callback;
	this.shaders = [];
	
	this.program = gl.createProgram();

	this._initShaders = function() {
		var i;
		if(this._countdown > 0) return;
		console.log("initializing shaders");
		for(i = 0; i < this.shaders.length; i++) {
			gl.attachShader(this.program, this.shaders[i]);
		}
		this._callback();
	}

	/**
	 * Performs an asyncrhonous request for a shader fragment file,
	 * compiles the shader, and passes it to the callback function
	 */
	this._requestShader = function(file, type) {
		console.log("requesting shader "+file);
		var xhr = new XMLHttpRequest();
		var that = this;
		xhr.open("GET", file);
		xhr.onload = function() {
			var shader;
			if (xhr.readyState === 4) { 
				if (xhr.status === 200) {
					console.log("compiling shader "+file);
					shader = gl.createShader(type);
					gl.shaderSource(shader, xhr.responseText);
					gl.compileShader(shader);
					if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
						alert(gl.getShaderInfoLog(shader));
						return null;
					}
					that.shaders.push(shader);
					that._countdown--;
					that._initShaders();
				}
			}	
		}
		xhr.send(null);
	}

	/**
	 * Requests shaders through requestShader(), calling initShaders() when all shaders have
	 * been loaded.
	 */
	for(i = 0; i < shaderList.length; i++) {
		this._requestShader(shaderList[i].url, shaderList[i].type);
	}

	return this;
}

if(typeof(module) !== "undefined") module.exports = ShaderManager;
