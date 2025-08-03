import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Pane } from 'tweakpane';


class App {

  #threejs_ = null;
  
  #characterCamera_ = null;
  #characterScene_ = null;
  #characterRenderTarget_ = null;
  
  #finalCamera_ = null;
  #finalScene_ = null;

  #clock_ = null;
  #controls_ = null;

  #mixer_ = null;
  #animations_ = {};
  #debugParams_ = null;

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
    this.#SetupScene_Kenny_(pane);
    this.#setupFinalScene_(pane);
  }

  #setupFinalScene_(pane) {
    const fov = 70;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#finalCamera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#finalCamera_.position.set(-3, 2, -3);
    this.#finalCamera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.#controls_ = new OrbitControls(this.#finalCamera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 1, 0);

    this.#finalScene_ = new THREE.Scene();
    this.#finalScene_.background = new THREE.Color(0xDFDFDF);

    const finalSceneFolder = pane.addFolder({ title: "Final Scene"});
    finalSceneFolder.addBinding(this.#finalScene_, 'background', {
      view: 'color', color: { type: 'float'}
    })

    // Light
    const light = new THREE.DirectionalLight(0xFFFFFF, 2.0);
    light.position.set(2, 4, -3);
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
    this.#finalScene_.add(light);

    //Create a quad
    // const geo = new THREE.PlaneGeometry(1, 1);
    // const mat = new THREE.MeshBasicMaterial({
    //   map: this.#characterRenderTarget_.texture,
    //   color: 0xFFFFFF,
    //   side: THREE.DoubleSide,
    // });
    // const quad = new THREE.Mesh(geo, mat);
    // quad.scale.setScalar(3);
    // this.#finalScene_.add(quad);

    //create a shadow plane
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.1 });

    //used a Basic material to debug -- bhd
    //const planeMat = new THREE.MeshBasicMaterial();

    const shadowMesh = new THREE.Mesh(planeGeo, planeMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.75;
    shadowMesh.scale.setScalar(10);
    shadowMesh.receiveShadow = true;
    this.#finalScene_.add(shadowMesh);

    //load the iPhone model
    const loader = new GLTFLoader();
    loader.setPath('./resources/models/iphone/');
    loader.load('apple_iphone_15_pro_max_black.glb', (gltf) => {
      gltf.scene.traverse(c => {
        c.castShadow = true;
      });
      gltf.scene.scale.setScalar(20);
      const screenObject = gltf.scene.getObjectByName('xXDHkMplTIDAXLN');
      screenObject.material.emissiveMap = this.#characterRenderTarget_.texture;
      screenObject.material.emissiveIntensity = 1.0;
      this.#finalScene_.add(gltf.scene);
    });

    this.#LoadRGBE_(
      this.#finalScene_, false, true, './resources/skybox/rosendal_park_sunset_1k.hdr');
  }

  #setupThreejs_() {
    this.#threejs_ = new THREE.WebGLRenderer( { antialias: true } );
    this.#threejs_.shadowMap.enabled = true;
    this.#threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#threejs_.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(this.#threejs_.domElement);

    //adjusting the minification and magnification filter controls how smooth/blurry (when LinearFilter is used due to interpolation)
    //and how blocky/pixelated (when NearestFilter is used cuz a single pixel value is chosent) --bhd
    const options = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    }
    //Simon guesses at the rough size of the iPhone screen hence 64 X 128 --bhd
    this.#characterRenderTarget_ = new THREE.RenderTarget(64, 128, options);

    const fov = 70;
    const aspect = this.#characterRenderTarget_.width / this.#characterRenderTarget_.height;
    //const aspect = window.innerWidth / window.innerHeight;

    const near = 0.1;
    const far = 1000;
    this.#characterCamera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#characterCamera_.position.set(3, 2, 3);
    this.#characterCamera_.lookAt(new THREE.Vector3(0, 0, 0));

    // this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    // this.#controls_.enableDamping = true;
    // this.#controls_.target.set(0, 1, 0);

    this.#characterScene_ = new THREE.Scene();
    this.#characterScene_.background = new THREE.Color(0x000000);
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
    this.#characterScene_.add(light);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(4, 4);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x202020,
      metalness: 0.1,
      roughness: 0.6,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.#characterScene_.add(groundMesh);

    const bgFolder = pane.addFolder({ title: 'Background' });

    bgFolder.addBinding(this.#characterScene_, 'backgroundBlurriness', { min: 0, max: 1, step: 0.01 });
    bgFolder.addBinding(this.#characterScene_, 'backgroundIntensity', { min: 0, max: 1, step: 0.01 });
    bgFolder.addBinding(this.#characterScene_, 'environmentIntensity', { min: 0, max: 1, step: 0.01 });

    this.#LoadRGBE_(this.#characterScene_, true, true, './resources/skybox/rosendal_park_sunset_1k.hdr')
  }

  #SetupScene_Kenny_(pane) {

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(4, 4);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x202020,
      metalness: 0.1,
      roughness: 0.6,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.#characterScene_.add(groundMesh);

    const loader = new GLTFLoader();
    loader.setPath('./resources/models/platformer/');
    loader.load('character.glb', (gltf) => {
      gltf.scene.traverse(c => {
        c.castShadow = true;
        c.receiveShadow = true;
        if (c.material instanceof THREE.MeshStandardMaterial) {
          c.material.roughness = 0.25;
          c.material.metalness = 0.2;
        }
      });
      gltf.scene.scale.setScalar(2);
      this.#characterScene_.add(gltf.scene);

      this.#mixer_ = new THREE.AnimationMixer(gltf.scene);
      for (const clip of gltf.animations) {
        const action = this.#mixer_.clipAction(clip);
        this.#animations_[clip.name] = {
          clip: clip,
          action: action
        };
      }

      // this.#animations_['idle'].action.play();

      this.#debugParams_ = {
        animation: {
          type: 'static',
          options: {},  
        }
      };
      for (const key in this.#animations_) {
        this.#debugParams_.animation.options[key] = key;
      }
  
      const debugUI = pane.addFolder({
        title: 'Character',
      });
      let previousAction = null;
      debugUI.addBinding(this.#debugParams_.animation, 'type', {
        options: this.#debugParams_.animation.options,
      }).on('change', (e) => {
        const action = this.#animations_[e.value].action;
        if (previousAction) {
          action.crossFadeFrom(previousAction, 0.2, false);
        }

        action.time = 0.0;
        action.enabled = true;
        action.play();
        previousAction = action;
      });

    });
  }

  #LoadRGBE_(scene, isBackground, isEnvironment, path) {
  //#LoadRGBE_(path) {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(path , (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      if (isBackground) {
        scene.background = hdrTexture;
      }
      if (isEnvironment) {
        scene.environment = hdrTexture;
      }
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

    //the characterCamera doesn't need these for resizing, only the final --bhd
    // this.#characterCamera_.aspect = aspect;
    // this.#characterCamera_.updateProjectionMatrix();

    this.#finalCamera_.aspect = aspect;
    this.#finalCamera_.updateProjectionMatrix();
  }

  #raf_() {
    requestAnimationFrame((t) => {
      this.#step_(this.#clock_.getDelta());
      this.#render_();
      this.#raf_();
    });
  }

  #render_() {
    this.#threejs_.setRenderTarget(this.#characterRenderTarget_);
    this.#threejs_.render(this.#characterScene_, this.#characterCamera_);
    this.#threejs_.setRenderTarget(null);
    this.#threejs_.render(this.#finalScene_, this.#finalCamera_);
  }

  #step_(timeElapsed) {
    this.#controls_.update(timeElapsed);
    if (this.#mixer_) {
      this.#mixer_.update(timeElapsed);
    }
  }
}


let APP_ = null;

window.addEventListener('DOMContentLoaded', async () => {
  APP_ = new App();
  await APP_.initialize();
});
