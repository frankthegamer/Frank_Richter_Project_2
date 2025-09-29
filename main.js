console.log("main.js loaded ✅");


import { createScene } from './scene.js';
import { createRenderer } from './renderer.js';


const menu = document.getElementById('menu');
const playBtn = document.getElementById('playBtn');


let started = false;
playBtn.addEventListener('click', (e) => {
e.preventDefault();
if(started) return;
started = true;


// hide menu with animation
menu.classList.add('hidden');


// wait for animation to finish then start the scene
setTimeout(() => startScene(), 520);
});


function startScene() {
const { scene, camera } = createScene();
const renderer = createRenderer();
renderer.camera = camera;
document.body.appendChild(renderer.domElement);


function animate() {
requestAnimationFrame(animate);
renderer.render(scene, camera);
}
animate();
}