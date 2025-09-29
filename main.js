import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from "https://cdn.skypack.dev/cannon-es";


    // Basic global state
    let scene, camera, renderer, controls, world;
    let objects = []; // {mesh, body, mass, destructible, health, fragility}
    let score = 0;
    const pointsEl = document.getElementById('points');
    const dmgEl = document.getElementById('damageMultiplier');
    const overlay = document.getElementById('overlay');

    // Upgrade state
    let damageMultiplier = 1.0; // base damage multiplier
    const upgradeCostBase = 100;

    // Init renderer, camera, scene
    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 2000);
      renderer = new THREE.WebGLRenderer({antialias:true});
      renderer.setSize(innerWidth, innerHeight);
      document.body.appendChild(renderer.domElement);

      // Lighting
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
      hemi.position.set(0,200,0); scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(-100,200,100); scene.add(dir);

      // Physics world
      world = new CANNON.World();
      world.gravity.set(0,-9.82,0);
      world.broadphase = new CANNON.SAPBroadphase(world);
      world.solver.iterations = 10;

      // Floor
      const groundMat = new THREE.MeshStandardMaterial({color:0x228B22});
      const groundGeo = new THREE.PlaneGeometry(2000,2000);
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

      const groundBody = new CANNON.Body({ mass: 0 });
      const groundShape = new CANNON.Plane();
      groundBody.addShape(groundShape);
      groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);
      world.addBody(groundBody);

      // Controls
      controls = new PointerLockControls(camera, renderer.domElement);
      controls.getObject().position.set(0,2,5);
      scene.add(controls.getObject());

      // Simple sky / fog
      scene.fog = new THREE.Fog(0x87ceeb, 30, 300);

      window.addEventListener('resize', onWindowResize);
      window.addEventListener('mousedown', onMouseDown);

      preloadModelsAndSpawn();
      animate();
    }

    function onWindowResize(){
      camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    }

    // Simple model loader + random spawner
    async function preloadModelsAndSpawn(){
      const loader = new GLTFLoader();
      const sampleUrls = [
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf',
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF/Avocado.gltf'
      ];

      const gltfs = await Promise.all(sampleUrls.map(url => loader.loadAsync(url)));

      // spawn many objects randomly with properties
      for(let i=0;i<30;i++){
        const gltf = gltfs[i % gltfs.length];
        const model = gltf.scene.clone(true);
        const scale = 0.4 + Math.random()*1.8;
        model.scale.setScalar(scale);
        model.position.set((Math.random()-0.5)*40, 2 + Math.random()*6, (Math.random()-0.5)*40);
        scene.add(model);

        // Approximate bounding box for physics body
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3(); box.getSize(size);
        // Prevent zero sizes
        size.x = Math.max(0.1, size.x); size.y = Math.max(0.1, size.y); size.z = Math.max(0.1, size.z);
        const halfExtents = new CANNON.Vec3(size.x/2, size.y/2, size.z/2);
        const mass = Math.max(0.1, (size.x * size.y * size.z) * 5.0); // heavier bodies for bigger models

        const shape = new CANNON.Box(halfExtents);
        const body = new CANNON.Body({ mass });
        body.addShape(shape);
        body.position.set(model.position.x, model.position.y, model.position.z);
        body.linearDamping = 0.31;
        world.addBody(body);

        // destructible properties
        const fragility = 0.5 + Math.random()*1.5; // lower = tougher, higher = more fragile
        const baseHealth = Math.max(5, mass * (2.0 / fragility));

        const obj = { mesh: model, body, mass, destructible: true, health: baseHealth, fragility };
        objects.push(obj);

        // collision listener: compute damage on collide
        body.addEventListener('collide', (e) => {
          // estimate impact using relative velocity along normal if available
          try {
            const relVel = e.contact.getImpactVelocityAlongNormal();
            const impact = Math.abs(relVel || body.velocity.length());
            handleImpact(obj, impact, e);
          } catch(err){
            const impact = body.velocity.length();
            handleImpact(obj, impact, e);
          }
        });
      }
    }

    function handleImpact(obj, impact, event){
      if(!obj.destructible) return;
      // Damage formula: impact * (damageMultiplier) * (fragility factor) * small random
      const damage = impact * damageMultiplier * (obj.fragility) * (0.2 + Math.random()*0.6);
      obj.health -= damage;

      // Award points proportional to damage
      const awarded = Math.round(damage * Math.max(1, obj.mass * 0.05));
      if(awarded > 0) addPoints(awarded);

      // Visual feedback: flash scale / tint
      flashObject(obj);

      if(obj.health <= 0){
        // mark as destroyed (not removed — just change behavior)
        obj.destructible = false;
        // reduce mass so it reacts more (or we could make it heavier depending on design)
        obj.body.mass = Math.max(0.01, obj.mass * 0.2);
        obj.body.updateMassProperties();
        // make it visually "broken" — here simply dim it and scale a bit
        obj.mesh.traverse(node=>{ if(node.material) node.material.opacity = 0.8; });
        obj.mesh.scale.multiplyScalar(0.9);
        addPoints(50); // bonus for destroying
      }
    }

    // Visual flash implementation
    function flashObject(obj){
      const origScale = obj.mesh.scale.clone();
      // quick scale punch
      const t0 = performance.now();
      const dur = 200;
      const start = origScale.clone();
      const target = origScale.clone().multiplyScalar(1.12);
      const tick = ()=>{
        const now = performance.now();
        const p = Math.min(1,(now - t0)/dur);
        obj.mesh.scale.lerpVectors(start, target, 1 - Math.abs(0.5 - p)*2);
        if(p < 1) requestAnimationFrame(tick);
        else obj.mesh.scale.copy(origScale);
      };
      tick();
    }

    // Input: punch / pickup / throw
    let carried = null;
    function onMouseDown(e){
      if(e.button === 0) { // left click - punch / interact
        if(carried){
          // throw with forward impulse scaled by damage multiplier
          const dir = new THREE.Vector3(); controls.getDirection(dir);
          const forceScalar = 18 * (carried.mass || 1) * damageMultiplier;
          const force = dir.multiplyScalar(forceScalar);
          carried.body.type = CANNON.Body.DYNAMIC;
          carried.body.applyImpulse(new CANNON.Vec3(force.x, force.y + 2, force.z), carried.body.position);
          carried = null;
        } else {
          // raycast to find nearest object in front
          const raycaster = new THREE.Raycaster();
          const origin = controls.getObject().position.clone();
          const forward = new THREE.Vector3(); controls.getDirection(forward);
          raycaster.set(origin, forward);
          const intersects = raycaster.intersectObjects(objects.map(o=>o.mesh), true);
          if(intersects.length){
            const pickedMesh = intersects[0].object;
            const obj = objects.find(o=>o.mesh === pickedMesh || o.mesh.children.includes(pickedMesh));
            if(obj){
              // apply an impulse to the body (punch)
              const impulse = new CANNON.Vec3(forward.x*6*obj.mass*damageMultiplier, forward.y*6*obj.mass*damageMultiplier + 2, forward.z*6*obj.mass*damageMultiplier);
              obj.body.applyImpulse(impulse, obj.body.position);
              // award points based on impulse magnitude
              const added = Math.round( (impulse.length() / 5) * (obj.mass) );
              addPoints(added);
            }
          }
        }
      } else if(e.button === 2) { // right click - pick up
        e.preventDefault();
        if(!carried){
          const origin = controls.getObject().position.clone();
          const forward = new THREE.Vector3(); controls.getDirection(forward);
          const raycaster = new THREE.Raycaster(origin, forward, 0, 4);
          const intersects = raycaster.intersectObjects(objects.map(o=>o.mesh), true);
          if(intersects.length){
            const pickedMesh = intersects[0].object;
            const obj = objects.find(o=>o.mesh === pickedMesh || o.mesh.children.includes(pickedMesh));
            if(obj){
              carried = obj;
              obj.body.type = CANNON.Body.KINEMATIC;
              obj.body.velocity.set(0,0,0);
            }
          }
        } else {
          // drop
          carried.body.type = CANNON.Body.DYNAMIC;
          carried = null;
        }
      }
    }

    function addPoints(n){ score += n; pointsEl.textContent = 'Points: ' + score; }

    // Animate loop + sync physics
    const clock = new THREE.Clock();
    function animate(){
      requestAnimationFrame(animate);
      const dt = Math.min(0.02, clock.getDelta());
      world.step(1/60, dt, 3);

      // sync meshes with physics
      for(const o of objects){
        if(o.body.type === CANNON.Body.KINEMATIC && o === carried){
          const forward = new THREE.Vector3(); controls.getDirection(forward);
          const target = controls.getObject().position.clone().add(forward.multiplyScalar(2));
          o.body.position.set(target.x, target.y, target.z);
          o.mesh.position.copy(o.body.position);
          o.mesh.quaternion.copy(o.body.quaternion);
        } else {
          o.mesh.position.copy(o.body.position);
          o.mesh.quaternion.copy(o.body.quaternion);
        }
      }

      renderer.render(scene, camera);
    }

    // UI hooks for upgrades
    document.getElementById('upgradeBtn').addEventListener('click', ()=>{
      const cost = Math.round(upgradeCostBase * Math.pow(1.6, Math.max(0, Math.floor((damageMultiplier - 1)/0.1))));
      if(score >= cost){
        score -= cost; pointsEl.textContent = 'Points: ' + score;
        damageMultiplier *= 1.10; // +10%
        dmgEl.textContent = 'Damage: x' + damageMultiplier.toFixed(2);
      } else {
        alert('Not enough points — need ' + cost);
      }
    });

    // Hook up UI
    document.getElementById('playBtn').addEventListener('click', ()=>{
      overlay.style.display = 'none';
      controls.lock();
      if(!scene) init();
    });
    document.getElementById('howBtn').addEventListener('click', ()=>{
      alert('Left click: punch / throw held object. Right click: pick up (hold), Right click again: drop. Move with WASD, mouse to look. Upgrade damage at top-left.');
    });

    // Prevent default context menu for canvas
    window.addEventListener('contextmenu', e => e.preventDefault());