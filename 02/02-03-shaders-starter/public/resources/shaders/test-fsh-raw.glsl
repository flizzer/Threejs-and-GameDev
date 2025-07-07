precision highp float;

uniform vec3 cameraPosition;
uniform vec3 tintColor;

varying vec3 vWorldPosition;

void main() {
    float dist = distance(cameraPosition, vWorldPosition);
    gl_FragColor = vec4(tintColor * (dist/10.0), 1.0);
    //gl_FragColor = vec4(vec3(dist/10.0), 1.0);
}