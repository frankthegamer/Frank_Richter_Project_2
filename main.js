import * as THREE from '/lib/three.module.js';
import { GLTFLoader } from '/lib/GLTFLoader.js';

let scene, camera, renderer;
let model;
let animationStarted = false;

const playButton = document.getElementById('playBtn');
const howToButton = document.getElementById('menu');

// Verify buttons
if (!playButton || !howToButton) {
  console.error('Button not found: playBtn or menu');
  alert('Button not found. Check HTML IDs.');
}

// Load model
const loader = new GLTFLoader();
loader.load(
  '/Frank_Richter_Project_2/models/model.gltf', // Adjust based on your GitHub Pages URL
  (gltf) => {
    model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    console.log('Model loaded successfully');
    const box = new THREE.Box3().setFromObject(model);
    console.log('Model bounding box:', box);
    if (animationStarted) {
      scene.add(model);
      console.log('Model added to scene');
    }
  },
  (xhr) => console.log(`Model loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`),
  (error) => {
    console.error('Error loading model:', error);
    alert('Failed to load model. Check console for details.');
  }
);

playButton.addEventListener('click', () => {
  console.log('Play button clicked!');
  if (!animationStarted) {
    animationStarted = true;
    console.log('Game started!');

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    // Renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);
      console.log('Renderer initialized');
    } catch (e) {
      console.error('Renderer setup failed:', e);
      alert('WebGL setup failed. Check browser compatibility.');
      return;
    }

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    scene.add(directional);

    // Add test cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0);
    scene.add(cube);
    console.log('Test cube added');

    // Add model if loaded
    if (model) {
      scene.add(model);
      console.log('Model added to scene');
    } else {
      console.log('Model not yet loaded, will add when ready');
    }

    // Resize handler
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