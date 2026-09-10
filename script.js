import * as THREE from "three";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/MTLLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const canvas=document.querySelector("#scene");
const loaderUI=document.querySelector("#loader");
const loaderBar=document.querySelector("#loaderBar");
const loaderPercent=document.querySelector("#loaderPercent");
const errorUI=document.querySelector("#error");
const errorText=document.querySelector("#errorText");
const resetBtn=document.querySelector("#resetBtn");
const autoBtn=document.querySelector("#autoBtn");
const autoState=document.querySelector("#autoState");
const infoButton=document.querySelector("#infoButton");
const infoPanel=document.querySelector("#infoPanel");
const closePanel=document.querySelector("#closePanel");
const menuButton=document.querySelector("#menuButton");

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x07090b);

const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.01,100000);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const touch=matchMedia("(pointer: coarse)").matches;
const small=innerWidth<900;

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=touch?.075:.055;
controls.enablePan=true;
controls.screenSpacePanning=true;
controls.rotateSpeed=touch?.45:.62;
controls.panSpeed=touch?.55:.7;
controls.zoomSpeed=touch?.65:.8;
controls.minDistance=.05;
controls.maxDistance=100000;

scene.add(new THREE.HemisphereLight(0xffffff,0x20252a,small?1.8:2.4));

const key=new THREE.DirectionalLight(0xffffff,small?3.2:4.2);
key.position.set(50,80,45);
scene.add(key);

const fill=new THREE.DirectionalLight(0xdce8ef,small?1.8:2.5);
fill.position.set(-50,35,30);
scene.add(fill);

const rim=new THREE.DirectionalLight(0xffffff,small?2:2.8);
rim.position.set(0,60,-70);
scene.add(rim);

const floor=new THREE.Mesh(
  new THREE.PlaneGeometry(4000,4000),
  new THREE.MeshStandardMaterial({color:0x111416,roughness:.9,metalness:.08})
);
floor.rotation.x=-Math.PI/2;
floor.position.y=-.05;
scene.add(floor);

let model=null;
let radius=1;
let initialCamera=null;
let initialTarget=null;
let autoRotate=true;
let lastInteraction=performance.now();

function progress(loaded,total){
  let p=total>0?loaded/total:Math.min(.92,.08+Math.log10(Math.max(loaded,1))/8);
  p=Math.max(0,Math.min(.98,p));
  loaderBar.style.width=`${Math.round(p*100)}%`;
  loaderPercent.textContent=`${Math.round(p*100)}%`;
}

function prepare(root){
  root.traverse((o)=>{
    if(!o.isMesh)return;
    o.castShadow=false;
    o.receiveShadow=false;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      m.side=THREE.FrontSide;
      if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;
    });
  });
}

function frame(root){
  const box=new THREE.Box3().setFromObject(root);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const sphere=box.getBoundingSphere(new THREE.Sphere());

  root.position.sub(center);
  radius=Math.max(sphere.radius,.001);

  const targetFraction=innerWidth<900?.58:.67;
  const fov=THREE.MathUtils.degToRad(camera.fov);
  let distance=radius/Math.sin(fov/2)/(targetFraction*1.85);
  if(!Number.isFinite(distance)||distance<=0)distance=radius*2.5;

  if(innerWidth<900){
    camera.position.set(distance*.95,distance*.46,distance*1.12);
    controls.target.set(0,size.y*.02,0);
  }else{
    camera.position.set(distance*.98,distance*.5,distance*1.1);
    controls.target.set(0,size.y*.015,0);
  }

  camera.near=Math.max(radius/1000,.001);
  camera.far=Math.max(radius*30,1000);
  camera.updateProjectionMatrix();

  controls.minDistance=radius*.32;
  controls.maxDistance=radius*6;
  controls.update();

  initialCamera=camera.position.clone();
  initialTarget=controls.target.clone();

  floor.position.y=-size.y*.5-Math.max(size.y*.008,.01);
}

function done(){
  progress(1,1);
  setTimeout(()=>loaderUI.classList.add("done"),300);
}

function fail(err){
  console.error(err);
  loaderUI.classList.add("done");
  errorText.textContent="Could not load the factory model. Check Console and Network for the OBJ/MTL/texture request.";
  errorUI.hidden=false;
}

const mtlLoader=new MTLLoader();
mtlLoader.setPath("./models/");
mtlLoader.load("20251228_004_RC_LOD0.mtl",(materials)=>{
  materials.preload();
  const objLoader=new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load("./models/20251228_004_RC_LOD0.obj",(object)=>{
    model=object;
    prepare(model);
    scene.add(model);
    frame(model);
    done();
  },(xhr)=>progress(xhr.loaded,xhr.total),fail);
},(xhr)=>progress(xhr.loaded,xhr.total),fail);

function interaction(){lastInteraction=performance.now()}
controls.addEventListener("start",interaction);
controls.addEventListener("change",interaction);
controls.addEventListener("end",interaction);

resetBtn.addEventListener("click",()=>{
  if(!initialCamera)return;
  camera.position.copy(initialCamera);
  controls.target.copy(initialTarget);
  controls.update();
  interaction();
});

autoBtn.addEventListener("click",()=>{
  autoRotate=!autoRotate;
  autoState.textContent=autoRotate?"ON":"OFF";
  autoBtn.setAttribute("aria-pressed",String(autoRotate));
  interaction();
});

function panel(open){
  infoPanel.classList.toggle("open",open);
  infoPanel.setAttribute("aria-hidden",String(!open));
  menuButton.setAttribute("aria-expanded",String(open));
}
infoButton.addEventListener("click",()=>panel(true));
closePanel.addEventListener("click",()=>panel(false));
menuButton.addEventListener("click",()=>panel(!infoPanel.classList.contains("open")));

function animate(t){
  requestAnimationFrame(animate);
  if(model&&autoRotate&&t-lastInteraction>3000)model.rotation.y+=touch?.00035:.00065;
  controls.update();
  renderer.render(scene,camera);
}
animate(0);

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<900?1.35:1.5));
  renderer.setSize(innerWidth,innerHeight);
});
