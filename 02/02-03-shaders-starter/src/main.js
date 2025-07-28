import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Pane } from 'tweakpane';


class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  #rawShaderMaterial_ = null;

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
    this.#setupShaders_(pane);
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
    this.#camera_.position.set(3, 2, 3);
    this.#camera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 0, 0);

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);
  }

  async #setupBasicScene_(pane) {
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

    const bgFolder = pane.addFolder({ title: 'Background', expanded: false});

    this.#scene_.backgroundBlurriness = 0.4;
    this.#scene_.backgroundIntensity = 0.5;
    this.#scene_.environmentIntensity = 0.5;

    bgFolder.addBinding(this.#scene_, 'backgroundBlurriness', { min: 0, max: 1, step: 0.01 });
    bgFolder.addBinding(this.#scene_, 'backgroundIntensity', { min: 0, max: 1, step: 0.01 });
    bgFolder.addBinding(this.#scene_, 'environmentIntensity', { min: 0, max: 1, step: 0.01 });

    this.#loadRGBE_('./resources/skybox/rosendal_park_sunset_1k.hdr')
  }

  async #setupShaders_(pane) {
    const vsh = await fetch('./resources/shaders/test-vsh-standard.glsl');
    const vshText = await vsh.text();
    const fsh = await fetch('./resources/shaders/test-fsh-standard.glsl');
    const fshText = await fsh.text();
    
    const vshRaw = await fetch('./resources/shaders/test-vsh-raw.glsl');
    const vshRawText = await vshRaw.text();
    const fshRaw = await fetch('./resources/shaders/test-fsh-raw.glsl');
    const fshRawText = await fshRaw.text();


    //console.log(vshText);
    //console.log(fshText);

    //when using the custom ShaderMaterial, you forego ThreeJS' entire rendering pipeline --bhd
    //so get no lighting or tone mapping.
    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: vshText,
      fragmentShader: fshText
    });

    //when using the custom RawShaderMaterial, you get even less --bhd
    //(i.e: camera position, projection matrix, etc.)
    const rawShaderMaterial = new THREE.RawShaderMaterial({
      //so Simon says ThreeJS appears to be supplying these at times even though --bhd
      //it's technically not supposed to when using the Raw shader.
      //to mitigate risk, he recommends defining them yourself and updating accordingly.
      uniforms: {
        projectionMatrix: { value: new THREE.Matrix4() },
        modelViewMatrix: { value: new THREE.Matrix4() },
        modelMatrix: { value: new THREE.Matrix4() },
        cameraPosition: { value: new THREE.Vector3() },
        tintColor: { value: new THREE.Color(0xFFFFFF) }
      },
      vertexShader: vshRawText,
      fragmentShader: fshRawText
    });


    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const cube = new THREE.Mesh(cubeGeo, rawShaderMaterial);
    this.#scene_.add(cube);

    const shaderFolder = pane.addFolder({
      'title' : 'Shader'
    });
    shaderFolder.addBinding(
      rawShaderMaterial.uniforms.tintColor, 'value',
      { view: 'color', color: { type : 'float' }}
    );

    this.#rawShaderMaterial_ = rawShaderMaterial;
  }

  #loadRGBE_(path) {
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
    this.#controls_.update(timeElapsed);

    if (this.#rawShaderMaterial_) {
      this.#rawShaderMaterial_.uniforms.projectionMatrix.value.copy(this.#camera_.projectionMatrix);
      //this only works for this demo per Simon; so, don't copy for production workloads --bhd
      this.#rawShaderMaterial_.uniforms.modelViewMatrix.value.copy(this.#camera_.matrixWorldInverse);
      this.#rawShaderMaterial_.uniforms.cameraPosition.value.copy(this.#camera_.position);
    }
  }
}


let APP_ = null;

window.addEventListener('DOMContentLoaded', async () => {
  APP_ = new App();
  await APP_.initialize();
});
