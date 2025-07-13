import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Pane } from 'tweakpane';

import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

//smoothing function --bhd
function smoothstep(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
  return t * t * (3.0 - 2.0 * t);
}

//Basically blend between two values where the t parameter is the alpha value
//https://en.wikipedia.org/wiki/Linear_interpolation --bhd
function lerp(a, b, t) {
  return a + (b - a) * t;
}

//noise is nice, but to get something that resembles terrain, need Fractal Brownian Motion --bhd
//https://glsl-exercises.simondev.io/lesson/10/4
//https://thebookofshaders.com/13/ 
//https://en.wikipedia.org/wiki/Fractional_Brownian_motion
function FBM(noise, x, y, octaves, lucanarity, gain) {
  let amplitude = 1.5;
  let frequency = 1.0;
  let sum = 0.0;

  for (let i = 0; i < octaves; i++) {
    const noiseValue = noise(x * frequency, y* frequency); 
    sum += noiseValue * amplitude;
    amplitude *= gain;
    frequency *= lucanarity;
  }
  return sum;
}

function RIDGED_FBM(noise, x, y, octaves, lucanarity, gain) {
  let amplitude = 1.0;
  let frequency = 1.0;
  let sum = 0.0;

  for (let i = 0; i < octaves; i++) {
    const noiseValue = 1 - Math.abs(noise(x * frequency, y* frequency)); 
    sum += noiseValue * amplitude;
    amplitude *= gain;
    frequency *= lucanarity;
  }
  return sum;
}

