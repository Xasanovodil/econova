import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from '/vendor/BufferGeometryUtils.js';

export function createCity(container, onSelect) {
  const scene=new THREE.Scene(); scene.background=new THREE.Color('#e9eee7');
  scene.fog=new THREE.Fog('#e9eee7',95,190);
  const camera=new THREE.PerspectiveCamera(36,1,.1,240);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D shahar. Binoni tanlang yoki Joylar tugmasidan foydalaning.');
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=22;controls.maxDistance=100;controls.maxPolarAngle=Math.PI*.44;controls.minPolarAngle=.22;controls.screenSpacePanning=false;controls.maxTargetRadius=45;
  controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  const hemi=new THREE.HemisphereLight('#fff6df','#9fae96',1.8);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d4',2.7);sun.position.set(-27,50,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:60,bottom:-60,near:1,far:130});sun.shadow.normalBias=.05;sun.shadow.bias=-.0001;scene.add(sun);
  const fill=new THREE.DirectionalLight('#cbdde4',.5);fill.position.set(20,15,-30);scene.add(fill);
  const materials=new Map();
  function mat(color,props={}) {const key=color+JSON.stringify(props);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.83,...props}));return materials.get(key);}
  const cream=mat('#d8c8a8'), ivory=mat('#ece5cf'), green=mat('#456a58'),glass=mat('#81a9ab',{roughness:.27,metalness:.35}),dark=mat('#455651'),concrete=mat('#d1d1bd'),roadMat=mat('#8e9790'),white=mat('#ecebdc'),brick=mat('#ba9680'),roofMat=mat('#737c6c');
  function box(w,h,d,x,y,z,m,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(r,h,x,y,z,m,parent=scene,segments=10){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function sign(text,w,h,x,y,z,{background='#315541',color='#fbf4dc',size=65,rotation=0}={},parent=scene){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=color;ctx.font=`600 ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,canvas.height/2,960);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.8}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;parent.add(mesh);return mesh;}
  function windowAt(x,y,z,w=1.2,h=1.7,parent=scene){box(w+.16,h+.15,.12,x,y,z,ivory,parent);box(w,h,.16,x,y,z+.025,glass,parent);box(.055,h,.19,x,y,z+.05,ivory,parent);}
  function roof(w,d,height,x,y,z,parent,m=green){const geo=new THREE.BufferGeometry();const a=[-w/2,0,d/2,w/2,0,d/2,0,height,d/2,-w/2,0,-d/2,0,height,-d/2,w/2,0,-d/2,-w/2,0,-d/2,-w/2,0,d/2,0,height,d/2,-w/2,0,-d/2,0,height,d/2,0,height,-d/2,0,height,-d/2,0,height,d/2,w/2,0,d/2,0,height,-d/2,w/2,0,d/2,w/2,0,-d/2];geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function tree(x,z,scale=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);cylinder(.12,2.8,0,1.4,0,mat('#8d8262'),g);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,1),mat('#7f9866'));crown.scale.set(.8,1.4,.8);crown.position.y=3;g.add(crown);crown.castShadow=true;const crown2=new THREE.Mesh(new THREE.IcosahedronGeometry(.9,1),mat('#91a472'));crown2.position.set(.45,2.5,.15);g.add(crown2);crown2.castShadow=true;return g;}
  // A complete block with curbs and roads. Buildings stand on actual footprints.
  box(230,.25,190,0,-.3,0,mat('#bdc7a8'));
  box(132,.13,42,0,-.06,-23,mat('#d4d4b9'));
  box(132,.13,25,0,-.06,24,mat('#d2d6bf'));
  box(150,.08,7,0,.025,4.5,roadMat);
  box(7,.08,100,29,.03,4.5,roadMat);
  box(132,.22,2,0,.1,-.1,concrete);box(132,.22,2,0,.1,9,concrete);
  box(.24,.32,7,24.5,.1,18,concrete);
  for(let x=-72;x<73;x+=5){if(x>24&&x<34)continue;box(2.5,.02,.11,x,.08,4.5,white);box(.06,.015,1.7,x,.225,-.1,mat('#bfc2ae'));box(.06,.015,1.7,x,.225,9,mat('#bfc2ae'));}
  for(let z=-38;z<50;z+=5)if(z<0||z>9)box(.11,.02,2.5,29,.08,z,white);
  for(let z=1.7;z<8;z+=.75)box(2.2,.02,.32,22.5,.09,z,white);
  for(let x=-26;x<-14;x+=2.8){box(2.5,.02,.08,x,.09,1.8,white);box(.06,.02,2,x-1.25,.09,2.8,white);}
  const pickables=[],labels=[];
  function clickable(group,place,label,pos){group.userData.place=place;group.traverse(o=>{if(o.isMesh){o.userData.place=place;pickables.push(o);}});const element=document.createElement('div');element.className='caption';element.innerHTML='<span class="dot"></span><strong></strong>';element.querySelector('strong').textContent=label;container.appendChild(element);labels.push({element,pos:new THREE.Vector3(...pos),place});}
  // Workshop: open bays, interior floor, roof, side and rear geometry.
  const garage=new THREE.Group();garage.position.set(-7,0,-6);scene.add(garage);
  box(15,.3,11,0,.15,0,concrete,garage);
  box(15,.16,10.7,0,.34,0,mat('#b6b9a5'),garage);
  box(.3,4.2,10.4,-7.2,2.35,0,cream,garage);box(.3,4.2,10.4,7.2,2.35,0,cream,garage);
  box(14.5,4.2,.3,0,2.35,-5.1,cream,garage);
  box(.35,4.2,.4,-6.9,2.35,5,cream,garage);box(.5,4.2,.4,-.3,2.35,5,cream,garage);box(.4,4.2,.4,5.1,2.35,5,cream,garage);
  box(2,4.2,.35,6.25,2.35,5,cream,garage);box(14.6,1.1,.4,0,4,5,cream,garage);
  box(1.15,2.5,.15,6.2,1.6,5.23,green,garage);box(.88,1.2,.05,6.2,2.05,5.34,glass,garage);
  for(let i=0;i<2;i++){const x=-3.65+i*5.8;box(5.4,.65,.18,x,3.25,5.22,mat('#8f9989'),garage);for(let y=3;y<3.52;y+=.12)box(5.4,.025,.2,x,y,5.24,dark,garage);box(5,.025,6,x,.44,1,mat('#9aa795'),garage);for(let z=-1;z<4;z+=.8)box(.05,.025,.5,x-2.35,.46,z,mat('#d9bd6a'),garage);}
  roof(15.5,11.3,1.9,0,4.5,0,garage,green);
  box(15.6,.14,.18,0,4.5,5.65,mat('#a2b497'),garage);
  for(let z=-5.5;z<5.5;z+=.55){const r=box(8.05,.035,.04,-3.85,5.42,z,mat('#537665'),garage);r.rotation.z=.24;const r2=box(8.05,.035,.04,3.85,5.42,z,mat('#537665'),garage);r2.rotation.z=-.24;}
  sign('NAVRO‘Z  AVTOSERVIS',12.5,.85,-.3,4.06,5.26,{size:57},garage);
  sign('01',.6,.4,-6.5,3.7,5.29,{background:'#dbc9a7',color:'#5e695a',size:160},garage);
  sign('02',.6,.4,4.7,3.7,5.29,{background:'#dbc9a7',color:'#5e695a',size:160},garage);
  windowAt(1.7,2,-4.87,2.5,1.4,garage);windowAt(-4,2,-4.87,2.5,1.4,garage);
  const lifts=[];
  for(let i=0;i<2;i++){const g=new THREE.Group();g.position.set(-3.6+i*5.8,0,1);garage.add(g);for(const x of [-1.4,1.4]){box(.22,3.15,.3,x,1.95,0,mat('#bd7961'),g);box(.75,.1,.65,x,.4,0,dark,g);box(1,.15,.25,x/1.5,1.4,.2,dark,g);}box(2.8,.18,.5,0,.5,0,mat('#adac91'),g);lifts.push(g);}
  const tempLift=new THREE.Group();tempLift.position.set(4.6,0,-2.5);scene.add(tempLift);for(const x of [-1.4,1.4])box(.2,3,.25,x,1.7,0,mat('#c7a34e'),tempLift);tempLift.visible=false;
  lifts.forEach(g=>g.userData.dynamic=true);tempLift.userData.dynamic=true;
  const warningSign=sign('TA’MIR',1.7,.5,2.1,1.6,4.9,{background:'#d6aa62',color:'#544b37',size:170},garage);warningSign.visible=false;warningSign.userData.dynamic=true;
  clickable(garage,'workshop','Bo‘sh ustaxona',[-7,6.8,-.7]);
  // Supply depot with loading area and canopy.
  const depot=new THREE.Group();depot.position.set(-27,0,-7.5);scene.add(depot);
  box(11,3.8,9,0,2.1,0,mat('#c3b59b'),depot);box(11.7,.25,9.6,0,4.15,0,roofMat,depot);
  box(6,2.8,.12,-1,1.8,4.56,mat('#6b8075'),depot);for(let y=.6;y<3.2;y+=.24)box(6,.035,.18,-1,y,4.63,mat('#869889'),depot);
  sign('EHTIYOT QISMLAR',8,.75,0,3.62,4.65,{background:'#bdb095',color:'#4a5a49',size:60},depot);
  box(9,.18,2.7,0,3.1,5.3,green,depot);for(const x of [-4.1,4.1])cylinder(.06,3,x,1.5,6.2,dark,depot);
  for(let i=0;i<5;i++)box(.8,.7,.8,3.5+(i%2)*.9,.5+Math.floor(i/2)*.7,5.5,mat('#bd9e6d'),depot);
  clickable(depot,'supplies','Ehtiyot qismlar',[-27,5,-2]);
  // Modern showroom: glass, an overhang and genuinely different footprint.
  const showroom=new THREE.Group();showroom.position.set(13,0,-7);scene.add(showroom);
  box(13,.35,11,0,.2,0,concrete,showroom);box(12.3,5,.35,0,2.8,-5,ivory,showroom);box(.35,5,10.4,-6,2.8,0,ivory,showroom);box(.35,5,10.4,6,2.8,0,ivory,showroom);
  for(const x of [-5.5,-2.8,0,2.8,5.5]){box(.12,4.5,.15,x,2.6,5,mat('#d8d8c7'),showroom);if(x<5.5)box(2.55,4.3,.055,x+1.3,2.65,4.9,mat('#91afb0',{transparent:true,opacity:.42,roughness:.2}),showroom);}
  box(13.5,.45,12,0,5.3,0,ivory,showroom);box(12,.16,10.5,0,5.7,0,mat('#a8b3a4'),showroom);
  sign('YANGI IMKONIYAT',10,.7,0,4.6,5.12,{background:'#e5dec7',color:'#627265',size:62},showroom);
  sign('IJARAGA',3,.8,0,2.7,5.14,{background:'#4e7163',size:170},showroom);
  clickable(showroom,'showroom','Keyingi manzil',[13,6.6,-1.8]);
  // Homes have courtyards, porches and rear windows.
  function house(x,z,w,h,color,turn=0){const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=turn;scene.add(group);box(w,h,7,0,h/2+.25,0,mat(color),group);box(w+.35,.25,7.4,0,.2,0,concrete,group);roof(w+1,8,1.4,0,h+.2,0,group,mat('#9b8f7b'));for(let y=2;y<h;y+=2.8){for(let xx=-w/2+1.5;xx<w/2;xx+=2.6){windowAt(xx,y,3.56,1.1,1.5,group);const rear=box(1.1,1.5,.1,xx,y,-3.56,glass,group);}}box(1.2,2.5,.13,0,1.6,3.6,green,group);box(2,.17,1.3,0,.25,4.2,concrete,group);return group;}
  const bank=house(-7,18,13,6.1,'#d9cfb5',Math.PI);sign('ECONOVA BANK',10,.9,0,3.8,3.65,{background:'#dbd3b9',color:'#3b6050',size:64},bank);for(const x of [-5,-2.5,2.5,5])cylinder(.22,3.3,x,1.9,4,ivory,bank,12);box(12,.35,2,0,3.65,4,ivory,bank);clickable(bank,'bank','Econova Bank',[-7,8,13.5]);
  const apartment=house(-28,20,13,9,'#cfbca0',Math.PI);clickable(apartment,'neighborhood','Mahalla',[-28,11,16]);
  house(12,21,11,6,'#d7c6aa',Math.PI);house(-43,-8,9,6,'#c9b79e');house(-43,19,9,6,'#bdbfa7',Math.PI);
  const school=house(-8,-30,19,8.6,'#d7cdb6');sign('1-MAKTAB',7,1,0,5,3.65,{background:'#e4ddc9',color:'#5a7960',size:110},school);
  box(25,.2,11,-8,.15,-21,mat('#c8cfb4'));for(const x of [-19,3]){for(let z=-24;z<-17;z+=1.5)cylinder(.035,1.2,x,.7,z,dark);box(.06,.08,8,x,1.25,-21,dark);}
  house(15,-28,10,8.5,'#c7b99f');house(-31,-29,10,6,'#d0c0a8');house(44,-12,12,8.5,'#cabda8');house(43,20,11,6,'#d5c5a8',Math.PI);
  const trees=[[-19,-1],[-35,-1],[2,-1],[21,-1],[-18,9],[3,9],[21,10],[-38,9],[-42,-18],[-20,-17],[4,-18],[23,-18],[-40,-28],[-39,30],[0,30],[24,29],[36,-3],[37,10],[56,4],[-55,5],[1,-40],[-22,-39],[-48,-35],[-50,29],[12,33],[48,33],[50,-27],[-60,-10],[-60,20]];
  trees.forEach(([x,z],i)=>tree(x,z,.85+(i%4)*.12));
  // Street furniture: lamps, benches, planter beds, bollards and a bus shelter.
  for(const x of [-35,-18,3,21,43]){cylinder(.07,5,x,2.6,8.8,dark);box(.9,.12,.4,x+.35,5.1,8.8,mat('#697c70'));box(.65,.03,.3,x+.35,5.03,8.8,mat('#ece9c7'));}
  for(const x of [-16,0,18]){box(2.2,.15,.65,x,.75,10.3,mat('#9e8e6c'));box(2.2,.75,.12,x,1.1,10.65,mat('#9e8e6c'));for(const dx of [-.8,.8])box(.09,.7,.5,x+dx,.38,10.3,dark);}
  for(const x of [-20,2,21]){box(1.8,.5,.7,x,.45,-.25,mat('#b9b59c'));for(let i=0;i<3;i++)cylinder(.28,.45,x-.5+i*.5,.9,-.25,mat('#7f9667'));}
  for(let x=-15;x<1;x+=2)if(x<-12||x>-1)cylinder(.09,.7,x,.5,.7,dark);
  sign('NAVRO‘Z KO‘CHASI',4.6,.55,20,2.9,9.1,{background:'#446d66',size:76});cylinder(.04,3,18,1.5,9,dark);
  function makeCar(color){const g=new THREE.Group();box(1.6,.48,3.1,0,.65,0,mat(color),g);box(1.5,.25,2.8,0,.9,0,mat(color),g);box(1.32,.63,1.55,0,1.2,-.12,glass,g);box(1.4,.12,1.6,0,1.55,-.12,mat(color),g);box(1.35,.28,.12,0,.63,1.6,ivory,g);for(const x of [-.77,.77])for(const z of [-1,1]){const wheel=cylinder(.32,.18,x,.4,z,mat('#3e4944'),g,14);wheel.rotation.z=Math.PI/2;const hub=cylinder(.16,.2,x,.4,z,mat('#b4b8a6'),g,10);hub.rotation.z=Math.PI/2;}box(1.3,.15,.06,0,.85,1.62,mat('#ece5b8'),g);box(1.2,.12,.06,0,.8,-1.59,mat('#b77765'),g);return g;}
  const parked=makeCar('#c2b793');parked.position.set(-24,.1,2.7);parked.rotation.y=Math.PI/2;scene.add(parked);
  const displayCar=makeCar('#d1d6c9');displayCar.position.set(12,.4,-6);displayCar.rotation.y=.4;scene.add(displayCar);
  const supplierVan=makeCar('#b7c0aa');box(1.65,1.3,2,0,1.4,-.35,ivory,supplierVan);sign('QISMLAR',1.5,.4,0,1.7,.68,{background:'#dbe0cb',color:'#496750',size:180},supplierVan);supplierVan.position.set(-34,.1,-1.9);scene.add(supplierVan);
  // Merge static geometry by material and selectable place; keep movable lifts separate.
  scene.updateMatrixWorld(true);
  const batches=new Map(),staticMeshes=[];
  scene.traverse(obj=>{
    if(!obj.isMesh||Array.isArray(obj.material))return;
    let parent=obj;while(parent){if(parent.userData.dynamic)return;parent=parent.parent;}
    const key=obj.material.uuid+':'+(obj.userData.place||'');
    if(!batches.has(key))batches.set(key,{material:obj.material,place:obj.userData.place,geometries:[]});
    const geometry=obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry.clone();geometry.applyMatrix4(obj.matrixWorld);geometry.deleteAttribute('uv1');
    if(!geometry.getAttribute('uv'))geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*2),2));
    batches.get(key).geometries.push(geometry);staticMeshes.push(obj);
  });
  pickables.length=0;
  for(const batch of batches.values()){
    const merged=mergeGeometries(batch.geometries,false);
    const mesh=new THREE.Mesh(merged,batch.material);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData.place=batch.place;scene.add(mesh);if(batch.place)pickables.push(mesh);
    batch.geometries.forEach(g=>g.dispose());
  }
  for(const mesh of staticMeshes){mesh.removeFromParent();mesh.geometry.dispose();}
  const cars=new Map(), colors=['#b5c7c1','#efe6cd','#bd9e8a','#b7bec9','#a2b298','#e2d0af'];
  let dirty=true;controls.addEventListener('change',()=>dirty=true);
  let state=null,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,low=false;
  function home(){const mobile=innerWidth<640;controls.target.set(-5,0,-3);camera.position.set(mobile?36:41,mobile?43:35,mobile?48:46);controls.update();}
  home();
  function focus(){controls.target.set(-7,1,-3);camera.position.set(16,23,28);controls.update();}
  const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let pointerStart=null;
  renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickables,false)[0];if(hit)onSelect(hit.object.userData.place);});
  const resize=()=>{dirty=true;const w=container.clientWidth,h=container.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};window.addEventListener('resize',resize);resize();
  function update(next){dirty=true;state=next;const c=next.company;warningSign.visible=!!c&&c.lifts.includes(false);tempLift.visible=!!c?.temporary;
    lifts.forEach((g,i)=>{g.visible=!!c?.leased;g.children.forEach(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.height>3)o.material=mat(c?.lifts[i]?'#7e9980':'#c08d62');});});
    const label=labels.find(l=>l.place==='workshop');label.element.querySelector('strong').textContent=c?.name||'Bo‘sh ustaxona';label.element.classList.toggle('owner',!!next.privateCompany);
    const ids=new Set((c?.bookings||[]).map(b=>b.id));for(const[id,obj]of cars)if(!ids.has(id)){scene.remove(obj);cars.delete(id);}
    (c?.bookings||[]).forEach((b,i)=>{if(!cars.has(b.id)){const obj=makeCar(colors[i%colors.length]);scene.add(obj);cars.set(b.id,obj);}});
  }
  function animateCars(now){const bookings=state?.company?.bookings||[];bookings.forEach((b,i)=>{const car=cars.get(b.id);if(!car)return;
      if(b.status==='completed'){
        const progress=reduced?1:Math.min(1,Math.max(0,(now-b.completedAt)/15000));
        if(progress>=1){car.visible=false;return;}car.visible=true;
        const bayX=-10.6+(b.bay%2)*5.8;
        if(progress<.4){const t=progress/.4;car.position.set(bayX,.2,-4+t*7);car.rotation.y=0;}
        else{const t=(progress-.4)/.6;car.position.set(bayX+t*50,.2,3.3);car.rotation.y=Math.PI/2;}
      }else{car.visible=true;car.position.set(3+i*3.9,.1,6.6);car.rotation.y=-Math.PI/2;if(b.status==='deferred'){car.position.set(-35+i*3.6,.1,2.7);car.rotation.y=Math.PI/2;}}
    });}
  let frame=0,previous=performance.now(),frames=0,sample=previous,fps=0;
  function render(time){frame=requestAnimationFrame(render);controls.update();animateCars(Date.now());const width=container.clientWidth,height=container.clientHeight;
    for(const l of labels){const v=l.pos.clone().project(camera);l.element.style.left=(v.x*.5+.5)*width+'px';l.element.style.top=(-v.y*.5+.5)*height+'px';l.element.style.display=(v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1)?'':'none';}
    const animating=!reduced&&state?.company?.bookings.some(b=>b.status==='completed'&&Date.now()-b.completedAt<15000);
    if((dirty||animating)&&time-previous>=1000/30){renderer.render(scene,camera);previous=time;frames++;dirty=false;}if(time-sample>1500){fps=frames*1000/(time-sample);sample=time;frames=0;}
  }
  frame=requestAnimationFrame(render);
  return {update,home,focus,rotate(){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI);camera.position.copy(controls.target).add(offset);controls.update();},setLow(value){low=value;renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=!low;resize();},setReduced(value){reduced=value;dirty=true;},diagnostics(){return {renderer:'Three.js',geometries:renderer.info.memory.geometries,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fps:Math.round(fps),bookedCars:cars.size,camera:camera.position.toArray(),target:controls.target.toArray()};},dispose(){cancelAnimationFrame(frame);controls.dispose();renderer.dispose();window.removeEventListener('resize',resize);}};
}
