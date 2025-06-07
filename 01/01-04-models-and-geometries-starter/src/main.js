import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';


class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  #redMaterial_ = null;

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

    this.#stats_ = new Stats();
    document.body.appendChild(this.#stats_.dom);

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#camera_.position.set(0, 3, 5);
    this.#camera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 0, 0);

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);

    // const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    // this.#redMaterial_ = new THREE.MeshBasicMaterial({color: 0xff0000});
    // const cubeMesh = new THREE.Mesh(cubeGeo, this.#redMaterial_);
    // cubeMesh.position.x = -2;
    // this.#scene_.add(cubeMesh);

    // const cubeMesh2 = new THREE.Mesh(cubeGeo, this.#redMaterial_.clone());
    // cubeMesh2.position.x = 2;
    // this.#scene_.add(cubeMesh2);

    const NUM = 200;
    let geo = new THREE.BoxGeometry(1, 1, 1);
    let mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (let x = -NUM; x <= NUM; x++)
    {
      for (let z = -NUM; z <= NUM; z++)
      {
        let cube = new THREE.Mesh(geo, mat);
        cube.position.set(x * 2, 0, z * 2);
        this.#scene_.add(cube);
      }
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
      this.#step_(this.#clock_.getDelta());
      this.#render_();
      this.#raf_();
    });
  }

  #render_() {
    this.#threejs_.render(this.#scene_, this.#camera_);
  }

  #step_(timeElapsed) {
    this.#stats_.update();
    // this.#controls_.update(timeElapsed);
    // const WHITE = new THREE.Color(0xffffff);
    // const RED = new THREE.Color(0xff0000);
    // this.#redMaterial_.color.lerpColors(
    //   WHITE, RED, Math.sin(this.#clock_.getElapsedTime()) * .5 + .5
    // );
  }
}


const APP_ = new App();

window.addEventListener('DOMContentLoaded', async () => {
  await APP_.initialize();
});