class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  constructor() {
  }

  async initialize() {
    this.#clock_ = new THREE.Clock(true);

    window.addEventListener('resize', () => {
      this.#onWindowResize_();
    }, false);

    await this.#setupProject_();

    this.#onWindowResize_();
    this.#raf_();
  }

  async #setupProject_() {
    // Create debug pane
    const pane = new Pane();

    this.#setupThreejs_();
    this.#setupBasicScene_(pane);
    this.#setupKryptonite_(pane);
    //this.#setupFortressOfSolitude_(pane);
    //this.#setupTerrain_(pane);
  }

  #setupTerrain_(pane) {
    //const RESOLUTION = 128;
    const RESOLUTION = 512;
    const SIZE = 250;

    const fogColor = new THREE.Color(0x799BB6);
    const fog = new THREE.FogExp2(fogColor, 0.004);
    //this.#scene_.fog = fog;

    const noise = createNoise2D(alea(1));

    //Ground
    const groundGeometry = new THREE.PlaneGeometry(
      SIZE * 2, SIZE * 2, RESOLUTION, RESOLUTION);

    //Colors
    const GREEN = new THREE.Color(0x008000);
    const SAND = new THREE.Color(0xD7A569);
    const BLACK = new THREE.Color(0x000000);
    const SAND_CUTOFF = -5;

    const positions = groundGeometry.attributes.position;
    const colors = []; 

    //using a factor of 3 here because each position is made up of an x, y, and a z component --bhd
    //see BufferGeometry as PlaneGeometry inherits from it for item size and other attributes:  
    //https://threejs.org/docs/#api/en/core/BufferAttribute
    for (let i = 0; i < positions.count * 3; i += 3) {
      const pos = new THREE.Vector3().fromArray(positions.array, i);

      //pos.z = Math.random() * 10;
      //const distToCenter = pos.distanceTo(new THREE.Vector3());
      //pos.z = smoothstep(100, 0, distToCenter) * 100;
      
      //pos.z = Math.sin(pos.x * 0.05) * Math.sin(pos.y * 0.05) * 10;
      //pos.z = noise(pos.x * 0.01, pos.y * 0.01) * 10;
     
      const duneValue = (1 - Math.abs(noise(pos.x * 0.05, pos.y * 0.05))) * 0.1 - 0.5;     
      //const duneValue = 1 - Math.abs(noise(pos.x * 0.01, pos.y * 0.01));     
      const rollingHills = noise(pos.x * 0.01, pos.y * 0.01);

      //simplex noise is usually -1 to 1 (I think because it's sigmoid based) so we need to convert it back to the
      //convention for noise which is 0 to 1 hence the "* 0.5 + 0.5" at the end --bhd
      const mixFactor = noise(pos.x * 0.005, pos.y * 0.005) * 0.5 + 0.5;

      //pos.z = FBM(noise, pos.x * 0.01, pos.y * 0.01, 5, 2.0, 0.5) * 10;
      //pos.z = duneValue * 10;
      //pos.z = rollingHills * 10;

      //I think we're using the lerp() to blend between the two colors associated 
      //with dunes and rolling hills here
      //with the smoothing function value or the mixFactor as the "z" parameter and 
      //multiplying by an int value as essentially a height factor?
      //basically lerping the terrain I think? --bhd
      //pos.z = lerp(duneValue, rollingHills, 2);
      //pos.z = lerp(duneValue, rollingHills, mixFactor) * 20;
      pos.z = lerp(duneValue, rollingHills, smoothstep(0.25, 0.55, mixFactor)) * 20;
      
      //const ridged = RIDGED_FBM(noise, pos.x * 0.005, pos.y * 0.005, 5, 2.0, 0.5);
      //pos.z = ridged * 20;

      //flatten the edges
      const edgeValue = (
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.x)) *
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.y))
      );
      pos.z *= edgeValue;
      const dropoff = (Math.abs(pos.x) == SIZE || Math.abs(pos.y) == SIZE) ? 1 : 0;
      pos.z -= dropoff * 25;

      positions.array[i + 0] = pos.x
      positions.array[i + 1] = pos.y
      positions.array[i + 2] = pos.z
      
      const col = new THREE.Color();

      //this is saying anything at the SAND_CUTOFF value and below (-5) will be sandy color --bhd
      //anything above 0 will be GREEN and anything in between will be lerped
      //very common pattern in shader programming apparently, but using outside of a shader here
      const t = smoothstep(SAND_CUTOFF, SAND_CUTOFF + 5, pos.z);
      col.lerpColors(SAND, GREEN, t);
      col.lerpColors(BLACK, col, edgeValue);

      colors.push(col.r, col.g, col.b);

    }

    groundGeometry.setAttribute('color', new THREE.BufferAttribute(
      new Float32Array(colors), 3));

    //recomputes the below for us after we've messed around with the geometry so lighting works --bhd
    groundGeometry.computeVertexNormals();
    groundGeometry.computeTangents();
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      //color: 0x202020,
      metalness: 0.5,
      //metalness: 0.1,
      roughness: 0.1,
      //roughness: 0.6,
      //use to view the geo --bhd
      wireframe: false,
      vertexColors: true
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.#scene_.add(groundMesh);
  }

  #setupKryptonite_(pane) {
    //const RESOLUTION = 128;
    const RESOLUTION = 512;
    const SIZE = 250;

    const noise = createNoise2D(alea(1));

    //Ground
    const groundGeometry = new THREE.PlaneGeometry(
      SIZE * 2, SIZE * 2, RESOLUTION, RESOLUTION);

    //Colors
    const GREEN = new THREE.Color(0x008000);
    const BLACK = new THREE.Color(0x000000);
    const SAND_CUTOFF = -5;

    const positions = groundGeometry.attributes.position;
    const colors = []; 

    //using a factor of 3 here because each position is made up of an x, y, and a z component --bhd
    //see BufferGeometry as PlaneGeometry inherits from it for item size and other attributes:  
    //https://threejs.org/docs/#api/en/core/BufferAttribute
    for (let i = 0; i < positions.count * 3; i += 3) {
      const pos = new THREE.Vector3().fromArray(positions.array, i);

      pos.z = FBM(noise, pos.x * 0.01, pos.y * 0.01, 10, 2.0, .6) * 20;

      //const ridged = RIDGED_FBM(noise, pos.x * 0.005, pos.y * 0.005, 5, 2.0, 0.5);
      //pos.z = ridged * 20;

      //flatten the edges
      const edgeValue = (
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.x)) *
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.y))
      );
      pos.z *= edgeValue;
      const dropoff = (Math.abs(pos.x) == SIZE || Math.abs(pos.y) == SIZE) ? 1 : 0;
      pos.z -= dropoff * 25;

      positions.array[i + 0] = pos.x
      positions.array[i + 1] = pos.y
      positions.array[i + 2] = pos.z
      
      const col = new THREE.Color();

      //this is saying anything at the SAND_CUTOFF value and below (-5) will be sandy color --bhd
      //anything above 0 will be GREEN and anything in between will be lerped
      //very common pattern in shader programming apparently, but using outside of a shader here
       const t = smoothstep(SAND_CUTOFF, SAND_CUTOFF + 5, pos.z);
       //col.lerpColors(SAND, GREEN, t);
       col.lerpColors(BLACK, col, edgeValue);
       colors.push(col.r, col.g, col.b);

    }

    groundGeometry.setAttribute('color', new THREE.BufferAttribute(
      new Float32Array(colors), 3));

    //recomputes the below for us after we've messed around with the geometry so lighting works --bhd
    groundGeometry.computeVertexNormals();
    groundGeometry.computeTangents();
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      alphaMap: new THREE.Texture(0xFFFFFF),
      color: GREEN, 
      //color: 0xFFFFFF,
      //color: 0x202020,
      metalness: 1.0,
      //metalness: 0.1,
      roughness: 0.1,
      //roughness: 0.6,
      //use to view the geo --bhd
      wireframe: false,
      vertexColors: true
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.#scene_.add(groundMesh);
  }

  #setupFortressOfSolitude_(pane) {
    //const RESOLUTION = 128;
    const RESOLUTION = 512;
    const SIZE = 250;

    const noise = createNoise2D(alea(1));

    //Ground
    const groundGeometry = new THREE.PlaneGeometry(
      SIZE * 2, SIZE * 2, RESOLUTION, RESOLUTION);

    //Colors
    const ICE_WHITE = new THREE.Color(0x808080);
    const ICE_BLUE = new THREE.Color(0x111111);
    const BLACK = new THREE.Color(0x000000);
    const SAND_CUTOFF = -5;

    const positions = groundGeometry.attributes.position;
    const colors = []; 

    //using a factor of 3 here because each position is made up of an x, y, and a z component --bhd
    //see BufferGeometry as PlaneGeometry inherits from it for item size and other attributes:  
    //https://threejs.org/docs/#api/en/core/BufferAttribute
    for (let i = 0; i < positions.count * 3; i += 3) {
      const pos = new THREE.Vector3().fromArray(positions.array, i);

      //pos.z = Math.random() * 10;
      //const distToCenter = pos.distanceTo(new THREE.Vector3());
      //pos.z = smoothstep(100, 0, distToCenter) * 100;
      
      //pos.z = Math.sin(pos.x * 0.05) * Math.sin(pos.y * 0.05) * 10;
      //pos.z = noise(pos.x * 0.01, pos.y * 0.01) * 10;
     
      const duneValue = (1 - Math.abs(noise(pos.x * 0.05, pos.y * 0.05))) * 0.1 - 0.5;     
      //const duneValue = 1 - Math.abs(noise(pos.x * 0.01, pos.y * 0.01));     
      const rollingHills = noise(pos.x * 0.01, pos.y * 0.01);

      //simplex noise is usually -1 to 1 (I think because it's sigmoid based) so we need to convert it back to the
      //convention for noise which is 0 to 1 hence the "* 0.5 + 0.5" at the end --bhd
      const mixFactor = noise(pos.x * 0.005, pos.y * 0.005) * 0.5 + 0.5;

      //pos.z = FBM(noise, pos.x * 0.01, pos.y * 0.01, 5, 2.0, 0.5) * 10;
      //pos.z = duneValue * 10;
      //pos.z = rollingHills * 10;

      //I think we're using the lerp() to blend between the two colors associated 
      //with dunes and rolling hills here
      //with the smoothing function value or the mixFactor as the "z" parameter and 
      //multiplying by an int value as essentially a height factor?
      //basically lerping the terrain I think? --bhd
      //pos.z = lerp(duneValue, rollingHills, 2);
      //pos.z = lerp(duneValue, rollingHills, mixFactor) * 20;
      pos.z = lerp(duneValue, rollingHills, smoothstep(0.25, 0.55, mixFactor)) * 20;
      
      //const ridged = RIDGED_FBM(noise, pos.x * 0.005, pos.y * 0.005, 5, 2.0, 0.5);
      //pos.z = ridged * 20;

      //flatten the edges
      const edgeValue = (
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.x)) *
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.y))
      );
      pos.z *= edgeValue;
      const dropoff = (Math.abs(pos.x) == SIZE || Math.abs(pos.y) == SIZE) ? 1 : 0;
      pos.z -= dropoff * 25;

      positions.array[i + 0] = pos.x
      positions.array[i + 1] = pos.y
      positions.array[i + 2] = pos.z
      
      const col = new THREE.Color();

      //this is saying anything at the SAND_CUTOFF value and below (-5) will be sandy color --bhd
      //anything above 0 will be GREEN and anything in between will be lerped
      //very common pattern in shader programming apparently, but using outside of a shader here
      const t = smoothstep(SAND_CUTOFF, SAND_CUTOFF + 5, pos.z);
      col.lerpColors(ICE_WHITE, ICE_BLUE, t);
      col.lerpColors(BLACK, col, edgeValue);

      colors.push(col.r, col.g, col.b);

    }

    groundGeometry.setAttribute('color', new THREE.BufferAttribute(
      new Float32Array(colors), 3));

    //recomputes the below for us after we've messed around with the geometry so lighting works --bhd
    groundGeometry.computeVertexNormals();
    groundGeometry.computeTangents();
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      //color: 0x202020,
      metalness: 0.5,
      //metalness: 0.1,
      roughness: 0.1,
      //roughness: 0.6,
      //use to view the geo --bhd
      wireframe: false,
      vertexColors: true
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.#scene_.add(groundMesh);
  }

  #setupThreejs_() {
    this.#threejs_ = new THREE.WebGLRenderer( { antialias: true } );
    this.#threejs_.shadowMap.enabled = true;
    this.#threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#threejs_.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(this.#threejs_.domElement);

    const fov = 70;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#camera_.position.set(400, 200, 400);
    this.#camera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 1, 0);

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);
  }

  #setupBasicScene_(pane) {
    // Light
    const light = new THREE.DirectionalLight(0xFFFFFF, 2.0);
    light.position.set(5, 20, 5);
    light.lookAt(new THREE.Vector3());
    light.castShadow = true;
    light.shadow.mapSize.setScalar(1024);
    light.shadow.camera.near = 1.0;
    light.shadow.camera.far = 100;
    light.shadow.camera.left = -5;
    light.shadow.camera.right = 5;
    light.shadow.camera.top = 5;
    light.shadow.camera.bottom = -5;
    light.shadow.bias = -0.001;
    this.#scene_.add(light);

    const bgFolder = pane.addFolder({ title: 'Background' });

    this.#scene_.backgroundBlurriness = 0.4;
    this.#scene_.backgroundIntensity = 0.5;
    this.#scene_.environmentIntensity = 0.5;

    bgFolder.addBinding(this.#scene_, 'backgroundBlurriness', { min: 0, max: 1, step: 0.01 });
    bgFolder.addBinding(this.#scene_, 'backgroundIntensity', { min: 0, max: 1, step: 0.01 });
    bgFolder.addBinding(this.#scene_, 'environmentIntensity', { min: 0, max: 1, step: 0.01 });

    this.#LoadRGBE_('./resources/skybox/autumn_field_puresky_2k.hdr')
  }

  #LoadRGBE_(path) {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(path , (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

      this.#scene_.background = hdrTexture;
      this.#scene_.environment = hdrTexture;
    });
  }

  #onWindowResize_() {
    const dpr = window.devicePixelRatio;
    const canvas = this.#threejs_.domElement;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const aspect = w / h;

    this.#threejs_.setSize(w * dpr, h * dpr, false);
    this.#camera_.aspect = aspect;
    this.#camera_.updateProjectionMatrix();
  }

  #raf_() {
    requestAnimationFrame((t) => {
      this.#step_(this.#clock_.getDelta());
      this.#render_();
      this.#raf_();
    });
  }

  #render_() {
    this.#threejs_.render(this.#scene_, this.#camera_);
  }

  #step_(timeElapsed) {
    this.#controls_.update();
  }
}


let APP_ = null;

window.addEventListener('DOMContentLoaded', async () => {
  APP_ = new App();
  await APP_.initialize();
});
