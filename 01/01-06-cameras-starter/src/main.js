import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Pane } from 'tweakpane';
import Stats from 'three/addons/libs/stats.module.js'


class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  #perspectiveCamera_ = null;
  #orthographicCamera_ = null;

  #debugParams_ = {};
  #stats_ = null;

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
    this.#threejs_.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.#threejs_.domElement);

    const fov = 30;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
  
    this.#perspectiveCamera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);

    const width = 3;
    this.#orthographicCamera_ = new THREE.OrthographicCamera(-width * aspect, width * aspect, -width, width, near, far);
    
    this.#camera_ = this.#perspectiveCamera_;
    this.#camera_.position.set(2, 1, 2);
    this.#camera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 0, 0);

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);

    //setup simple scene
    const directionalLight = new THREE.DirectionalLight();
    directionalLight.position.set(1, 2, 1);
    directionalLight.lookAt(new THREE.Vector3(0, 0, 0));
    this.#scene_.add(directionalLight);

    const ambientLight = new THREE.AmbientLight();
    this.#scene_.add(ambientLight);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({color: 0xFF0000})
    //const cube = new THREE.Mesh(geo, mat);
    
    for (let x = -2; x <= 2; x++)
    {
      for (let z = -2; z <= 2; z++)
      {
        const cube = new THREE.Mesh(geo, mat);
        cube.position.set(x * 2, 0, z * 2);
        this.#scene_.add(cube);
      }
    }

    const pane = new Pane();
    const debugUI = pane.addFolder({
      title: "Debug"
    });
    this.#debugParams_ = {
      camera: {
        type: "perspective",
        perspective: "perspective",
        orthographic: "orthographic"
      },
      fov: fov,
      near: near,
      far: far,
      innerWidth: innerWidth,
      innerHeight: innerHeight,
      aspectRatio: aspect
    }
    debugUI.addBinding(this.#debugParams_.camera, 'type', {
      options: {
        perspective: this.#debugParams_.camera.perspective,
        orthographic: this.#debugParams_.camera.orthographic
      }
    }).on('change', (evt) => {
      if (evt.value === 'perspective')
      {
        this.#camera_ = this.#perspectiveCamera_;
      }
      else
      {
        this.#camera_ = this.#orthographicCamera_;
      }
    })
    debugUI.addBinding(this.#debugParams_, 'fov', {
      min: 0, max: 140, step: 10
    }).on('change', (evt) => {
      this.#perspectiveCamera_.fov = evt.value;
      this.#perspectiveCamera_.updateProjectionMatrix();
    })
    debugUI.addBinding(this.#debugParams_, 'near', {
      min: 0.0, max: 5.0, step: 0.1 
    }).on('change', (evt) => {
      this.#camera_.near = evt.value;
      this.#camera_.updateProjectionMatrix();
    })
    debugUI.addBinding(this.#debugParams_, 'far', {
      min: -5000, max: 5000, step: 100 
    }).on('change', (evt) => {
      this.#camera_.far = evt.value;
      this.#camera_.updateProjectionMatrix();
    })
    debugUI.addBinding(this.#debugParams_,'aspectRatio')
      .on('change', (evt) => {
        var newAspect = evt.value;
        var currentCamera = this.#debugParams_.camera.type;
        if (currentCamera === 'perspective') {
          this.#camera_.aspect = newAspect;
        }
        else {
          this.#camera_.left = -width * newAspect;
          this.#camera_.right = width * newAspect;
        }
        this.#camera_.updateProjectionMatrix();  
      }); 
    
    this.#stats_ = new Stats();
    document.body.appendChild(this.#stats_.domElement);
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
    
    this.#perspectiveCamera_.aspect = aspect;
    this.#perspectiveCamera_.updateProjectionMatrix();
    
    this.#orthographicCamera_.left = -3 * aspect;
    this.#orthographicCamera_.right = 3 * aspect;
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
    this.#controls_.update(timeElapsed);

    this.#orthographicCamera_.position.copy(this.#perspectiveCamera_.position);
    this.#orthographicCamera_.quaternion.copy(this.#perspectiveCamera_.quaternion);
  }
}


let APP_ = null;

window.addEventListener('DOMContentLoaded', async () => {
  APP_ = new App();
  await APP_.initialize();
});
