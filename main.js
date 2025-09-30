(async function(){

  function loadScript(src){
    return new Promise((res,rej)=>{
      const s = document.createElement('script');
      s.src = src;
      s.onload = ()=>res();
      s.onerror = e=>rej(e);
      document.head.appendChild(s);
    });
  }

  await loadScript('./lib/babylon.js');
  await loadScript('./lib/babylonjs.loaders.min.js');
  await loadScript('./lib/cannon.min.js');

  if(document.readyState === 'loading') await new Promise(r=>document.addEventListener('DOMContentLoaded',r));

  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', startGame);

  async function startGame(){
    // Hide menu
    document.querySelectorAll('.card, .nav, .intro-card, .button').forEach(el=>el.style.display='none');

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.id='renderCanvas';
    Object.assign(canvas.style,{position:'fixed',top:'0',left:'0',width:'100%',height:'100%'});
    document.body.appendChild(canvas);

    const engine = new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.52,0.8,0.96);

   // Camera
const camera = new BABYLON.FreeCamera("cam", new BABYLON.Vector3(0,1.8,6), scene);
camera.speed = 0.8;
camera.angularSensibility = 400;

// Delay attachControl until next frame to ensure canvas is in DOM
requestAnimationFrame(() => {
    camera.attachControl(canvas, true);

    // Clear default inputs and add keyboard + mouse
    camera.inputs.clear();
    camera.inputs.add(new BABYLON.FreeCameraKeyboardMoveInput());
    camera.inputs.add(new BABYLON.FreeCameraMouseInput());
});

// Pointer lock on click (required)
canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
    }
});

    // Light
    new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0,1,0), scene);

    // Physics
    const cannonPlugin = new BABYLON.CannonJSPlugin(undefined,undefined,window.CANNON);
    scene.enablePhysics(new BABYLON.Vector3(0,-9.82,0),cannonPlugin);

    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround('g',{width:300,height:300},scene);
    ground.position.y = 0;
    ground.receiveShadows = true;
    const groundMat = new BABYLON.StandardMaterial('groundMat',scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.1,0.6,0.1);
    ground.material = groundMat;
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
      ground,
      BABYLON.PhysicsImpostor.BoxImpostor,
      {mass:0,restitution:0.2,friction:0.6},
      scene
    );

    // Objects
    const objects = [];
    const modelFiles = [
      'models/box.gltf',
      'models/tree.glb',
    ];

    async function loadAndSpawn(url,count=3){
      for(let i=0;i<count;i++){
        try{
          const res = await BABYLON.SceneLoader.ImportMeshAsync(null,'',url,scene);
          res.meshes.forEach(mesh=>{
            if(!(mesh instanceof BABYLON.Mesh)) return;

            const clone = mesh.clone(mesh.name+'_'+Math.random().toString(36).slice(2));
            clone.rotationQuaternion = null;

            // Spawn above ground
            const bbox = clone.getBoundingInfo().boundingBox.extendSize;
            clone.position = new BABYLON.Vector3(
              (Math.random()-0.5)*40,
              3 + bbox.y + Math.random()*2,
              (Math.random()-0.5)*40
            );

            const s = 0.5 + Math.random()*1.5;
            clone.scaling = new BABYLON.Vector3(s,s,s);

            const approxVol = (bbox.x*2)*(bbox.y*2)*(bbox.z*2);
            const mass = Math.max(0.1, approxVol*5);

            // Use BoxImpostor for performance
            clone.physicsImpostor = new BABYLON.PhysicsImpostor(
              clone,
              BABYLON.PhysicsImpostor.BoxImpostor,
              {mass:mass,restitution:0.2,friction:0.6},
              scene
            );

            objects.push({mesh:clone,baseMass:mass});
          });
        }catch(e){console.warn('Failed to load',url,e);}
      }
    }

    for(const m of modelFiles) await loadAndSpawn(m,5);

    engine.runRenderLoop(()=>scene.render());
    window.addEventListener('resize',()=>engine.resize());
  }

})();
