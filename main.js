import { scene, camera, renderer } from './scene.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';

let model; // reference to your 3D model
let animationStarted = false;

// ----- Load GLB Model (can load ahead of time) -----
const loader = new GLTFLoader();
loader.load(
  './models/model.gltf',
  (gltf) => {
    model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
  },
  (xhr) => console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`),
  (error) => console.error('Error loading file:', error)
);

// ----- Animation Loop -----
function animate() {
  requestAnimationFrame(animate);

  if (model) {
    model.rotation.y += 0.01;
    model.rotation.x += 0.01;
    if (!scene.children.includes(model)) {
      scene.add(model); // add model when scene starts
    }
  }

  renderer.render(scene, camera);
}

// ----- Play Button Event -----
document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('playBtn');
  playButton.addEventListener('click', () => {
    console.log('Game started!');
  });
});


// ----- How to Button (optional) -----
const howToButton = document.getElementById('menu');
howToButton.addEventListener('click', (e) => {
  e.preventDefault();
  console.log('How to Play clicked!');
  // TODO: show instructions overlay
});
