"use strict";
const vectors = require("./vendor/vectrix.bundle.js").vectors;
const {vec2, lerp} = vectors;

export function create() {
	return {
		vertices:[
			vec2(),
			vec2(),
			vec2()
		]
	}
}

export function centroid(triangle, out) {
	out = out || vec2();
	let cp = vec2();
	lerp(triangle.vertices[0], triangle.vertices[1], 0.5, cp);
	return lerp(cp, triangle.vertices[1], 1/3, out); 
}

export function scale(triangle, scale, out) {
	out = out || create();
	let vertices = triangle.vertices, c = centroid(triangle);

	for(let i = 0, len = vertices.length; i < len; ++i) {
		lerp(c, vertices[i], scale, out[i]);
	}
	return triangle;
}

