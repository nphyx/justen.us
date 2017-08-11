"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.create = create;
exports.centroid = centroid;
exports.scale = scale;

var _vectrix = require("../../node_modules/@nphyx/vectrix/src/vectrix");

var vectrix = _interopRequireWildcard(_vectrix);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var _vectrix$vectors = vectrix.vectors,
    vec2 = _vectrix$vectors.vec2,
    lerp = _vectrix$vectors.lerp;
function create() {
	return {
		vertices: [vec2(), vec2(), vec2()]
	};
}

function centroid(triangle, out) {
	out = out || vec2();
	var cp = vec2();
	lerp(triangle.vertices[0], triangle.vertices[1], 0.5, cp);
	return lerp(cp, triangle.vertices[1], 1 / 3, out);
}

function scale(triangle, scale, out) {
	out = out || create();
	var vertices = triangle.vertices,
	    c = centroid(triangle);

	for (var i = 0, len = vertices.length; i < len; ++i) {
		lerp(c, vertices[i], scale, out[i]);
	}
	return triangle;
}