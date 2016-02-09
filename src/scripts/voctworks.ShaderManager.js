"use strict";

function ShaderManagerFactory(gl) {
	let sm = Object.create(Object);
	let shaderList = [];
	let countdown = shaderList.length;
	sm.shaders = [];
	
	sm.program = gl.createProgram();

	/**
	 * Performs an asyncrhonous request for a shader fragment file,
	 * compiles the shader, and passes it to the callback function
	 */
	let requestShader = function(req) {
		console.log("requesting shader "+req.url);
		return new Promise((resolve, reject) => {
			let xhr = new XMLHttpRequest();
			xhr.open("GET", req.url);
			xhr.onload = function() {
				if (xhr.readyState === 4) { 
					if (xhr.status === 200) {
						console.log("compiling shader "+req.url);
						let shader = gl.createShader(req.type);
						gl.shaderSource(shader, xhr.responseText);
						gl.compileShader(shader);
						if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
							reject(new Error(gl.getShaderInfoLog(shader)));
						}
						else resolve(shader);
					}
				}
			}
			xhr.onerror = function(msg) {
				reject(new Error(msg));
			}
			xhr.send(null);
		}); // end promise
	}

	function attachShaders(shaders) {
		shaders.forEach((shader) => {
			gl.attachShader(sm.program, shader);
		});
	}

	sm.init = function(shaders) {
		return new Promise((resolve, reject) => {
			let promises = shaders.map((req) => requestShader(req), (err) => reject(err));
			Promise.all(promises).then(
				(shaders) => {
					attachShaders(shaders); 
					resolve();
				},
				(err) => reject(err)
			);
		});
	}

	return sm;
}

if(typeof(module) !== "undefined") module.exports.factory = ShaderManagerFactory;
