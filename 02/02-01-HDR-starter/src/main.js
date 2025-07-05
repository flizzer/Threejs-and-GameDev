import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Pane } from 'tweakpane';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'


class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  #debugParams_ = {};

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

    //light
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3.14159);
    directionalLight.position.set(5, 20, 5);
    directionalLight.target.position.set(0, 0, 0);
    //this.#scene_.add(directionalLight);
    this.#scene_.add(directionalLight.target);

    //create a ring of lights for demoing HDR tone mapping --bhd
    for (let i = 0; i < 10; i++)
    {
      const angle = Math.PI * 2 * (i / 10);
      const lightColor = new THREE.Color().setHSL(i / 10, 1, 0.5);
      const light = new THREE.PointLight(lightColor, 20);
      const radius = 1;
      light.position.set(radius * Math.cos(angle), 0.5, radius * Math.sin(angle));
      this.#scene_.add(light);

      const helper = new THREE.PointLightHelper(light, 0.1);
      this.#scene_.add(helper);
    }

    //create a cube --bhd
    //const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

    //creat a sphere --bhd
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const midGraytexture = textureLoader.load('/resources/textures/mid-grey.png');

    //when loading textures can have the same problem as setting the color --bhd
    //when loading a color, you probably do want ThreeJS to do the color conversion
    //so we set the colorspace property to SRGBColorSpace.  Other times you may not though.
    //when this looks correct, the falloff should look "linear" as shown in this this Unity article:
    //https://docs.unity3d.com/6000.1/Documentation/Manual/differences-linear-gamma-color-space.html
    //if you see a "soft" falloff like with the gamma picture, then you're probably operating in the
    //wrong colorspace
    midGraytexture.colorSpace = THREE.SRGBColorSpace;

    //const cubeMat = new THREE.MeshBasicMaterial({
    const sphereMat = new THREE.MeshStandardMaterial({

      color: 0xFFFFFF,
      roughness: 0.0,
      metalness: 0.0
      //map: midGraytexture
      //when setting the color using the RGB syntax, 
      //ThreeJS assumes the color is provided in Linear SRGB Color Space
      //and converts to SRGB Color Space.
      //This causes the color to be slightly lighter than the expected mid gray
      //ThreeJS works in Linear space and converts to SRGB for output by default 
      //Have to be mindful of the colorspace you're working in
      //https://threejs.org/docs/#api/en/math/Color.setRGB --bhd
      //color: new THREE.Color(0.5, 0.5, 0.5)
      //color: new THREE.Color(0.217, 0.217, 0.217) //the mid gray value already converted into Linear

      //when setting the color using the Hexadecimal syntax,
      //ThreeJS assume the color is already provided in SRGB Color Space
      //and the color output matches the mid gray we expect
      //ThreeJS works in Linear space and converts to SRGB for output by default 
      //Have to be mindful of the colorspace you're working in
      //https://threejs.org/docs/#api/en/math/Color.setHex --bhd
      //color: new THREE.Color(0x808080)

    });
    //const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    
    //this.#scene_.add(cubeMesh);
    //this.#scene_.add(sphereMesh);

    //load a GLTF model --bhd
    const gltfLoader = new GLTFLoader();
    gltfLoader.setPath('./resources/models/')
    gltfLoader.load('skritek_-_wooden_statue.glb', (gltf) => {
      gltf.scene.scale.setScalar(0.1);
      this.#scene_.add(gltf.scene);
    });

    //Debug UI --bhd
    const pane = new Pane();
    this.#debugParams_ = {
      outputColorSpace: {
        type: THREE.SRGBColorSpace,
        options: {
          'Linear SRGB': THREE.LinearSRGBColorSpace,
          'SRGB': THREE.SRGBColorSpace
        }
      },
      midGray: {
        type: midGraytexture.colorSpace,
        options: {
          'No Color': THREE.NoColorSpace,
          'Linear SRGB': THREE.LinearSRGBColorSpace,
          'SRGB': THREE.SRGBColorSpace
        }
      },
      toneMapping: {
        type: THREE.NoToneMapping,
        options: {
          None: THREE.NoToneMapping,
          Linear: THREE.LinearToneMapping,
          Reinhard: THREE.ReinhardToneMapping,
          AcesFilmic: THREE.ACESFilmicToneMapping,
          Cineon: THREE.CineonToneMapping,
          AgX: THREE.AgXToneMapping,
          Neutral: THREE.NeutralToneMapping
        },
        exposure: 1
      }
    };

    const hdrFolder = pane.addFolder({title: 'HDR Folder'});
    hdrFolder.addBinding(this.#debugParams_.outputColorSpace, 'type', {
      options: this.#debugParams_.outputColorSpace.options  
    }).on('change', (evt) => {
      this.#threejs_.outputColorSpace = evt.value;
    });
    
    hdrFolder.addBinding(this.#debugParams_.toneMapping, 'type', {
      options: this.#debugParams_.toneMapping.options  
    }).on('change', (evt) => {
      this.#threejs_.toneMapping = evt.value;
    });

    hdrFolder.addBinding(this.#debugParams_.toneMapping, 'exposure', {
      min: 0.25,
      max: 2
    }).on('change', (evt) => {
      this.#threejs_.toneMappingExposure= evt.value;
    });

    const grayFolder = pane.addFolder({title: 'Mid Gray'});
    grayFolder .addBinding(this.#debugParams_.midGray, 'type', {
      options: this.#debugParams_.midGray.options  
    }).on('change', (evt) => {
      midGraytexture.colorSpace = evt.value;
      midGraytexture.needsUpdate = true;
    });

    //this.#LoadCubemap_('./resources/skybox/cubemaps/rosendal_park_sunset/');

    //using HDR without tonemapping will cause the light reflected from high-luminescent --bhd
    //sources like the sun or lights to look really washed out.  Tonemapping allow for this
    //to be controlled
    //this.#LoadRGBE_('./resources/skybox/rosendal_park_sunset_1k.hdr');
  }

  #LoadRGBE_(path)
  {
    const loader = new RGBELoader();
    loader.load(path, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

      this.#scene_.background = hdrTexture;
      this.#scene_.environment = hdrTexture;
    });
  }

  #LoadCubemap_(path) {
    const faces = [ 'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png' ];
    const loader = new THREE.CubeTextureLoader();
    loader.setPath(path);
    const cubeTexture = loader.load(faces);
    this.#scene_.background = cubeTexture;
    this.#scene_.environment = cubeTexture;
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
