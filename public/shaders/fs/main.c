precision mediump float;

struct octet {
	int color[3];
	int octants[8];
};

// The interpolated quad coordinates from [-1, 1] on the x and y axis
varying vec2 uv;


// Constants
const int maxMaterial = 128;
const float g_focalLength = 3.5; // Distance between the eye and the image plane
const float g_zNear = 0.0; // Near clip depth
const float g_zFar = 25.0; // Far clip depth
const int   g_rmSteps = 256; // Max raymarch steps
const float g_rmEpsilon = 0.0001; // Surface threshold

// Camera uniforms
uniform vec2 u_resolution;
uniform vec3 u_camUp;
uniform vec3 u_camRight;
uniform vec3 u_camForward;
uniform vec3 u_eye;

// color uniforms
uniform vec4 u_ambient;
uniform vec4 u_sky;
uniform vec4 u_materials[maxMaterial];
uniform octet u_octets[128];

// Light uniforms
uniform vec3 u_light0Position;
uniform vec4 u_light0Color;

/**
 * Maps x from [minX, maxX] to [minY, maxY], without clamping
 */
float mapTo(float x, float minX, float maxX, float minY, float maxY) {
	float a = (maxY - minY) / (maxX - minX);
	float b = minY - a * minX;
	return a * x + b;
}

/** PRIMITIVES **/

/**
 * Returns the unsigned distance estimate to a box of the given size
 */
float udBox(vec3 p, vec3 size) {
	return length(max(abs(p) - size, vec3(0.0)));
}

/**
 * Returns the signed distance estimate to a box of the given size
 */
float sdBox(vec3 p, vec3 size) {
	vec3 d = abs(p) - size;
	return min(max(d.x, max(d.y, d.z)), 0.0) + udBox(p, size);
}

/**
 * Returns the signed distance estimate to a cube of the given size
 */
float sdCube(vec3 p, float size) {
	return sdBox(p, vec3(size));
}

/** OPERATIONS **/

/**
 * Subtracts distance field db from da, where db is a signed distance
 * @param float da first distance value
 * @param float db second distance value
 */
float opSubtract(float da, float db) {
	return max(da, -db);
}

/**
 * Returns the closest distance to a surface from p in our scene
 * @param vec3 {x,y,z} p point to measure
 */
float distScene(vec3 p) {
	p.xyz = mod(p.xyz, 1.0) - vec3(0.5);
	return sdCube(p, 0.25);
	//else return g_zFar;
}

/**
 * Approximates the (normalized) gradient of the distance function at the given point.
 * If p is near a surface, the function will approximate the surface normal.
 * @param vec3 {x,y,z} p point to measure
 */
vec3 getNormal(vec3 p) {
	float h = 0.0001;

	return normalize(vec3(
		distScene(p + vec3(h, 0, 0)) - distScene(p - vec3(h, 0, 0)),
		distScene(p + vec3(0, h, 0)) - distScene(p - vec3(0, h, 0)),
		distScene(p + vec3(0, 0, h)) - distScene(p - vec3(0, 0, h))));
}

/** LIGHTING CALCULATIONS **/

/**
 * Returns a value between 0 and 1 depending on how visible p0 is from p1
 * 0 means it's completely blocked, 1 means completely visible
 * @param vec3 {x,y,z} p0  first point to measure
 * @param vec3 {x,y,z} p1  second point to measure
 * @param float        k   defines the hardness of the shadow
 */
float getShadow(vec3 p0, vec3 p1, float k) {
	vec3 rd = normalize(p1 - p0);
	float t = 10.0 * g_rmEpsilon; // Start a bit away from the surface
	float maxt = length(p1 - p0);
	float f = 1.0;
	for(int i = 0; i < g_rmSteps; ++i) {
		float d = distScene(p0 + rd * t);

		// A surface was hit before we reached p1
		if(d < g_rmEpsilon)
			return 0.0;

		// Penumbra factor is calculated based on how close we were to
		// the surface, and how far away we are from the shading point
		// See http://www.iquilezles.org/www/articles/rmshadows/rmshadows.htm
		f = min(f, k * d / t);

		t += d;

		// We reached p1
		if(t >= maxt)
			break;
	}

	return f;
}

/**
 * Calculate the light intensity with soft shadows
 * @param  vec3 {x,y,z}    p point on surface
 * @param  vec3 {x,y,z}    lightPos position of the light source
 * @param  vec4 {r,g,b,a}  lightColor the radiance of the light source
 * @return vec4 {r,g,b,a}  the color of the point
 */
vec4 getShading(vec3 p, vec3 normal, vec3 lightPos, vec4 lightColor) {
	float lightIntensity = 0.0;
	float shadow = getShadow(p, lightPos, 16.0);
	if(shadow > 0.0) { // If we are at all visible
		vec3 lightDirection = normalize(lightPos - p);
		lightIntensity = shadow * clamp(dot(normal, lightDirection), 0.0, 1.0);
	}
	return lightColor * lightIntensity + u_ambient * (1.0 - lightIntensity);
}

/**
 * Marches along a ray using the distance field, until an intersection is found
 * vec3 ro ray origin
 * vec3 rd ray direction
 * int i iteration count 
 * int t distance traveled along ray
 */
