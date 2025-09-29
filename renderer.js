import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';


export function createRenderer() {
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


window.addEventListener('resize', () => {
const width = window.innerWidth;
const height = window.innerHeight;
renderer.setSize(width, height);
if(renderer.camera) {
renderer.camera.aspect = width / height;
renderer.camera.updateProjectionMatrix();
}
});


return renderer;
}