import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  #sun_ = null;
  #earth_ = null;

  #earthOrbit_ = null;
  #moonOrbit_ = null;

  #orbits_ = [];

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

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#camera_.position.set(0, 0, 200);

    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 0, 0);

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);

    //this.#CreateSolarSystem2_();

    this.#CreateSolarSystem3_([
      {
        name: 'earth',
        size: 5,
        color: new THREE.Color(0x0000ff),
        distance: 60,
        speed: 1,
        moons: [
          {
            name: 'moon',
            size: 1,
            color: new THREE.Color(0x888888),
            distance: 8,
            speed: 2
          }
        ], 
      },
      {
        name: 'mars',
        size: 4,
        color: new THREE.Color(0xff0000),
        distance: 100,
        speed: .5,
        moons: [
          {
            name: 'phobos',
            size: 1,
            color: new THREE.Color(0x888888),
            distance: 7,
            speed: 3
          },
          {
            name: 'delmos',
            size: 1,
            color: new THREE.Color(0x888888),
            distance: 11,
            speed: 4
          }
        ], 
      }
    ]);
  }

  #CreateSolarSystem3_(planets) {

    const sunGeo = new THREE.SphereGeometry(40, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    //sun.add(this.#earthOrbit_);
    this.#scene_.add(sun);

    for (let i = 0; i < planets.length; i++)
    {
      const planetdata = planets[i];
      const planetGeo = new THREE.SphereGeometry(planetdata.size, 32, 32);
      const planetMat = new THREE.MeshBasicMaterial({color: planetdata.color});
      const planet = new THREE.Mesh(planetGeo, planetMat);
      planet.position.set(planetdata.distance, 0, 0);

      const planetOrbit = new THREE.Group();
      planetOrbit.add(planet);

      for (let j = 0; j < planetdata.moons.length; j++)
      {
        const moondata = planetdata.moons[j];
        const moonGeo = new THREE.SphereGeometry(moondata.size, 0, 0);
        const moonMat = new THREE.MeshBasicMaterial({color: moondata.color});
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.set(moondata.distance, 0, 0);
        const moonOrbit = new THREE.Group();
        moonOrbit.add(moon);
        planet.add(moonOrbit);
        this.#orbits_.push({target: moonOrbit, speed: moondata.speed});
      }

      this.#orbits_.push({target: planetOrbit, speed: planetdata.speed});
      sun.add(planetOrbit);
    }

    // const moonGeo = new THREE.SphereGeometry(1, 32, 32)
    // const moonMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    // const moon = new THREE.Mesh(moonGeo, moonMat);
    // moon.position.set(8, 0, 0)
    
    // this.#moonOrbit_ = new THREE.Group();
    // this.#moonOrbit_.add(moon);
    // this.#moonOrbit_.rotateX(.5);

    // const earthGeo = new THREE.SphereGeometry(5, 32, 32);
    // const earthMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    // this.#earth_ = new THREE.Mesh(earthGeo, earthMat);
    // this.#earth_.position.set(60, 0, 0);
    // this.#earth_.add(this.#moonOrbit_);

    // this.#earthOrbit_ = new THREE.Group();
    // this.#earthOrbit_.add(this.#earth_);

    // const sunGeo = new THREE.SphereGeometry(40, 32, 32);
    // const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    // this.#sun_ = new THREE.Mesh(sunGeo, sunMat);
    // this.#sun_.add(this.#earthOrbit_);
    // this.#scene_.add(this.#sun_);
  }

  #CreateSolarSystem2_() {
    const moonGeo = new THREE.SphereGeometry(1, 32, 32)
    const moonMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(8, 0, 0)
    
    this.#moonOrbit_ = new THREE.Group();
    this.#moonOrbit_.add(moon);
    this.#moonOrbit_.rotateX(.5);

    const earthGeo = new THREE.SphereGeometry(5, 32, 32);
    const earthMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    this.#earth_ = new THREE.Mesh(earthGeo, earthMat);
    this.#earth_.position.set(60, 0, 0);
    this.#earth_.add(this.#moonOrbit_);

    this.#earthOrbit_ = new THREE.Group();
    this.#earthOrbit_.add(this.#earth_);

    const sunGeo = new THREE.SphereGeometry(40, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.#sun_ = new THREE.Mesh(sunGeo, sunMat);
    this.#sun_.add(this.#earthOrbit_);
    this.#scene_.add(this.#sun_);
  }

  #CreateSolarSystem1_() {
    const moonGeo = new THREE.SphereGeometry(1, 32, 32)
    const moonMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(8, 0, 0)
    const earthGeo = new THREE.SphereGeometry(5, 32, 32);
    const earthMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    this.#earth_ = new THREE.Mesh(earthGeo, earthMat);
    this.#earth_.position.set(60, 0, 0);
    this.#earth_.add(moon);

    const sunGeo = new THREE.SphereGeometry(40, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.#sun_ = new THREE.Mesh(sunGeo, sunMat);
    this.#sun_.add(this.#earth_);
    this.#scene_.add(this.#sun_);
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
    for (let i = 0; i < this.#orbits_.length; i++)
    {
      const orbit = this.#orbits_[i];
      orbit.target.rotateY(timeElapsed * orbit.speed)  
    }
    
    
    //this.#controls_.update(timeElapsed);
    //this.#sun_.rotateY(timeElapsed);
    // this.#earthOrbit_.rotateY(timeElapsed);
    // this.#moonOrbit_.rotateY(timeElapsed * 2);
  }
}


const APP_ = new App();

window.addEventListener('DOMContentLoaded', async () => {
  await APP_.initialize();
});