void raymarch(vec3 ro, vec3 rd, out int i, out float t) {
	t = 0.0;
	for(int j = 0; j < g_rmSteps; ++j) {
		vec3 p = ro + rd * t;
		float d = distScene(p);
		if(d < g_rmEpsilon || t > g_zFar) {
			i = j;
			break;
		}
		t += d;
	}
}

/**
 * Walks through the octree until it hits max depth or finds a voxel leaf
 * vec3 ro ray origin
 * vec3 rd ray direction
 * int i iteration count 
 * int t distance traveled along ray
 */
void traverse(vec3 ro, vec3 rd, out int i, out float t) {
}

/**
 * Compute an ambient occlusion factor, where 0 means there were no other surfaces 
 * around the point, and 1 means that the point is occluded by other surfaces.
 * @param vec3 {x,y,z} p point on surface
 * @param vec3 {x,y,z} n normal of the surface at p
 * @return a value clamped to [0, 1]
 */
float ambientOcclusion(vec3 p, vec3 n) {
	float stepSize = 0.01; // length of occulsion step
	float t = stepSize; // distance accumulator
	float oc = 0.0; // occlusion amount
	for(int i = 0; i < 10; ++i) {
		float d = distScene(p + n * t);
		oc += t - d; // Actual distance to surface - distance field value
		t += stepSize;
	}

	return clamp(oc, 0.0, 1.0);
}

/**
 * Calculates the color of a fragment by finding the color with accumulated light
 * and shadows.
 * @param vec4 {r,g,b,a} color   the starting color (base color or color from last pass) 
 * @param float          t       distance traveled by ray from eye to surface
 * @param vec3 {x,y,z}   p       point to test for color
 * @param vec3 {u,v,w}   normal  normal value of the surface
 */
vec4 colorPass(vec4 color, float t, vec3 p, vec3 normal) {
	float z = mapTo(t, g_zNear, g_zFar, 1.0, 0.0);

	// Diffuse lighting
	color = color * (
		getShading(p, normal, u_light0Position, u_light0Color) +
		getShading(p, normal, vec3(2.0, 3.0, 0.0), vec4(1.0, 0.5, 0.5, 1.0))
		) / 2.0;

	// Color based on surface normal
	//color = vec4(abs(normal), 1.0);

	// Blend in ambient occlusion factor
	float ao = ambientOcclusion(p, normal);
	color = color * (1.0 - ao);

	// Blend the background color based on the distance from the camera
	float zSqrd = z * z;
	color = mix(u_sky, color, zSqrd * (3.0 - 2.0 * z)); // Fog

	return color;
}

/**
 * Computes a fragment color based on surface normal
 * @param vec4 {r,g,b,a} color   the starting color (base color or color from last pass) 
 * @param float          t       distance traveled by ray from eye to surface
 * @param vec3 {x,y,z}   p       point to test for color
 * @param vec3 {u,v,w}   normal  normal value of the surface
 */
vec4 normalColorPass(vec4 color, float t, vec3 p, vec3 normal) {
	color = vec4(abs(normal), 1.0);
	return color;
}

/**
 * Computes a fragment color based on depth of field
 * @param vec4 {r,g,b,a} color   the starting color (base color or color from last pass) 
 * @param float          t       distance traveled by ray from eye to surface
 * @param vec3 {x,y,z}   p       point to test for color
 * @param vec3 {u,v,w}   normal  normal value of the surface
 */
vec4 depthColorPass(vec4 color, float t, vec3 p, vec3 normal) {
	float z = mapTo(t, g_zNear, g_zFar, 1.0, 0.0);
	color = vec4(1.0) * z;
	return color;
}
 

/**
 * Computes the color corresponding to the ray intersection point (if any)
 * vec3 {x,y,z} ro ray origin
 * vec3 {u,v,w} rd ray direction
 */
vec4 computeColor(vec3 ro, vec3 rd) {
	int i;
	int k = 0;
	float t0;
	float tk0;
	vec3 ro2;	
	vec4 color;
	raymarch(ro, rd, i, t0);

	vec3 p; // Surface point
	vec3 normal; // Surface normal

	float t; // Distance traveled by ray from eye

	if(i < g_rmSteps && t0 >= g_zNear && t0 <= g_zFar) { // Raymarching hit a surface
		t = t0;
		p = ro + rd * t0;

		int matIndex = int(floor(mod(min(min(p.x, p.y), p.z), 4.0))) + 1;
		for(int n = 0; n < maxMaterial; n++) {
			if(n == int(matIndex)) {
				color = u_materials[n]; // white box
				break;
			}
		}

		normal = getNormal(p);
		color = colorPass(color, t, p, normal);
	}
	else {
		return u_sky;
	}
	return color;
}

void main(void) {
	// calculate aspect ratio from resolution
	float aspectRatio = u_resolution.x / u_resolution.y;
	// ray origin from eye position uniform
	vec3 ro = u_eye;
	// calculate the ray direction normal
	vec3 rd = normalize(u_camForward * g_focalLength + u_camRight * uv.x * aspectRatio + u_camUp * uv.y);
	// start the color calculation
	vec4 color = computeColor(ro, rd);
	gl_FragColor = vec4(color.xyz, 1.0);
}
