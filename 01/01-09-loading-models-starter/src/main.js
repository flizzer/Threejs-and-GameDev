import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Pane } from 'tweakpane';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

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
    this.#threejs_ = new THREE.WebGLRenderer();
    this.#threejs_.shadowMap.enabled = true;
    this.#threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#threejs_.toneMapping = THREE.ACESFilmicToneMapping;
    this.#threejs_.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.#threejs_.domElement);

    const fov = 70;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#camera_.position.set(2, 1, 2);
    this.#camera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 0, 0);

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);

    //directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.setScalar = 4096;
    dirLight.position.set(5, 50, 5);
    dirLight.target.position.set(0, 0, 0);
    this.#scene_.add(dirLight);
    this.#scene_.add(dirLight.target);

    const pointLight = new THREE.PointLight(0xFFFFFF, 2, 100);
    pointLight.position.set(0.25, -0.5, .75);
    pointLight.castShadow = true;

    //for comabatting z-fighting found with the toon shader by default --bhd
    //per Simon, adding a Bias is the easiest way to resolve
    //pointLight.shadow.normalBias = 0.05;
    //this.#scene_.add(pointLight);
    //const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1);
    //this.#scene_.add(pointLightHelper);

    //hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xD3E2E9, 0x856B58, 0.5);
    // this.#scene_.add(hemiLight);

    //ground plane
    const planeGeo = new THREE.PlaneGeometry(2, 2);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x444444
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.receiveShadow = true;
    planeMesh.rotation.x = -Math.PI / 2;

    //setting position of plane because not sure how to do it with a humanoid model yet --bhd
    //the model loads with origin at waist
    planeMesh.position.y = -1;
    this.#scene_.add(planeMesh);

    //GLTF loader
    this.#LoadGLTF('./resources/models/Panthro.glb');
    //this.#LoadGLTF('./resources/models/cube.glb');

    //RGB loader
    this.#LoadRGBE('./resources/skybox/rosendal_park_sunset_4k.hdr');
  }

  #LoadRGBE(path) {
    const loader = new RGBELoader();
    loader.load(path, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      this.#scene_.background = hdrTexture;
      this.#scene_.backgroundIntensity = 0.25;
      this.#scene_.environment = hdrTexture;
      this.#scene_.environmentIntensity = 0.25;
    });
  }

  #LoadGLTF(path) {
    
    //can load either the .gltf or the glb version with this --bhd
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {

      //traverse the scene graph and enable shadows on any meshes found --bhd
      gltf.scene.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
        //console.log(c);
      });
      gltf.scene.scale.setScalar(1);
      this.#scene_.add(gltf.scene);
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
    this.#controls_.update(timeElapsed);
  }
}


let APP_ = null;

window.addEventListener('DOMContentLoaded', async () => {
  APP_ = new App();
  await APP_.initialize();
});
