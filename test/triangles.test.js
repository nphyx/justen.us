"use strict";
require("should");
require("./helpers/should.nearly.js");
import * as triangles from "../src/scripts/triangles.js";
describe("triangles", function() {
	it("should be an array of six floats", function() {
		let t = triangles.create();
		t.should.eql(new Float32Array(6));
		t.length.should.eql(6);
	});
	it("should implement constructor parameters", function() {
		let t = triangles.create(1,2,3,4,5,6);
		t.should.eql(Float32Array.of(1,2,3,4,5,6));
	});
	it("should have three vertices named a, b, and c", function() {
		let t = triangles.create(1, 2, 3, 4, 5, 6);
		t.a.should.eql(Float32Array.of(1,2));
		t.b.should.eql(Float32Array.of(3,4));
		t.c.should.eql(Float32Array.of(5,6));
		// should implement setters as well as getters
		t.a[0] = 7; t[0].should.eql(7);
		t.a[1] = 8; t[1].should.eql(8);
		t.b[0] = 9; t[2].should.eql(9);
		t.b[1] = 0; t[3].should.eql(0);
		t.c[0] = 1; t[4].should.eql(1);
		t.c[1] = 2; t[5].should.eql(2);
	});
	it("should have ax ... cy shortcuts", function() {
		let t = triangles.create(1,2,3,4,5,6);
		t.ax.should.eql(1);
		t.ay.should.eql(2);
		t.bx.should.eql(3);
		t.by.should.eql(4);
		t.cx.should.eql(5);
		t.cy.should.eql(6);
		// should implement setters as well as getters
		t.ax = 7; t[0].should.eql(7);
		t.ay = 8; t[1].should.eql(8);
		t.bx = 9; t[2].should.eql(9);
		t.by = 0; t[3].should.eql(0);
		t.cx = 1; t[4].should.eql(1);
		t.cy = 2; t[5].should.eql(2);
	});
});
describe("centroid", function() {
	it("should find the centroid of a triangle", function() {
		let t = triangles.create(1,1,2,1,2,2);
		triangles.centroid(t).should.be.nearly(Float32Array.of(1.6666667, 1.3333333), 1e-6);
	});
	it("should support an out parameter", function() {
		let out = new Float32Array(2);
		let t = triangles.create(1,1,2,1,2,2);
		triangles.centroid(t, out);
		out.should.be.nearly(Float32Array.of(1.6666667, 1.3333333), 1e-6);
	});
	it("should not mutate its other operands", function() {
		let t = triangles.create(1,1,2,1,2,2);
		triangles.centroid(t);
		t.should.eql(Float32Array.of(1,1,2,1,2,2));
	});
});
describe("translate", function() {
	it("should translate the triangle", function() {
		let t = triangles.create(1,1,2,1,2,2);
		triangles.translate(t, Float32Array.of(1,2)).should.eql(Float32Array.of(
			2,3,3,3,3,4));
	});
});
describe("center_at_origin", function() {
	it("should place the triangle's centroid at the origin (0,0)", function() {
		let t = triangles.create(0,1,2,3,4,5,6);
		let out = triangles.center_at_origin(t);
		triangles.centroid(out).should.eql(Float32Array.of(0,0));
	});
});
