import * as T from '../coffee-lab-r01/vendor/three.module.js';
export const locations={dumbbells:[0,0,0],bench:[-2.8,0,.25],elliptical:[2.9,0,-.2]};
export function makeEquipment(scene) {
 const mats={metal:new T.MeshStandardMaterial({color:0x46514d,metalness:.65,roughness:.4}),steel:new T.MeshStandardMaterial({color:0xbdc8c4,metalness:.85,roughness:.22}),rubber:new T.MeshStandardMaterial({color:0x17221d,roughness:.86}),pad:new T.MeshPhysicalMaterial({color:0x29332d,roughness:.62,clearcoat:.2}),trim:new T.MeshStandardMaterial({color:0x8fc644,roughness:.5}),screen:new T.MeshStandardMaterial({color:0x081a17,roughness:.2,metalness:.1})};
 const mesh=(p,g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
 const box=(p,m,x,y,z,w,h,d)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
 const group=p=>{const g=new T.Group();p.add(g);return g;};
 function rod(p,m,a,b,r=.045){const o=mesh(p,new T.CylinderGeometry(r,r,1,16),m);setRod(o,a,b);return o;}
 function setRod(o,a,b){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());o.scale.y=delta.length();}
 const bench=group(scene);bench.position.set(...locations.bench);bench.rotation.y=.45;
 for(const z of [-.85,1.0]){box(bench,mats.metal,0,.3,z,.11,.5,.13);box(bench,mats.metal,0,.08,z,1.12,.12,.31);for(const x of [-.49,.49])box(bench,mats.rubber,x,.055,z,.2,.12,.36);}
 rod(bench,mats.metal,[0,.28,-.95],[0,.28,1.15],.065);
 const shape=new T.Shape(),w=.75,d=2.8,r=.08;
 shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
 const padGeometry=new T.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelThickness:.016,bevelSize:.018,bevelSegments:3,steps:1});padGeometry.translate(0,0,-.065);
 const pad=mesh(bench,padGeometry,mats.pad,0,.59,.15);pad.rotation.x=Math.PI/2;
 box(bench,mats.trim,0,.505,.15,.77,.022,2.82);
 for(const s of [-1,1]){
  box(bench,mats.metal,s*.92,.86,-.62,.10,1.68,.10);box(bench,mats.metal,s*.92,.075,-.45,.28,.13,1.08);
  box(bench,mats.steel,s*.92,1.58,-.52,.13,.075,.30);box(bench,mats.metal,s*.92,1.69,-.39,.12,.19,.07);
  for(let y=.7;y<1.5;y+=.14)mesh(bench,new T.SphereGeometry(.018,8,8),mats.screen,s*.92,y,-.56);
 }
 const bar=group(bench);rod(bar,mats.steel,[-1.25,0,0],[1.25,0,0],.035);
 for(const s of [-1,1])for(let i=0;i<3;i++){
  const p=mesh(bar,new T.CylinderGeometry(.285-i*.025,.285-i*.025,.06,36),i===2?mats.trim:mats.rubber,s*(1.01+i*.068),0,0);p.rotation.z=Math.PI/2;
 }
 const ellipse=group(scene);ellipse.position.set(...locations.elliptical);ellipse.rotation.y=-.6;
 for(const z of [-1.0,1.0]){box(ellipse,mats.metal,0,.11,z,1.2,.16,.19);for(const s of [-1,1])box(ellipse,mats.rubber,s*.52,.075,z,.23,.12,.25);}
 rod(ellipse,mats.metal,[0,.17,-1.0],[0,.17,1.03],.07);
 const housing=mesh(ellipse,new T.CylinderGeometry(.54,.54,.4,48),mats.rubber,0,.68,.73);housing.rotation.z=Math.PI/2;
 for(const s of [-1,1]){const rim=mesh(ellipse,new T.TorusGeometry(.45,.018,10,64),mats.trim,s*.21,.68,.73);rim.rotation.y=Math.PI/2;}
 rod(ellipse,mats.metal,[0,.32,.9],[0,1.96,.51],.09);
 const display=group(ellipse);display.position.set(0,2.02,.49);display.rotation.x=-.35;
 box(display,mats.rubber,0,0,0,.52,.30,.09);box(display,mats.screen,0,0,.048,.42,.22,.012);
 for(let i=0;i<4;i++)box(display,mats.trim,-.14+i*.09,-.055+i*.026,.058,.045,.035+i*.02,.006);
 const handles=[],pedals=[],links=[],grips=[];
 for(const s of [-1,1]){
  const handle=group(ellipse);handle.position.set(s*.48,1.25,.16);
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,-.99,-.35),new T.Vector3(0,0,0),new T.Vector3(0,.57,.07),new T.Vector3(0,1.14,.14)]);
  mesh(handle,new T.TubeGeometry(curve,24,.042,10,false),mats.metal);
  rod(handle,mats.rubber,[0,.62,.085],[0,1.13,.14],.055);
  const grip=new T.Object3D();grip.position.set(0,.65,.09);handle.add(grip);grips.push(grip);handles.push(handle);
  const pedal=group(ellipse);box(pedal,mats.rubber,0,0,0,.30,.085,.67);box(pedal,mats.trim,0,.047,.28,.29,.012,.025);pedals.push(pedal);
  const crank=rod(ellipse,mats.metal,[s*.24,.68,.73],[s*.27,.23,-.5],.037),link=rod(ellipse,mats.metal,[s*.48,.25,-.4],[s*.27,.23,-.5],.035);links.push({crank,link});
 }
 const wheel=mesh(ellipse,new T.CylinderGeometry(.31,.31,.014,32),mats.metal,.223,.68,.73);wheel.rotation.z=Math.PI/2;
 const spoke=box(wheel,mats.trim,0,.01,0,.045,.02,.53);
 const curl=new T.Group();scene.add(curl);
 const matsByStation=[bench,ellipse,curl].map(p=>{const material=new T.MeshBasicMaterial({color:0x8dc944,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});const o=mesh(p,new T.RingGeometry(.93,1.0,64),material,0,.022,0);o.rotation.x=-Math.PI/2;o.scale.set(1.4,1.8,1);o.castShadow=false;return o;});
 function update(phase=0,bad=0,active='dumbbells',pulse=0){
  const angle=phase*2*Math.PI;
  handles.forEach((h,i)=>{const s=i?1:-1,q=angle+i*Math.PI;h.rotation.x=.24*Math.cos(q);const pedal=pedals[i];pedal.position.set(s*.27,.23+.065*Math.sin(q),-.43+.30*Math.cos(q));
   setRod(links[i].crank,[s*.24,.68,.73],pedal.position.toArray());
   const bottom=h.localToWorld(new T.Vector3(0,-.99,-.35));ellipse.worldToLocal(bottom);setRod(links[i].link,bottom.toArray(),pedal.position.toArray());
  });
  wheel.rotation.y=angle;spoke.rotation.y=angle;
  matsByStation.forEach((o,i)=>o.material.opacity=(active===['bench','elliptical','dumbbells'][i]||active==='all')? .25+pulse*.25:0);
 }
 function press(phase=0,bad=0){const wave=.5-.5*Math.cos(phase*Math.PI*2);bar.position.set(bad*.065*Math.sin(phase*4*Math.PI),1.7-(.42-.15*bad)*wave+bad*.035*Math.sin(phase*10*Math.PI)*wave,-.52+bad*.10*Math.sin(phase*Math.PI*2));bar.rotation.z=bad*.15*Math.sin(phase*4*Math.PI);}
 update();press();
 const world=(o,v)=>o.localToWorld(new T.Vector3(...v));
 return{bench,bar,ellipse,curl,update,press,
  barTargets:()=>[-1,1].map(s=>world(bar,[s*.59,0,0])),
  pedalTargets:()=>pedals.map(p=>world(p,[0,.165,0])),
  gripTargets:()=>grips.map(g=>g.getWorldPosition(new T.Vector3())),
  benchPoint:v=>world(bench,v),ellipsePoint:v=>world(ellipse,v),
  stationPoints:()=>({dumbbells:world(curl,[0,0,0]),bench:world(bench,[0,.2,.5]),elliptical:world(ellipse,[0,.2,0])}),
  snapshot:()=>({bar:bar.position.toArray(),tilt:bar.rotation.z,pedals:pedals.map(p=>p.position.toArray()),handles:handles.map(h=>h.rotation.x)}),
  dispose(){Object.values(mats).forEach(m=>m.dispose());matsByStation.forEach(o=>o.material.dispose());}
 };
}
