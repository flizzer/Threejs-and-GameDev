

varying vec3 vWorldPosition;

void main() {
    float dist = distance(cameraPosition, vWorldPosition);
    gl_FragColor = vec4(vec3(dist/10.0), 1.0);
}