attribute vec2 a_position;
varying vec2 uv;

void main(void) {
	gl_Position = vec4(a_position, 0, 1.0);

	// Interpolate quad coordinates in the fragment shader
	uv = a_position.xy;
}
