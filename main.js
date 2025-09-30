(async function(){

  // Load local scripts
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

    // Engine & scene
    const engine = new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.52,0.8,0.96);

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

    // Light
    new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0,1,0), scene);

    // Player capsule
    const player = BABYLON.MeshBuilder.CreateCapsule("player",{height:1.8,radius:0.3},scene);
    player.position = new BABYLON.Vector3(0,1.8,6);
    player.isVisible = false; // hide capsule mesh
    player.physicsImpostor = new BABYLON.PhysicsImpostor(
      player,
      BABYLON.PhysicsImpostor.CapsuleImpostor,
      {mass:1, friction:0.6, restitution:0},
      scene
    );

    // Camera attached to player
    const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0,0,0), scene);
    camera.parent = player;

    // Pointer lock
    canvas.addEventListener("click", () => { if(document.pointerLockElement !== canvas) canvas.requestPointerLock(); });

    // Keyboard input
    const inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, evt => inputMap[evt.sourceEvent.key.toLowerCase()] = true)
    );
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => inputMap[evt.sourceEvent.key.toLowerCase()] = false)
    );

    // Mouse look
    let yaw = 0, pitch = 0;
    scene.onPointerObservable.add(evt => {
      if(evt.type === BABYLON.PointerEventTypes.POINTERMOVE && document.pointerLockElement === canvas){
        yaw -= evt.event.movementX * 0.002;
        pitch -= evt.event.movementY * 0.002;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
        player.rotation.y = yaw;
        camera.rotation.x = pitch;
      }
    });

    // Objects
    const objects = [];
    const modelFiles = ['models/box.gltf','models/tree.glb'];
    async function loadAndSpawn(url,count=3){
      for(let i=0;i<count;i++){
        try{
          const res = await BABYLON.SceneLoader.ImportMeshAsync(null,'',url,scene);
          res.meshes.forEach(mesh=>{
            if(!(mesh instanceof BABYLON.Mesh)) return;
            const clone = mesh.clone(mesh.name+'_'+Math.random().toString(36).slice(2));
            clone.rotationQuaternion = null;
            const bbox = clone.getBoundingInfo().boundingBox.extendSize;
            clone.position = new BABYLON.Vector3(
              (Math.random()-0.5)*40,
              3 + bbox.y + Math.random()*2,
              (Math.random()-0.5)*40
            );
            const s = 0.5+Math.random()*1.5;
            clone.scaling = new BABYLON.Vector3(s,s,s);
            const vol = (bbox.x*2)*(bbox.y*2)*(bbox.z*2);
            const mass = Math.max(0.1,vol*5);
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

    // Update player movement
    scene.onBeforeRenderObservable.add(()=>{
      const forward = new BABYLON.Vector3(Math.sin(yaw),0,Math.cos(yaw));
      const right = new BABYLON.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
      let dir = BABYLON.Vector3.Zero();
      if(inputMap['w']) dir.addInPlace(forward);
      if(inputMap['s']) dir.subtractInPlace(forward);
      if(inputMap['a']) dir.subtractInPlace(right);
      if(inputMap['d']) dir.addInPlace(right);
      if(dir.length() > 0){
        dir.normalize();
        const vel = dir.scale(0.1);
        const currentVel = player.physicsImpostor.getLinearVelocity();
        player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(vel.x,currentVel.y,vel.z));
      }
    });

    engine.runRenderLoop(()=>scene.render());
    window.addEventListener('resize',()=>engine.resize());
  }

})();
