import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class App {

    #threejs_ = null;
    #camera_ = null;
    #scene_ = null;
    #clock_ = new THREE.Clock();
    #controls_ = null;
    #mesh_ = null

    constructor() {
        window.addEventListener('resize', () => {
            this.#onWindowResize_();
        })
    }

    initialize() {
        this.#threejs_ = new THREE.WebGLRenderer();
        this.#threejs_.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.#threejs_.domElement);

        const aspect = window.innerWidth / window.innerHeight;
        this.#camera_ = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
        this.#camera_.position.z = 5;

        this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
        this.#controls_.enableDamping = true;
        this.#controls_.target.set(0,0,0);
        this.#controls_.update();

        this.#scene_ = new THREE.Scene();

        this.#mesh_ = new THREE.Mesh(
            new THREE.BoxGeometry(),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true
            })
        );
        this.#scene_.add(this.#mesh_);
        
        this.#onWindowResize_();
        this.#raf();
    }

    #onWindowResize_() {
        const canvas = this.#threejs_.domElement;
        const dpr = window.devicePixelRatio;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const aspect = w / h;
        console.log(`Resizing window to ${w} x ${h}`);

        canvas.style.width = w + 'px';
         canvas.style.height = h + 'px';
        this.#threejs_.setSize(w * dpr, h * dpr, false);

        //generally don't want to use this as it hides what the actual resolution is and
        //works too much like magic --bhd
        //this.#threejs_.setPixelRatio(dpr);

        this.#camera_.aspect = aspect;
        this.#camera_.updateProjectionMatrix();
    }

    #raf() {
        requestAnimationFrame(() => {
            const deltaTime = this.#clock_.getDelta();
            this.#step_(deltaTime);
            this.#render_();
            this.#raf();
        });
    }

    #step_(timeElapsed) {
    
        //state updates
        this.#controls_.update(timeElapsed);
        this.#mesh_.rotation.x += timeElapsed;
        this.#mesh_.rotation.y += timeElapsed;
        this.#mesh_.rotation.z += timeElapsed;
    }

    #render_() {
       this.#threejs_.render(this.#scene_, this.#camera_); 
    }
};

const APP_ = new App();
APP_.initialize();