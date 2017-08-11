"use strict";
import * as vectrix from "../../node_modules/@nphyx/vectrix/src/vectrix";
const {plus, mut_plus} = vectrix.matrices;
const {vec2, mut_copy, mut_times, lerp} = vectrix.vectors;

export function create(ax = 0, ay = 0, bx = 0, by = 0, cx = 0, cy = 0) {
	let buffer = new ArrayBuffer(6*4);
	let f32 = new Float32Array(buffer);
	f32[0] = ax;
	f32[1] = ay;
	f32[2] = bx;
	f32[3] = by;
	f32[4] = cx;
	f32[5] = cy;
	let a = vec2(buffer, 0);
	let b = vec2(buffer, 2*4);
	let c = vec2(buffer, 4*4);
	let vertices = [a,b,c];
	Object.freeze(vertices);
	Object.defineProperties(f32, {
		a: {enumerable:false, value:a},
		b: {enumerable:false, value:b},
		c: {enumerable:false, value:c},
		vertices:{enumerable:false, value:vertices},
		ax:{get:() => f32[0], set:(v) => f32[0] = v, enumerable:false},
		ay:{get:() => f32[1], set:(v) => f32[1] = v, enumerable:false},
		bx:{get:() => f32[2], set:(v) => f32[2] = v, enumerable:false},
		by:{get:() => f32[3], set:(v) => f32[3] = v, enumerable:false},
		cx:{get:() => f32[4], set:(v) => f32[4] = v, enumerable:false},
		cy:{get:() => f32[5], set:(v) => f32[5] = v, enumerable:false}
	});
	return f32;
}

/**
 * Finds the centroid of the given polygon.
 * @param {Polygon} polygon the polygon to measure
 * @param {vec2} out (optional) out parameter
 * @return {vec2}
 */
export function centroid(polygon, out) {
	let i, len;
	out = out || vec2();
	mut_copy(out, polygon.vertices[0]);
	for(i = 1, len = polygon.vertices.length; i < len; ++i) 
		mut_plus(out, polygon.vertices[i]);
	return mut_times(out, 1/len); 
}

/**
 * Scale a polygon around its centroid.
 * @param {Triangle} triangle to scale
 * @param {float} scale scaling factor
 * @param {Triangle} out (optional) out parameter
 */
export function scale(triangle, scale, out) {
	out = out || create();
	let c = centroid(triangle);

	lerp(c, triangle.a, scale, out.a);
	lerp(c, triangle.b, scale, out.b);
	lerp(c, triangle.c, scale, out.c);

	return out;
}

/**
 * Translate a triangle.
 */
export function translate(triangle, vec, out) {
	out = out || create();
	plus(triangle.a, vec, out.a);
	plus(triangle.b, vec, out.b);
	plus(triangle.c, vec, out.c);
	return out;
}

/**
 * Center a triangle at the origin.
 */
export function center_at_origin(triangle, out) {
	out = out || create();
	let c = mut_times(centroid(triangle), -1.0);
	return translate(triangle, c, out);
}

export function mut_center_at_origin(triangle) {
	return center_at_origin(triangle, triangle);
}
