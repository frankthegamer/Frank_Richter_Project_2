// main.js
import { scene, camera, renderer } from './scene.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';

// Load GLB model
const loader = new GLTFLoader();
let model; // store reference to animate later

loader.load(
  './models/model.gltf',
  (gltf) => {
    model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    scene.add(model);
  },
  (xhr) => console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`),
  (error) => console.error('Error loading GLB:', error)
);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Optional: rotate the model if loaded
  if (model) {
    model.rotation.y += 0.01;
    model.rotation.x += 0.01;
  }

  renderer.render(scene, camera);
}
animate();
