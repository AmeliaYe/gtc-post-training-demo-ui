import * as THREE from '../coffee-lab-r01/vendor/three.module.js';
import {frameFor} from '../framing.js';
import {exerciseClips,REP_SECONDS} from '../gym-opening-r02/motion.js';
import {makeEquipment} from '../circuit-r06/equipment.js';
import {smooth} from '../circuit-r08/timeline.js';
import {strengthAt,growthPulseAt,coreAt,physique,chestExpansion} from '../circuit-r08/strength.js';
import {sculptAbdomen} from './abdomen.js';

export function createGymScene(host) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.domElement.className='go-canvas';renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','The robot completes two controlled reps before gaining muscle; green halos highlight stronger shoulders and arms, then developing abdominal definition after bench press and elliptical practice');host.append(renderer.domElement);
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
  const trainedShell=m.shell.clone();trainedShell.emissive.setHex(0x76b900);trainedShell.emissiveIntensity=0;
  const shoulderShell=trainedShell.clone();shoulderShell.transparent=true;shoulderShell.opacity=0;
  const haloMaterials=[
    new THREE.MeshBasicMaterial({color:0x9bff37,transparent:true,opacity:0,side:THREE.BackSide,depthWrite:false,toneMapped:false}),
    new THREE.MeshBasicMaterial({color:0x76b900,transparent:true,opacity:0,side:THREE.BackSide,depthWrite:false,toneMapped:false}),
  ];
  const halos=[];
  function addHalo(part,region){
    for(const [i,padding] of [1.10,1.22].entries()){
      const halo=new THREE.Mesh(part.geometry.clone(),haloMaterials[i]);
      halo.name=`${region} growth halo`;halo.visible=false;halo.scale.setScalar(padding);halo.renderOrder=2+i;
      part.add(halo);halos.push({halo,part,region});
    }
  }
  const mesh=(g,material,parent,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  const sphere=(parent,mat,x,y,z,sx,sy,sz)=>{const o=mesh(new THREE.SphereGeometry(1,40,28),mat,parent,x,y,z);o.scale.set(sx,sy,sz);return o;};
  const group=(name,parent,x=0,y=0,z=0)=>{const o=new THREE.Group();o.name=name;o.position.set(x,y,z);parent.add(o);return o;};
  const robot=group('robot',scene);robot.rotation.y=-.18;
  const torso=group('torso',robot,0,.82,0);
  const bodyShell=mesh(new THREE.SphereGeometry(1,96,80),trainedShell,torso,0,.53,0);bodyShell.scale.set(.45,.58,.31);
  const originalBody=new Float32Array(bodyShell.geometry.attributes.position.array);
  const originalNormals=new Float32Array(bodyShell.geometry.attributes.normal.array);
  sphere(torso,m.seam,0,.1,0,.30,.17,.24);
  const badgeGeometry=new THREE.PlaneGeometry(.68,.68,20,20),positions=badgeGeometry.attributes.position;
  // Wrap the unmodified icon texture over the shell instead of floating a flat label in front.
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i)+.58;
    positions.setXYZ(i,x,y,.31*Math.sqrt(Math.max(0,1-(x/.45)**2-((y-.53)/.58)**2))+.006);
  }
  badgeGeometry.computeVertexNormals();
  const badgeMaterial=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,alphaTest:.02,toneMapped:false});
  const badge=mesh(badgeGeometry,badgeMaterial,torso);badge.name='NVIDIA NIM';badge.castShadow=false;badge.visible=false;
  // The abdomen is part of bodyShell; the single area halo stays temporary.
  const coreHaloMaterial=new THREE.MeshBasicMaterial({color:0x9bff37,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const coreHalo=mesh(new THREE.TorusGeometry(1,.028,8,64),coreHaloMaterial,torso,0,.13,.32);
  coreHalo.name='abdominal development halo';coreHalo.scale.set(.255,.19,.09);coreHalo.castShadow=false;coreHalo.visible=false;
  let nimLoaded=false;
  const badgeReady=new THREE.TextureLoader().loadAsync(new URL('../nim.png',import.meta.url).href).then(texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());badgeMaterial.map=texture;badgeMaterial.needsUpdate=true;badge.visible=true;nimLoaded=true;
  });
  const head=group('head',torso,0,1.23,0);
  sphere(head,m.seam,0,-.19,0,.15,.19,.15);sphere(head,m.shell,0,.19,0,.53,.49,.43);
  sphere(head,m.face,0,.16,.32,.405,.325,.158);
  const eyes=[-.14,.14].map(x=>sphere(head,m.green,x,.22,.466,.047,.084,.024));
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.10,.03,.473),new THREE.Vector3(0,.002,.489),new THREE.Vector3(.1,.03,.473)]);
  mesh(new THREE.TubeGeometry(smile,20,.011,8,false),m.green,head);
  [-1,1].forEach(s=>sphere(head,m.steel,s*.50,.17,0,.047,.11,.1));
  const arms=[],legs=[];
  for(const [side,sign] of [['left',-1],['right',1]]) {
    const shoulder=group(`${side}Shoulder`,torso,sign*.445,.86,0);
    sphere(shoulder,m.seam,0,0,0,.145,.145,.145);
    const deltoid=sphere(shoulder,shoulderShell,0,0,0,.145,.145,.145);deltoid.visible=false;
    const upperArm=mesh(new THREE.CapsuleGeometry(.133,.27,10,20),trainedShell,shoulder,0,-.20,0);
    const elbow=group(`${side}Elbow`,shoulder,0,-.43,0);
    sphere(elbow,m.seam,0,0,0,.105,.105,.105);
    const forearm=mesh(new THREE.CapsuleGeometry(.112,.23,10,20),trainedShell,elbow,0,-.18,0);
    addHalo(deltoid,'shoulder');addHalo(upperArm,'upper arm');addHalo(forearm,'forearm');
    const wrist=group(`${side}Wrist`,elbow,0,-.40,0);
    sphere(wrist,m.shell,0,0,0,.127,.13,.105);
    const dumbbell=group(`${side}Dumbbell`,wrist,0,-.015,.03);
    const bar=mesh(new THREE.CylinderGeometry(.040,.040,.65,24),m.steel,dumbbell);bar.rotation.z=Math.PI/2;
    for(const plate of [-1,1]) {
      const disc=mesh(new THREE.CylinderGeometry(.205,.205,.135,6),m.rubber,dumbbell,plate*.245,0,0);disc.rotation.z=Math.PI/2;
      const ring=mesh(new THREE.CylinderGeometry(.175,.175,.015,6),m.trim,dumbbell,plate*.32,0,0);ring.rotation.z=Math.PI/2;
      const cap=mesh(new THREE.CylinderGeometry(.048,.048,.018,24),m.steel,dumbbell,plate*.333,0,0);cap.rotation.z=Math.PI/2;
    }
    arms.push({shoulder,elbow,wrist,dumbbell,deltoid,upperArm,forearm});
  }
  for(const sign of [-1,1]) {
    const leg=group(`leg${sign}`,robot,sign*.23,.91,0);
    const thigh=mesh(new THREE.CapsuleGeometry(.145,.21,10,20),m.shell,leg,0,-.19,0);
    const knee=group(`knee${sign}`,leg,0,-.41,0);
    sphere(knee,m.seam,0,0,0,.11,.11,.11);
    mesh(new THREE.CapsuleGeometry(.14,.17,10,20),m.shell,knee,0,-.18,0);
    const ankle=group(`ankle${sign}`,knee,0,-.37,0);
    sphere(ankle,m.shell,0,0,.08,.18,.12,.27);
    legs.push({hip:leg,knee,ankle,thigh});
  }
  const shadow=mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.26}),scene,0,.008,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  const clips=exerciseClips();
  // Apply the original cubic tracks explicitly: IK also writes these joints,
  // so an AnimationMixer's unchanged-value cache cannot safely own them here.
  const channels=clips.momentum.tracks.map((track,i)=>({bad:track.createInterpolant(),good:clips.technique.tracks[i].createInterpolant(),binding:THREE.PropertyBinding.create(robot,track.name),value:new Float64Array(1)}));
  function sample(t,skill){for(const channel of channels){channel.value[0]=channel.bad.evaluate(t%REP_SECONDS)[0]*(1-skill)+channel.good.evaluate(t%REP_SECONDS)[0]*skill;channel.binding.setValue(channel.value,0);}}
  const equipment=makeEquipment(scene),down=new THREE.Vector3(0,-1,0);
  const floorWeights=arms.map((a,i)=>{const o=a.dumbbell.clone(true);o.position.set((i?1:-1)*.59,.23,.28);scene.add(o);return o;});
  let currentTime=0,currentSkill=0,frames=0,ready=false,currentSpec={time:0,progress:0,station:'dumbbells',action:'try',phase:0},contacts=[];
  const v=a=>new THREE.Vector3(...a),mix=(a,b,p)=>a.clone().lerp(b,p);
  function worldPoint(o,p=[0,0,0]){o.updateWorldMatrix(true,false);return o.localToWorld(v(p));}
  // Solve each two-link limb toward the actual equipment contact, in its parent's frame.
  function ik(joint,hinge,end,target,l1,l2,pole){
    joint.quaternion.identity();hinge.quaternion.identity();joint.parent.updateWorldMatrix(true,false);
    const goal=joint.parent.worldToLocal(target.clone()),delta=goal.clone().sub(joint.position),distance=delta.length(),d=Math.min(l1+l2-.001,Math.max(.025,distance)),axis=delta.normalize();
    const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const bend=v(pole).addScaledVector(axis,-v(pole).dot(axis)).normalize();
    const direction=axis.clone().multiplyScalar(along).addScaledVector(bend,height).normalize();
    joint.quaternion.setFromUnitVectors(down,direction);joint.updateWorldMatrix(true,true);
    const local=joint.worldToLocal(target.clone()).sub(hinge.position).normalize();hinge.quaternion.setFromUnitVectors(down,local);hinge.updateWorldMatrix(true,true);
    end.updateWorldMatrix(true,false);contacts.push({name:end.name,error:end.getWorldPosition(new THREE.Vector3()).distanceTo(target)});
  }
  function armsTo(targets,amount=1){arms.forEach((a,i)=>{const start=worldPoint(a.wrist);ik(a.shoulder,a.elbow,a.wrist,mix(start,targets[i],amount),.43,.40,[(i?1:-1),-.3,.1]);});}
  function feetTo(targets){legs.forEach((l,i)=>{ik(l.hip,l.knee,l.ankle,targets[i],.41,.37,[0,0,1]);const q=l.knee.getWorldQuaternion(new THREE.Quaternion());l.ankle.quaternion.copy(q.invert());});}
  let strength=-1,build=physique(0),growthPulse=0,core=0;
  function updatePhysique(spec){
    const gain=strengthAt(spec.time);
    growthPulse=growthPulseAt(spec.time);
    core=coreAt(spec.time);
    coreHalo.visible=core>0&&growthPulse>.001;coreHaloMaterial.opacity=.9*growthPulse;
    haloMaterials[0].opacity=.85*growthPulse;haloMaterials[1].opacity=.22*growthPulse;
    halos.forEach(({halo,part})=>halo.visible=growthPulse>.001&&part.visible);
    trainedShell.emissiveIntensity=.26*growthPulse;
    shoulderShell.emissiveIntensity=.38*growthPulse;
    if(gain===strength)return;
    strength=gain;build=physique(gain);
    // Change shell thickness only: every joint anchor, limb length, and contact
    // target stays in its original position. The head and hand geometry stay fixed.
    arms.forEach(a=>{
      a.upperArm.scale.set(build.upperArm,1,build.upperArm);
      a.forearm.scale.set(build.forearm,1,build.forearm);
      a.deltoid.visible=gain>0;
      a.deltoid.scale.set(build.shoulder,.145+.045*gain,build.shoulder);
    });
    shoulderShell.opacity=smooth(gain/.28);
    legs.forEach(l=>l.thigh.scale.set(build.thigh,1,build.thigh));
    const points=bodyShell.geometry.attributes.position;
    for(let i=0;i<points.count;i++){
      const x=originalBody[i*3],y=originalBody[i*3+1],z=originalBody[i*3+2];
      const expansion=chestExpansion(y,gain);
      const sx=x*expansion.width,sz=z*expansion.depth;
      points.setXYZ(i,sx,y,sculptAbdomen(sx*.45,.53+y*.58,sz*.31,core)/.31);
    }
    points.needsUpdate=true;
    if(gain===0){bodyShell.geometry.attributes.normal.array.set(originalNormals);bodyShell.geometry.attributes.normal.needsUpdate=true;}
    else bodyShell.geometry.computeVertexNormals();
    bodyShell.geometry.computeBoundingSphere();
    // Re-wrap the unchanged NIM artwork onto the fuller chest; retain icon size.
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),unitY=(y-.53)/.58;
      const expansion=chestExpansion(unitY,gain);
      positions.setZ(i,.31*expansion.depth*Math.sqrt(Math.max(0,1-(x/(.45*expansion.width))**2-unitY**2))+.006);
    }
    positions.needsUpdate=true;badgeGeometry.computeVertexNormals();badgeGeometry.computeBoundingSphere();
    halos.forEach(({halo,part})=>halo.visible=growthPulse>.001&&part.visible);
  }
  function reset(){
    torso.rotation.set(0,0,0);head.rotation.set(0,0,0);
    arms.forEach(a=>{a.shoulder.rotation.set(0,0,0);a.elbow.rotation.set(0,0,0);a.wrist.rotation.set(0,0,0);});
    sample(0,currentSkill);
    robot.position.set(0,0,0);robot.rotation.set(0,-.18,0);torso.scale.set(1,1,1);
    legs.forEach(l=>{l.hip.quaternion.identity();l.knee.quaternion.identity();l.ankle.quaternion.identity();});
    arms.forEach(a=>a.dumbbell.visible=false);contacts=[];
  }
  function place(local,station,tilt=0){
    const ref=station==='bench'?equipment.bench:equipment.ellipse;
    robot.position.copy(worldPoint(ref,local));robot.quaternion.copy(ref.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt));
  }
  const benchEntry=()=>equipment.benchPoint([0,0,1.68]),ellipseEntry=()=>equipment.ellipsePoint([-.80,0,-.36]);
  function walk(a,b,c,d,p,initialYaw,finalYaw){
    const u=smooth(p),w=1-u;
    robot.position.copy(a.clone().multiplyScalar(w*w*w).addScaledVector(b,3*w*w*u).addScaledVector(c,3*w*u*u).addScaledVector(d,u*u*u));
    const derivative=b.clone().sub(a).multiplyScalar(3*w*w).addScaledVector(c.clone().sub(b),6*w*u).addScaledVector(d.clone().sub(c),3*u*u);
    const heading=Math.atan2(derivative.x,derivative.z),turn=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
    robot.rotation.set(0,turn(turn(initialYaw,heading,smooth(p/.2)),finalYaw,smooth((p-.80)/.2)),0);
    const strength=Math.sin(Math.PI*p),cycle=p*6*Math.PI;torso.position.y=.82+Math.abs(Math.sin(cycle))*.04*strength;
    legs.forEach((l,i)=>{const wave=Math.sin(cycle+i*Math.PI)*strength;l.hip.rotation.x=wave*.5;l.knee.rotation.x=Math.max(0,-wave)*.75;l.ankle.rotation.x=-l.hip.rotation.x-l.knee.rotation.x;});
    arms.forEach((a,i)=>a.shoulder.rotation.x=-Math.sin(cycle+i*Math.PI)*.28*strength);
  }
  function lowerWeights(p,carried){
    const q=smooth(p);robot.position.y=-.52*q;torso.rotation.x=.62*q;
    feetTo([-1,1].map(s=>v([s*.23,.13,.08])));
    armsTo(floorWeights.map(o=>o.position.clone()),q);
    arms.forEach(a=>a.dumbbell.visible=carried);floorWeights.forEach(o=>o.visible=!carried);
  }
  function benchPose(p=1){
    const q=smooth(p);place([0,.995*q,1.68-.50*q],'bench',-Math.PI/2*q);
    head.rotation.x=.35*q;
    const feet=[-1,1].map(s=>equipment.benchPoint([s*(.23+.07*q),.13+.67*smooth(p/.35),1.76-.88*smooth((p-.15)/.65)]));feetTo(feet);armsTo(equipment.barTargets(),q);
  }
  function ellipsePose(p=1,bad=0,phase=0){
    const q=smooth(p);place([-.80*(1-q),.15*q,-.36],'elliptical');
    torso.rotation.z=bad*.12*Math.sin(phase*Math.PI*2)*q;torso.rotation.x=bad*.12*Math.sin(phase*Math.PI*4)*q;
    const feet=equipment.pedalTargets().map((target,i)=>mix(equipment.ellipsePoint([-.80+(i?1:-1)*.23,.13,-.28]),target,q));
    feetTo(feet);armsTo(equipment.gripTargets(),q);
  }
  function render(spec,skill) {
    currentSpec=spec;currentTime=spec.time;currentSkill=Math.min(1,Math.max(0,skill));if(!ready)return;
    updatePhysique(spec);reset();const {action,station,progress:p}=spec,bad=1-currentSkill;
    const exercising=['try','retry','final'].includes(action),phase=exercising?p:0;
    const cadence=phase+bad*.12*Math.sin(phase*Math.PI*2);
    equipment.update(station==='elliptical'?cadence:0,bad,action==='prepare'?'all':station,action==='update'?Math.sin(p*Math.PI):0);
    equipment.press(station==='bench'?phase:0,station==='bench'?bad:0);
    floorWeights.forEach(o=>o.visible=spec.time>=19&&spec.time<58);
    if(station==='dumbbells'&&['try','retry','final','hold','recover','feedback','update','prepare','environment'].includes(action)){
      arms.forEach(a=>a.dumbbell.visible=true);sample(phase*REP_SECONDS,currentSkill);
    }else if(action==='putdown')lowerWeights(p<.5?p*2:(1-p)*2,p<.5);
    else if(action==='pickup')lowerWeights(p<.5?p*2:(1-p)*2,p>=.5);
    else if(action==='walk-bench'){const end=benchEntry();walk(v([0,0,0]),v([-1,0,.65]),end.clone().add(v([.7,0,.3])),end,p,-.18,.45);}
    else if(action==='walk-elliptical'){const start=benchEntry(),end=ellipseEntry();walk(start,start.clone().add(v([1.7,0,1])),end.clone().add(v([-1.3,0,1.4])),end,p,.45,-.6);}
    else if(action==='walk-home'){const start=ellipseEntry();walk(start,start.clone().add(v([-.7,0,.6])),v([.7,0,.9]),v([0,0,0]),p,-.6,-.18);}
    else if(action==='mount-bench')benchPose(p);
    else if(action==='unmount-bench')benchPose(1-p);
    else if(station==='bench'){benchPose();}
    else if(action==='mount-elliptical')ellipsePose(p);
    else if(action==='unmount-elliptical')ellipsePose(1-p);
    else if(station==='elliptical')ellipsePose(1,bad,cadence);
    const blink=1-.88*Math.exp(-Math.pow(((currentTime%4)-3.4)/.085,2));eyes.forEach(e=>e.scale.y=.084*blink);
    renderer.render(scene,camera);frames++;
  }
  function resize() {
    const {width,height,imageWidth,imageHeight,x,y}=frameFor(host);if(!width||!height)return;
    renderer.setSize(width,height,false);
    camera.aspect=1672/941;camera.setViewOffset(imageWidth,imageHeight,-x,-y,width,height);
    camera.position.set(0,4.4,12.5);camera.lookAt(0,1.2,0);camera.updateProjectionMatrix();ready=true;render(currentSpec,currentSkill);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  function state() {
    const point=head.getWorldPosition(new THREE.Vector3());point.y+=.19;point.project(camera);
    const r=host.getBoundingClientRect();
    const project=p=>{p=p.clone().project(camera);return{x:(p.x+1)*r.width/2+r.x,y:(1-p.y)*r.height/2+r.y};};
    return{time:currentTime,skill:currentSkill,physique:{...build,growthPulse,core,coreHalo:coreHalo.visible,abdomenDefined:core>0,abdomenSurface:'continuous torso',haloRegions:[...new Set([...halos.filter(({halo})=>halo.visible).map(({region})=>region),...(coreHalo.visible?['abdomen']:[])])],headScale:head.scale.toArray(),jointAnchors:arms.map(a=>a.shoulder.position.toArray())},frames,station:currentSpec.station,action:currentSpec.action,repPhase:currentSpec.progress,torsoLean:torso.rotation.x,elbowAngle:arms[0].elbow.rotation.x,shoulderAngle:arms[0].shoulder.rotation.x,head:{x:(point.x+1)*r.width/2+r.x,y:(1-point.y)*r.height/2+r.y},chest:project(worldPoint(torso,[0,.53,.15])),badge:{name:badge.name,loaded:nimLoaded,center:project(worldPoint(torso,[0,.58,.32]))},position:robot.position.toArray(),contacts,stations:Object.fromEntries(Object.entries(equipment.stationPoints()).map(([k,p])=>[k,project(p)])),equipment:equipment.snapshot(),weights:arms.map(a=>a.dumbbell.getWorldPosition(new THREE.Vector3()).toArray()),pose:[...robot.position.toArray(),...robot.quaternion.toArray(),torso.rotation.x,torso.rotation.z,torso.position.y,...arms.flatMap(a=>[...a.shoulder.quaternion.toArray(),...a.elbow.quaternion.toArray()])],canvasWidth:renderer.domElement.width,canvasHeight:renderer.domElement.height};
  }
  return{render,state,ready:badgeReady,dispose(){observer.disconnect();channels.forEach(c=>c.binding.unbind());scene.traverse(o=>o.geometry?.dispose());Object.values(m).forEach(mat=>mat.dispose());trainedShell.dispose();shoulderShell.dispose();coreHaloMaterial.dispose();haloMaterials.forEach(material=>material.dispose());badgeMaterial.map?.dispose();badgeMaterial.dispose();equipment.dispose();renderer.dispose();}};
}
