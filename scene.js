import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';


export function createScene() {
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);


const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);


// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 0.7);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);


// floor
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x222532, roughness: 0.9 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);


return { scene, camera };
}