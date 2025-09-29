import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer;
let model;
let animationStarted = false;

const playButton = document.getElementById('playBtn');
const howToButton = document.getElementById('menu');

// Preload model
const loader = new GLTFLoader();
loader.load(
  '/models/model.gltf', // Replace <your-repo-name> with your actual repo name, e.g., '/my-3d-project/models/model.gltf'
  (gltf) => {
    model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    console.log('Model loaded successfully');
    // Debug model size
    const box = new THREE.Box3().setFromObject(model);
    console.log('Model bounding box:', box);
    if (animationStarted) {
      scene.add(model);
    }
  },
  (xhr) => console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`),
  (error) => {
    console.error('Error loading model:', error);
    alert('Failed to load model. Check console for details.');
  }
);

playButton.addEventListener('click', () => {
  if (!animationStarted) {
    animationStarted = true;
    console.log('Game started!');

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    scene.add(directional);

    // Add model if already loaded
    if (model) {
      scene.add(model);
    } else {
      console.log('Model not yet loaded, will add when ready');
    }

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
  }
});

howToButton.addEventListener('click', () => {
  console.log('How to Play clicked!');
});

function animate() {
  requestAnimationFrame(animate);
  if (model) {
    model.rotation.y += 0.01;
    model.rotation.x += 0.01;
  }
  renderer.render(scene, camera);
}