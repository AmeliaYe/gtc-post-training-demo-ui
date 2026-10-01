import * as THREE from '../coffee-lab-r01/vendor/three.module.js';
import {exerciseClips,REP_SECONDS} from './motion.js';

export function createGymScene(host) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.domElement.className='go-canvas';renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','An animated robot practices lifting two dumbbells, moving from swinging the weights to controlled repetitions');host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,60);
  scene.add(new THREE.HemisphereLight(0xf1faff,0x768277,2.0));
  const key=new THREE.DirectionalLight(0xffffff,3.6);key.position.set(-4,7,5);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-5,near:.1,far:25});key.shadow.normalBias=.025;scene.add(key);
  const fill=new THREE.DirectionalLight(0xd3ece8,1.7);fill.position.set(5,3,-2);scene.add(fill);
  const m={
    shell:new THREE.MeshPhysicalMaterial({color:0xf5faf5,roughness:.34,metalness:.06,clearcoat:.5}),
    seam:new THREE.MeshStandardMaterial({color:0x5e746c,roughness:.52,metalness:.25}),
    face:new THREE.MeshPhysicalMaterial({color:0x08251f,roughness:.19,metalness:.12,clearcoat:.9}),
    green:new THREE.MeshStandardMaterial({color:0xa6e65d,emissive:0x54831c,emissiveIntensity:.5,roughness:.5}),
    rubber:new THREE.MeshStandardMaterial({color:0x162521,roughness:.84,metalness:.08}),
    steel:new THREE.MeshStandardMaterial({color:0xb2c3bf,roughness:.26,metalness:.85}),
    trim:new THREE.MeshStandardMaterial({color:0x93c854,roughness:.5,metalness:.2})
  };
  const mesh=(g,material,parent,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  const sphere=(parent,mat,x,y,z,sx,sy,sz)=>{const o=mesh(new THREE.SphereGeometry(1,40,28),mat,parent,x,y,z);o.scale.set(sx,sy,sz);return o;};
  const group=(name,parent,x=0,y=0,z=0)=>{const o=new THREE.Group();o.name=name;o.position.set(x,y,z);parent.add(o);return o;};
  const robot=group('robot',scene);robot.rotation.y=-.18;
  const torso=group('torso',robot,0,.82,0);
  sphere(torso,m.shell,0,.53,0,.45,.58,.31);sphere(torso,m.seam,0,.1,0,.30,.17,.24);
  mesh(new THREE.TorusGeometry(.12,.023,12,40),m.green,torso,0,.61,.305);
  mesh(new THREE.BoxGeometry(.04,.12,.014),m.green,torso,0,.61,.324);
  const head=group('head',torso,0,1.23,0);
  sphere(head,m.seam,0,-.19,0,.15,.19,.15);sphere(head,m.shell,0,.19,0,.53,.49,.43);
  sphere(head,m.face,0,.16,.32,.405,.325,.158);
  const eyes=[-.14,.14].map(x=>sphere(head,m.green,x,.22,.466,.047,.084,.024));
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.10,.03,.473),new THREE.Vector3(0,.002,.489),new THREE.Vector3(.1,.03,.473)]);
  mesh(new THREE.TubeGeometry(smile,20,.011,8,false),m.green,head);
  [-1,1].forEach(s=>sphere(head,m.steel,s*.50,.17,0,.047,.11,.1));
  const arms=[];
  for(const [side,sign] of [['left',-1],['right',1]]) {
    const shoulder=group(`${side}Shoulder`,torso,sign*.445,.86,0);
    sphere(shoulder,m.seam,0,0,0,.145,.145,.145);
    mesh(new THREE.CapsuleGeometry(.133,.27,10,20),m.shell,shoulder,0,-.20,0);
    const elbow=group(`${side}Elbow`,shoulder,0,-.43,0);
    sphere(elbow,m.seam,0,0,0,.105,.105,.105);
    mesh(new THREE.CapsuleGeometry(.112,.23,10,20),m.shell,elbow,0,-.18,0);
    const wrist=group(`${side}Wrist`,elbow,0,-.40,0);
    sphere(wrist,m.shell,0,0,0,.127,.13,.105);
    const dumbbell=group(`${side}Dumbbell`,wrist,0,-.015,.03);
    const bar=mesh(new THREE.CylinderGeometry(.040,.040,.65,24),m.steel,dumbbell);bar.rotation.z=Math.PI/2;
    for(const plate of [-1,1]) {
      const disc=mesh(new THREE.CylinderGeometry(.205,.205,.135,6),m.rubber,dumbbell,plate*.245,0,0);disc.rotation.z=Math.PI/2;
      const ring=mesh(new THREE.CylinderGeometry(.175,.175,.015,6),m.trim,dumbbell,plate*.32,0,0);ring.rotation.z=Math.PI/2;
      const cap=mesh(new THREE.CylinderGeometry(.048,.048,.018,24),m.steel,dumbbell,plate*.333,0,0);cap.rotation.z=Math.PI/2;
    }
    arms.push({shoulder,elbow,wrist,dumbbell});
  }
  for(const sign of [-1,1]) {
    const leg=group(`leg${sign}`,robot,sign*.23,.91,0);
    mesh(new THREE.CapsuleGeometry(.145,.21,10,20),m.shell,leg,0,-.19,0);
    sphere(leg,m.seam,0,-.41,0,.11,.11,.11);
    mesh(new THREE.CapsuleGeometry(.14,.17,10,20),m.shell,leg,0,-.59,0);
    sphere(leg,m.shell,0,-.78,.08,.18,.12,.27);
  }
  const shadow=mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.26}),scene,0,.008,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  const clips=exerciseClips(),mixer=new THREE.AnimationMixer(robot);
  const actions=[mixer.clipAction(clips.momentum).play(),mixer.clipAction(clips.technique).play()];
  actions.forEach(a=>{a.zeroSlopeAtStart=true;a.zeroSlopeAtEnd=true;});
  let currentTime=0,currentSkill=0,frames=0,ready=false;
  function render(time,skill) {
    currentTime=time;currentSkill=Math.min(1,Math.max(0,skill));if(!ready)return;
    actions[0].setEffectiveWeight(1-currentSkill);actions[1].setEffectiveWeight(currentSkill);
    mixer.setTime(time);
    const breath=Math.sin(time*Math.PI/2)*.004;
    torso.scale.set(1+breath,.999+breath*.5,1+breath);
    const blink=1-.88*Math.exp(-Math.pow(((time%4)-3.4)/.085,2));eyes.forEach(e=>e.scale.y=.084*blink);
    renderer.render(scene,camera);frames++;
  }
  function resize() {
    const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    camera.position.set(0,3.2,width<651?8.5:8.05);
    camera.lookAt(0,width<651?1.15:1.3,0);camera.updateProjectionMatrix();ready=true;render(currentTime,currentSkill);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  function state() {
    const point=head.getWorldPosition(new THREE.Vector3());point.y+=.19;point.project(camera);
    const r=host.getBoundingClientRect();
    return{time:currentTime,skill:currentSkill,frames,repPhase:(currentTime%REP_SECONDS)/REP_SECONDS,torsoLean:torso.rotation.x,elbowAngle:arms[0].elbow.rotation.x,shoulderAngle:arms[0].shoulder.rotation.x,head:{x:(point.x+1)*r.width/2+r.x,y:(1-point.y)*r.height/2+r.y},weights:arms.map(a=>a.dumbbell.getWorldPosition(new THREE.Vector3()).toArray()),pose:[torso.rotation.x,torso.rotation.z,torso.position.y,head.rotation.x,head.rotation.z,...arms.flatMap(a=>[a.shoulder.rotation.x,a.shoulder.rotation.z,a.elbow.rotation.x,a.wrist.rotation.x])],canvasWidth:renderer.domElement.width,canvasHeight:renderer.domElement.height};
  }
  return{render,state,dispose(){observer.disconnect();mixer.stopAllAction();mixer.uncacheRoot(robot);scene.traverse(o=>o.geometry?.dispose());Object.values(m).forEach(mat=>mat.dispose());renderer.dispose();}};
}
