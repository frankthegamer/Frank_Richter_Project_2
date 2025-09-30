// main.js — UMD approach (works with your unchanged menu HTML)
// Expects: ./lib/babylon.js, ./lib/babylonjs.loaders.min.js, ./lib/cannon.min.js
(async function(){

  function loadScript(src){
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => res();
      s.onerror = (e) => rej(e);
      document.head.appendChild(s);
    });
  }

  // Load local libs (adjust if lib/ is elsewhere)
  await loadScript('./lib/babylon.js');
  await loadScript('./lib/babylonjs.loaders.min.js');
  await loadScript('./lib/cannon.min.js'); // exposes global CANNON

  // Wait DOM ready
  if(document.readyState === 'loading') await new Promise(r=>document.addEventListener('DOMContentLoaded', r));

  const playBtn = document.getElementById('playBtn');
  const howBtn = document.getElementById('menu');

  playBtn.addEventListener('click', startGame);
  howBtn.addEventListener('click', ()=> alert('Left click: punch/throw. Right click: pick/drop. Move: WASD.'));

  async function startGame(){
    // hide original menu elements (keeps HTML file unchanged)
    document.querySelectorAll('.card, .nav, .intro-card, .button').forEach(el => el.style.display = 'none');

    // create canvas and HUD
    const canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    Object.assign(canvas.style, {position:'fixed', top:'0', left:'0', width:'100%', height:'100%'});
    document.body.appendChild(canvas);

    const hud = document.createElement('div');
    Object.assign(hud.style, {position:'fixed', left:'12px', top:'12px', color:'#fff', fontFamily:'Arial, sans-serif', zIndex:9999});
    hud.innerHTML = '<div id="points">Points: 0</div><div id="damage">Damage: x1.00</div><button id="upgrade">Upgrade Damage (+10%) — Cost:100</button>';
    document.body.appendChild(hud);
    const pointsEl = document.getElementById('points');
    const dmgEl = document.getElementById('damage');
    const upgradeBtn = document.getElementById('upgrade');

    // Babylon setup
    const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:true});
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.52,0.8,0.96);

    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 1.8, 6), scene);
    camera.attachControl(canvas, true);
    camera.speed = 0.8;
    camera.angularSensibility = 400;
    camera.inputs.clear();
    camera.inputs.add(new BABYLON.FreeCameraKeyboardMoveInput());
    canvas.addEventListener('click', ()=> canvas.requestPointerLock?.());

    
    new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0,1,0), scene);
    
// Physics (Cannon plugin uses window.CANNON)
const gravity = new BABYLON.Vector3(0, -9.82, 0);
const cannonPlugin = new BABYLON.CannonJSPlugin(undefined, undefined, window.CANNON);
scene.enablePhysics(gravity, cannonPlugin);

// Ground
const ground = BABYLON.MeshBuilder.CreateGround('g', {width:300, height:300}, scene);
ground.position.y = 0;
ground.receiveShadows = true;

// Simple green material
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.1); // dark green
ground.material = groundMat;

