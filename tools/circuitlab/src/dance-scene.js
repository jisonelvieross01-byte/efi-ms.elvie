// The CC0 RobotExpressive asset contains only its original full-body Dance clip.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import modelData from '../vendor/RobotExpressive.glb';
let renderer,scene,camera,mixer,action,rig,host,frame=0,last=0,generation=0,initializing;
const tempos=[1,1.15,.8,1.3,.95,1.05,.9];
let variant=0,motion=true,started=0;
function size(){if(!host||!renderer)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(rig)renderer.render(scene,camera);}
async function init(container){
 host=container;
 if(initializing){await initializing;if(renderer.domElement.parentNode!==host)host.prepend(renderer.domElement);size();return;}
 if(renderer){if(renderer.domElement.parentNode!==host)host.prepend(renderer.domElement);size();return;}
 if(initializing)return initializing;
 initializing=(async()=>{
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','3D robot performing a full-body dance');
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(36,1,.1,40);camera.position.set(0,2.2,8.8);camera.lookAt(0,1.8,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x789b9b,2.8));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(4,7,5);key.castShadow=true;key.shadow.mapSize.set(512,512);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=6;key.shadow.camera.bottom=-2;key.shadow.normalBias=.04;scene.add(key);
  const fill=new THREE.DirectionalLight(0x7edfd4,1.8);fill.position.set(-4,3,0);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.2,48),new THREE.MeshStandardMaterial({color:0xd8eeea,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const raw=atob(modelData.split(',')[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer,'',resolve,reject));
  const robot=gltf.scene;const box=new THREE.Box3().setFromObject(robot),height=box.max.y-box.min.y;
  robot.scale.setScalar(3.6/height);robot.position.y=-box.min.y*robot.scale.y;
  robot.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
  rig=new THREE.Group();rig.add(robot);scene.add(rig);mixer=new THREE.AnimationMixer(robot);
  const clip=gltf.animations.find(a=>a.name==='Dance');if(!clip)throw Error('Dance clip missing');action=mixer.clipAction(clip);action.setLoop(THREE.LoopRepeat,Infinity);
  host.prepend(canvas);size();new ResizeObserver(size).observe(host);
 })();
 try{await initializing;}catch(error){if(renderer)renderer.dispose();renderer=null;initializing=null;throw error;}
}
function draw(now){
 frame=requestAnimationFrame(draw);if(now-last<32)return;const delta=Math.min((now-last)/1000,.08);last=now;
 if(motion){mixer.update(delta);const t=(now-started)/1000;rig.rotation.y=Math.sin(t*1.6)*.18+(variant===5?Math.sin(t*.75)*.45:0);}
 renderer.render(scene,camera);
}
export async function play(container,index=0,forceMotion=false){
 const token=++generation;await init(container);if(token!==generation)return false;
 cancelAnimationFrame(frame);variant=index%tempos.length;motion=forceMotion||!matchMedia('(prefers-reduced-motion: reduce)').matches;
 rig.rotation.y=0;action.reset();action.timeScale=tempos[variant];action.play();mixer.update(.45+variant*.13);size();renderer.render(scene,camera);
 started=last=performance.now();if(motion)frame=requestAnimationFrame(draw);
 container.dataset.renderer='webgl';container.dataset.motion=motion?'playing':'still';return true;
}
export function stop(){generation++;cancelAnimationFrame(frame);frame=0;if(host)host.dataset.motion='stopped';}
