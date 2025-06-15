import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Pane } from 'tweakpane';
import Stats from 'three/addons/libs/stats.module.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js'


class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  #stats_ = null;

  #cube_ = null;
  #torus_ = null;

  #light_ = null;
  #lightHelper_ = null;

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

    //must enable shadowmap globally in order to use shadows --bhd
    //optionally can set the type of shadowmap
    //PCFSoftShadowMaps are the "nicest" type per SimonDev.  Supported by all shaders
    //stands for Percentage Closer Filtering Shadow Maps
    this.#threejs_.shadowMap.enabled = true;
    this.#threejs_.shadowMap.type = THREE.PCFSoftShadowMap;

    this.#threejs_.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.#threejs_.domElement);

    const fov = 70;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#camera_.position.set(0, 3, 15);
    this.#camera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 0, 0);

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);

    this.#stats_ = new Stats();
    document.body.appendChild(this.#stats_.domElement);
    this.#createScene_();
  }

  #createScene_() {

    //not much to play with with an ambient light...color and intensity. --bhd
    //just a filler light basically; very flat
    // const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
    // this.#scene_.add(ambientLight);

    //can get slightly better with a hemisphere light; a little more depth --bhd
    //can tweak the sky color and the ground color, and intensity
    //still a filler light so don't want it too intense really; still quite flat
    const hemiLight = new THREE.HemisphereLight(0xD3E2E9, 0x856B38, 0.5);
    this.#scene_.add(hemiLight);

    //directional lights do have a position and you also set a target. --bhd
    //The target has to be added to the scene as well.
    //the directional light uses an orthographaic camera and can tweak these params
    //this may be needed if the shadows are getting cutoff. 
    // Note the use of the SIZE constant for this.
    const SIZE = 48;
    const directionalLight = new THREE.DirectionalLight()
    directionalLight.position.set(5, 20, -5);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -SIZE;
    directionalLight.shadow.camera.right = SIZE;
    directionalLight.shadow.camera.top = SIZE;
    directionalLight.shadow.camera.bottom = -SIZE;

    //when setting the camera size this may cause the shadow map in use to be stretched
    //the default is 512 x 512 per the docs.  So you may want to increase the shadowmap size.
    //this will allow for crisper shadows.
    //This uses 4x more memory each time you double the size though!
    //NOTE: this is also not viable for handling larger scenes. 
    //Can't just keep bumping up the shadow map size to get crisp resolution.
    //Instead, need more advanced techniques like CSM (cascaded shadow maps) which will be covered later.
    directionalLight.shadow.mapSize.set(1024, 1024);

    this.#scene_.add(directionalLight);
    this.#scene_.add(directionalLight.target);

    //create a spotlight --bhd
    //also supports a position, target, and intensity.
    //the penumbra is how soft or sharp the falloff is on the outside of the light
    //can set shadow map size and near/far just like a directional light
    //but uses a perspective camera so don't set top/bottom and left/right; controlled by the angle set
    //a little easier to use
    // const spotlight = new THREE.SpotLight(0xFFFFFF, 200, 50, Math.PI / 6, 1);
    // spotlight.position.set(5, 5, 5);
    // spotlight.target.position.set(0, 0, 0);
    // spotlight.castShadow = true;
    // this.#scene_.add(spotlight);
    // this.#scene_.add(spotlight.target);
    // this.#light_ = spotlight;

    // const spotlightHelper = new THREE.SpotLightHelper(spotlight)
    // this.#scene_.add(spotlightHelper);
    // this.#lightHelper_ = spotlightHelper;

    //create a pointLight --bhd
    //color, intensity, distance, decay
    //usually don't set the decay unless you have a specific reason 
    //as it's set for realistic lighting by default
    //shadow map params can be set same as the SpotLight
    //keep in mind that enabling shadows with a PointLight is easy
    //but it has to do a lot of work behind the scenes.  Does it in multiple passes.
    //if dealing with a cube, it basically has to render the scene 6 times (1 for each cube face)
    // const pointLight = new THREE.PointLight(0xFFFFFF, 10, 1000, 2);
    // pointLight.position.set(0, 2, 0);
    // pointLight.castShadow = true;
    // this.#scene_.add(pointLight);

    // const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1);
    // this.#scene_.add(pointLightHelper);

    //create a RectAreaLight --bhd
    //more difficult to implement and no shadow support
    //requires special include and initialization
    //lookAt is used because there is no target as with some other lights above
    // const rectAreaLight = new THREE.RectAreaLight(0xFFFFFF, 1, 4, 5)
    // rectAreaLight.position.set(0, 1, 0);
    // rectAreaLight.lookAt(new THREE.Vector3(0, 0, 1))
    // this.#scene_.add(rectAreaLight);
    // const rectAreaLightHelper = new RectAreaLightHelper(rectAreaLight);
    // this.#scene_.add(rectAreaLightHelper);


    const floorGeo = new THREE.PlaneGeometry(500, 500);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      roughness: .5,
      metalness: .5
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    this.#scene_.add(floor);

    //some walls
    const wallGeo = new THREE.BoxGeometry(1, 4, 10);
    const wallMat = floorMat.clone();
    wallMat.color.setRGB(0.5, 0.5, 1);

    const wall1 = new THREE.Mesh(wallGeo, wallMat);
    wall1.position.set(-8, 0, 0);
    wall1.receiveShadow = true;
    wall1.castShadow = true;
    this.#scene_.add(wall1);
    
    const wall2 = new THREE.Mesh(wallGeo, wallMat);
    wall2.position.set(8, 0, 0);
    wall2.receiveShadow = true;
    wall2.castShadow = true;
    this.#scene_.add(wall2);

    //other assets
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const cubeMat = floorMat.clone();
    cubeMat.color.setRGB(1, 1, 0.5);
    cubeMat.roughness = 0.1;

    this.#cube_ = new THREE.Mesh(cubeGeo, cubeMat);
    this.#cube_.position.set(-3, 0, 3);
    this.#cube_.receiveShadow = true;
    this.#cube_.castShadow = true;
    this.#scene_.add(this.#cube_);

    const torusGeo = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
    const torusMat = floorMat.clone();
    torusMat.color.setRGB(1, 0.5, 0.5);
    this.#torus_ = new THREE.Mesh(torusGeo, torusMat);
    this.#torus_.position.set(3, 0, 3);
    this.#torus_.receiveShadow = true;
    this.#torus_.castShadow = true;
    this.#scene_.add(this.#torus_);

    for (let x = -5; x <= 5; x++)
    {
      const mat = floorMat.clone();
      mat.color.setRGB(0.5, 1, 0.5);
      const cube = new THREE.Mesh(cubeGeo, mat);
      cube.scale.set(2, 10, 2);
      cube.position.set(x * 10, 3, 0);
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.#scene_.add(cube);
    }

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
      this.#stats_.begin();
      this.#step_(this.#clock_.getDelta());
      this.#render_();
      this.#stats_.end();
      this.#raf_();
    });
  }

  #render_() {
    this.#threejs_.render(this.#scene_, this.#camera_);
  }

  #step_(timeElapsed) {
    // this.#light_.position.set(
    //   5 * Math.sin(this.#clock_.getElapsedTime() * 0.1),
    //   5,
    //   5 * Math.cos(this.#clock_.getElapsedTime() * 0.1));
    // this.#lightHelper_.update();
    this.#controls_.update(timeElapsed);
    this.#cube_.rotation.z += 0.11 * timeElapsed; 
    this.#cube_.rotation.x -= 0.2 * timeElapsed; 
    this.#torus_.rotation.x += .2 * timeElapsed; 
    this.#torus_.rotation.y -= 0.25 * timeElapsed; 
  }
}


let APP_ = null;

window.addEventListener('DOMContentLoaded', async () => {
  APP_ = new App();
  await APP_.initialize();
});