// Create physics impostor **after physics is enabled**
ground.physicsImpostor = new BABYLON.PhysicsImpostor(
    ground,
    BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, restitution: 0.2, friction: 0.6 },
    scene
);

    // Game state
    let score = 0;
    let damageMultiplier = 1.0;
    const objects = [];
    pointsEl.textContent = 'Points: 0';
    dmgEl.textContent = 'Damage: x' + damageMultiplier.toFixed(2);

    // Update these filenames to match your models in /models/
    const modelFiles = [
      'models/box.gltf',
      'models/tree.glb'
    ];

    async function loadAndSpawn(url, count = 5){
      for(let i=0;i<count;i++){
        try {
          const res = await BABYLON.SceneLoader.ImportMeshAsync(null, '', url, scene);
          const root = res.meshes[0];
          const mesh = root.clone(root.name + '_' + Math.random().toString(36).slice(2));
          mesh.rotationQuaternion = null;
          mesh.position = new BABYLON.Vector3((Math.random()-0.5)*40, 1 + Math.random()*6, (Math.random()-0.5)*40);
          const s = 0.5 + Math.random()*1.8;
          mesh.scaling = new BABYLON.Vector3(s,s,s);

          const bbox = mesh.getBoundingInfo().boundingBox.extendSize;
          const approxVol = (bbox.x*2) * (bbox.y*2) * (bbox.z*2);
          const mass = Math.max(0.1, approxVol * 5);

          mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, {mass: mass, restitution:0.2, friction:0.6}, scene);
          const fragility = 0.6 + Math.random()*1.6;
          const health = Math.max(5, mass * (2.0 / fragility));
          objects.push({mesh, health, fragility, baseMass:mass, picked:false});
        } catch(e){
          console.warn('Failed to load', url, e);
        }
      }
    }

    for(const m of modelFiles) await loadAndSpawn(m, 6);

    function addPoints(n){ score += Math.max(0, Math.round(n)); pointsEl.textContent = 'Points: ' + score; }

    function pickFirstMesh(max = 8){
      const origin = camera.position;
      const forward = camera.getFrontPosition(max).subtract(camera.position);
      const ray = new BABYLON.Ray(origin, forward.normalize(), max);
      const pick = scene.pickWithRay(ray, (m)=> objects.some(o=>o.mesh === m || (m.parent && o.mesh === m.parent)));
      return pick && pick.pickedMesh ? pick : null;
    }

    let carried = null;
    canvas.addEventListener('pointerdown', (evt) => {
      if(evt.button === 0){
        if(carried){
          const forward = camera.getForwardRay(1).direction.normalize();
          const force = forward.scale(25 * damageMultiplier * (carried.physicsImpostor.getParam ? carried.physicsImpostor.getParam('mass') : (carried.physicsImpostor.mass || 1)));
          carried.physicsImpostor.applyImpulse(force, carried.getAbsolutePosition());
          const s = objects.find(o=>o.mesh===carried);
          if(s) s.picked = false;
          carried = null;
        } else {
          const p = pickFirstMesh(6);
          if(p){
            const mesh = p.pickedMesh;
            const obj = objects.find(o=>o.mesh === mesh || (mesh.parent && o.mesh === mesh.parent));
            if(obj){
              const forward = camera.getForwardRay(1).direction.normalize();
              const impulse = forward.scale(10 * obj.baseMass * damageMultiplier);
              mesh.physicsImpostor.applyImpulse(impulse, mesh.getAbsolutePosition());
              const impactMag = impulse.length();
              const dmg = impactMag * damageMultiplier * obj.fragility * (0.15 + Math.random()*0.6);
              obj.health -= dmg;
              addPoints(dmg * Math.max(0.5, obj.baseMass*0.02));
              flash(mesh);
              if(obj.health <= 0){
                addPoints(50);
                mesh.physicsImpostor.setMass(Math.max(0.01, obj.baseMass * 0.15));
                if(mesh.material) mesh.material.alpha = 0.9;
              }
            }
          }
        }
      } else if(evt.button === 2){
        evt.preventDefault();
        if(!carried){
          const p = pickFirstMesh(4);
          if(p){
            const mesh = p.pickedMesh;
            const obj = objects.find(o=>o.mesh === mesh || (mesh.parent && o.mesh === mesh.parent));
            if(obj){
              carried = obj.mesh;
              obj.picked = true;
              obj.mesh.physicsImpostor.setMass(0.001);
            }
          }
        } else {
          const obj = objects.find(o=>o.mesh === carried);
          if(obj){ obj.picked = false; carried.physicsImpostor.setMass(obj.baseMass); }
          carried = null;
        }
      }
    });

    function flash(mesh){
      const orig = mesh.scaling.clone();
      const t0 = performance.now();
      const dur = 220;
      (function tick(){
        const p = Math.min(1, (performance.now()-t0)/dur);
        const factor = 1 + Math.sin(p*Math.PI)*0.18;
        mesh.scaling = orig.multiplyByFloats(factor, factor, factor);
        if(p < 1) requestAnimationFrame(tick);
        else mesh.scaling = orig;
      })();
    }

    scene.onBeforeRenderObservable.add(()=>{
      if(carried){
        const target = camera.position.add(camera.getForwardRay(1).direction.scale(2));
        carried.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0,0,0));
        carried.position = target;
        carried.physicsImpostor.syncPhysicsBodyWithTransform();
      }
    });

    upgradeBtn.addEventListener('click', ()=>{
      const cost = Math.round(100 * Math.pow(1.6, Math.max(0, Math.round((damageMultiplier-1)/0.1))));
      if(score >= cost){
        score -= cost;
        damageMultiplier *= 1.10;
        pointsEl.textContent = 'Points: ' + score;
        dmgEl.textContent = 'Damage: x' + damageMultiplier.toFixed(2);
      } else alert('Not enough points: need ' + cost);
    });

    engine.runRenderLoop(()=> scene.render());
    window.addEventListener('resize', ()=> engine.resize());
  } // end startGame

})(); // end IIFE
