import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Pane } from 'tweakpane';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';


class App {

  #threejs_ = null;
  #camera_ = null;
  
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;

  #cube_ = null;
  #sphere_ = null;
  #knot_ = null;

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
    this.#threejs_ = new THREE.WebGLRenderer({ antialias: true });
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

    //have to change the background for lit materials due to the cube 
    //showing up as black without lights --bhd
    //this.#scene_.background = new THREE.Color(0xFFFFFF);
    
    this.#scene_.background = new THREE.Color(0x000000);

    const hemiLight = new THREE.HemisphereLight(0xD3E2E9, 0x856B58, 0.5);
    this.#scene_.add(hemiLight);

    const pointLight = new THREE.PointLight(0xFFFFFF, 2, 100);
    pointLight.position.set(0.5, 0.7, 1);
    pointLight.castShadow = true;
    this.#scene_.add(pointLight);
    const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1);
    this.#scene_.add(pointLightHelper);


    const pane = new Pane();

    const params = {
      type: 'Cube',
    };

    pane.addBinding(params, 'type', {
      options : {
        Cube : 'Cube',
        Sphere : 'Sphere',
        Knot : 'Knot'
      }
    }).on('change', (evt) => {
      this.#cube_.visible = false;
      this.#sphere_.visible = false;
      this.#knot_.visible = false;
      if (evt.value === 'Cube')
        this.#cube_.visible = true;
      if (evt.value === 'Sphere')
        this.#sphere_.visible = true;
      if (evt.value === 'Knot')
        this.#knot_.visible = true;
    });

    const lightFolder = pane.addFolder({ title: 'Light'});
    lightFolder.addBinding(
      pointLight,
      'position',
      {x: {min: -2, max: 2}, y: {min: -2, max: 2}, z: {min: -2, max: 2}}
    );

    const material = this.#Test_MeshStandardMaterial(pane);
    
    //const material = this.#Test_MeshPhongMaterial(pane);

    //const material = this.#Test_MeshMatCapMaterial(pane);
    
    //can use 3dtextures.me to download textures --bhd
    //can also use pbrmaterials.com
    //const material = this.#Test_MeshLambertMaterial(pane);
   
    //const material = this.#Test_MeshBasicMaterial(pane);
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1, 128, 128, 128);
    this.#cube_ = new THREE.Mesh(cubeGeo, material);
    this.#cube_.castShadow = true;
    this.#cube_.receiveShadow = true;
    this.#scene_.add(this.#cube_);

    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
    this.#sphere_ = new THREE.Mesh(sphereGeo, material);
    this.#sphere_.castShadow = true;
    this.#sphere_.receiveShadow = true;
    this.#scene_.add(this.#sphere_);

    const knotGeo = new THREE.TorusKnotGeometry(.5, .1, 100, 16);
    this.#knot_ = new THREE.Mesh(knotGeo, material);
    this.#knot_.castShadow = true;
    this.#knot_.receiveShadow = true;
    this.#scene_.add(this.#knot_);

    this.#sphere_.visible = false;
    this.#knot_.visible = false;
  }

  #Test_MeshStandardMaterial(pane) {
    const loader = new THREE.TextureLoader();

    //also known as the diffuse map --bhd
    const map = loader.load('/textures/RED_BRICK_001_1K_BaseColor.jpg');
    map.colorSpace = THREE.SRGBColorSpace;

    const normalMap = loader.load('/textures/RED_BRICK_001_1K_Normal.jpg');

    //ThreeJS PBR material; used in most modern engines nowadays --bhd
    //uses BRDF (Bidirectional Reflectance Distribution Function) from Disney
    //https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
    //https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf
    //instead of the one "shinyness" value, there are metalness and roughness values to play with.
    const material = new THREE.MeshStandardMaterial({
      //map: map,
      //normalMap: normalMap,
      normalScale: new THREE.Vector2(1, -1)
    });
    
    const rgbeLoader = new RGBELoader()
    rgbeLoader.load('/skybox/golden_bay_4k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping; 
      material.envMap = texture;
      this.#scene_.background = texture;
    });

    const folder = pane.addFolder({title: 'MeshStandardMaterial'});
    folder.addBinding(material, 'color', { view: 'color', color: { type: 'float' } });
    folder.addBinding(material, 'emissive', { view: 'color', color: { type: 'float' } });
    folder.addBinding(material, 'metalness', { min: 0, max: 1 });
    folder.addBinding(material, 'roughness', { min: 0, max: 1 });
    //folder.addBinding(material, 'specular', { view: 'color', color: { type: 'float' } });
    
    //controls how tight the specular highlight is basically --bhd
    //folder.addBinding(material, 'shininess', { min: 0, max: 1000 });

    return material;
  }

  //first lit model we're looking at that takes specular highlights into account --bhd
  //rendering is pretty good, not quite as good as PBR materials, but more performant
  //tends to look a little plasticky according to Simon. He said graphics during PS3/Xbox 360 era
  //were all probably using Phong materials, not PBR ones.
  //basically a single "shinyness" value to play with
  #Test_MeshPhongMaterial(pane) {
    const loader = new THREE.TextureLoader();

    //also known as the diffuse map --bhd
    const map = loader.load('/textures/RED_BRICK_001_1K_BaseColor.jpg');
    map.colorSpace = THREE.SRGBColorSpace;

    const normalMap = loader.load('/textures/RED_BRICK_001_1K_Normal.jpg');

    const material = new THREE.MeshPhongMaterial({
      //map: map,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1, -1)
    });
    const folder = pane.addFolder({title: 'MeshPhongMaterial'});
    folder.addBinding(material, 'color', { view: 'color', color: { type: 'float' } });
    folder.addBinding(material, 'emissive', { view: 'color', color: { type: 'float' } });
    folder.addBinding(material, 'specular', { view: 'color', color: { type: 'float' } });
    
    //controls how tight the specular highlight is basically --bhd
    folder.addBinding(material, 'shininess', { min: 0, max: 1000 });

    return material;
  }

  //can basically "look up the lighting" using a MatCap texture --bhd
  //Simon says he's never seen one used in his career.  So, adding to our
  //bag of tricks for knowledge sake, but may never use it in practice.
  //doesn't react to light.  It's an unlit material.  
  #Test_MeshMatCapMaterial(pane) {
    const loader = new THREE.TextureLoader();
    const matCapTexture = loader.load('/textures/matcap.png');
    const material = new THREE.MeshMatcapMaterial({
      matcap: matCapTexture
    });
    return material;
  }

  //first lit material we're playing with --bhd
  //doesn't emit or reflect much light of of an object's surface
  //doesn't take into account the view or specular highlights
  //basically the simplest material lighting model
  #Test_MeshLambertMaterial(pane) {
    const loader = new THREE.TextureLoader();
    const map = loader.load('/textures/RED_BRICK_001_1K_BaseColor.jpg');
    map.colorSpace = THREE.SRGBColorSpace;

    const normalMap = loader.load('/textures/RED_BRICK_001_1K_Normal.jpg');

    //Note: the ambient occlusion map affects shading in crevices when lit by an ambient light
    //hence the name.  The hemisphere light in this case is the ambient light source.
    const aoMap = loader.load('/textures/RED_BRICK_001_1K_AmbientOcclusion.jpg');

    //Displacement Maps affect the acual geometry of the material
    const displacementMap = loader.load('/textures/displacement.png');

    const rgbeLoader = new RGBELoader();

    //Load an environment map --bhd
    //Simon uses https://polyhaven.com/hdris for these a lot apparently

    //Note: we're ignoring the bumpMap becauae it's essentially a legacy way of using textures.
    //If a normal map is supplied, the bumpMap is ignored and in fact, these likely aren't even
    //supplied by the texture and pbr site listed above
    const material = new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      //map: map,
      //aoMap: aoMap,
      //displacementMap: displacementMap,
      normalMap: normalMap,
      
      //need to set this because the normals weren't correct by default --bhd
      //basically inverts them so the light and shadows appear correctly
      //this is due to the "handedness" and needs to be checked when downloading files
      normalScale: new THREE.Vector2(-1, 1)

      //Emissive maps or colors are unaffected by other lighting.  Can produce a glowing
      //effect when using a map.
      //emissiveMap: displacementMap
    });

    rgbeLoader.load('/skybox/golden_bay_4k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping; 
      //material.envMap = texture;
      //this.#scene_.background = texture;
    });

    const folder = pane.addFolder({title: 'MeshLambertMaterial'});
    folder.addBinding(material, 'color', { view: 'color', color: { type: 'float' } });
    //folder.addBinding(material, 'wireframe');
    folder.addBinding(material, 'aoMapIntensity', { min: 0, max: 1 });
    //folder.addBinding(material, 'displacementScale', { min: 0, max: 1 });
    folder.addBinding(material, 'emissive', { view: 'color', color: { type: 'float' } });
    return material;
  }

  #Test_MeshBasicMaterial(pane) {
    const loader = new THREE.TextureLoader();
    const map = loader.load('/textures/RED_BRICK_001_1K_BaseColor.jpg');

    //most images are authored in SRGB color space; so, need to tell threejs that --bhd
    //in order for the true color to be used
    map.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      map: map
    });
    const folder = pane.addFolder({title: 'MeshBasicMaterial'});
    folder.addBinding(material, 'color', { view: 'color', color: { type: 'float' } });
    folder.addBinding(material, 'wireframe');
    return material
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
