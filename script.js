import * as THREE from
'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

import { OrbitControls } from
'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

import { OBJLoader } from
'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js';

import { MTLLoader } from
'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/MTLLoader.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20242a); // neutral dark gray background

// Camera
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 5, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; // moderate exposure
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting - neutral white lights (studio setup)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1.5);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(5, 8, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 50;
keyLight.shadow.camera.left = -10;
keyLight.shadow.camera.right = 10;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -10;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-5, 4, 6);
scene.add(fillLight);

// Floor
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x30343a,
    roughness: 0.82,
    metalness: 0.05
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance = 2;
controls.maxDistance = 100;
controls.target.set(0, 0, 0);
controls.update();

// Variables for auto rotation
let userInteracting = false;
let autoRotationSpeed = 0.01; // radians per second (slower for factory)
let lastInteractionTime = 0;
const AUTO_ROTATION_DELAY = 3000; // 3 seconds

// Event listeners for user interaction
controls.addEventListener('start', () => {
    userInteracting = true;
    lastInteractionTime = Date.now();
});

controls.addEventListener('end', () => {
    userInteracting = false;
    lastInteractionTime = Date.now();
});

// Also listen for mouse wheel and pointerdown/up for broader interaction
renderer.domElement.addEventListener('wheel', () => {
    userInteracting = true;
    lastInteractionTime = Date.now();
});
renderer.domElement.addEventListener('pointerdown', () => {
    userInteracting = true;
    lastInteractionTime = Date.now();
});
renderer.domElement.addEventListener('pointerup', () => {
    userInteracting = false;
    lastInteractionTime = Date.now();
});

// Function to update auto rotation
function updateAutoRotation(deltaTime) {
    const now = Date.now();
    if (!userInteracting && (now - lastInteractionTime) > AUTO_ROTATION_DELAY) {
        // Slowly orbit around Y axis
        controls.target.set(controls.target.x, controls.target.y, controls.target.z); // keep target
        // Orbit the camera around the target
        const radius = controls.target.distanceTo(camera.position);
        const angle = controls.getAzimuthalAngle(); // current angle around Y
        const newAngle = angle + autoRotationSpeed * deltaTime;
        const newX = controls.target.x + radius * Math.sin(newAngle);
        const newZ = controls.target.z + radius * Math.cos(newAngle);
        camera.position.set(newX, camera.position.y, newZ);
        camera.lookAt(controls.target);
        controls.update();
    }
}

// Loading screen
const loadingScreen = document.getElementById('loading');

// MTLLoader
const mtlLoader = new MTLLoader();
// Set path to the directory containing the MTL file
mtlLoader.setPath('./models/source/20251228_004_OUTPUT_LOD03/');
// Set resource path for textures (relative to MTL file location)
mtlLoader.setResourcePath('./'); // Textures are in same directory as MTL

// Load MTL
mtlLoader.load(
    '20251228_004_RC_LOD0.mtl',
    (materials) => {
        console.log('MTL LOADED', materials);
        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        // Set path to the directory containing the OBJ file
        objLoader.setPath('./models/source/20251228_004_OUTPUT_LOD03/');

        objLoader.load(
            '20251228_004_RC_LOD0.obj',
            (object) => {
                console.log('ORIGINAL FACTORY MODEL LOADED');
                console.log('Object:', object);

                // Log model information
                object.traverse((child) => {
                    if (child.isMesh) {
                        console.log('MESH:', child.name || '(no name)');
                        console.log('MATERIAL:', child.material);
                        if (child.material.map) {
                            console.log('  TEXTURE:', child.material.map.image?.currentSrc || child.material.map.image?.src);
                        }
                    }
                });

                scene.add(object);

                // Only enable shadow casting/receiving - preserve original materials
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Calculate bounding box for camera framing
                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                console.log('FACTORY BOUNDS');
                console.log('center:', center.x, center.y, center.z);
                console.log('size:', size.x, size.y, size.z);

                const maxDimension = Math.max(size.x, size.y, size.z);
                console.log('maxDimension:', maxDimension);

                // Center model on X and Z only (preserve original Y position)
                object.position.x -= center.x;
                object.position.z -= center.z;

                // Recalculate bounding box to get the actual bottom after centering X/Z
                const groundedBox = new THREE.Box3().setFromObject(object);
                const bottom = groundedBox.min.y;
                // Position floor just below the model's bottom to avoid intersection
                floor.position.y = bottom - 0.02;

                // Calculate proper camera distance to fit the model in view
                const fov = camera.fov * (Math.PI / 180); // convert to radians
                const distance = Math.max(size.x, size.z) / (2 * Math.tan(fov / 2));
                // Add some padding to ensure the model fits comfortably
                const cameraDistance = distance * 1.2;

                // Set up camera for 3/4 elevated hero view
                // Position camera diagonally in front and above the model
                const heroOffsetX = cameraDistance * 0.6; // 60% to the right
                const heroOffsetZ = cameraDistance * 0.6; // 60% forward
                const heroOffsetY = maxDimension * 0.35; // 35% up from center

                camera.position.set(
                    center.x + heroOffsetX,    // after centering X/Z, center.x is 0
                    center.y + heroOffsetY,    // preserve original Y center
                    center.z + heroOffsetZ     // after centering X/Z, center.z is 0
                );

                // Look at the center of the model
                camera.lookAt(center.x, center.y, center.z);

                // Set proper near and far clipping planes
                camera.near = Math.max(0.01, maxDimension / 1000);
                camera.far = Math.max(1000, maxDimension * 20);
                camera.updateProjectionMatrix();

                // Update OrbitControls target to the model center
                controls.target.set(center.x, center.y, center.z);

                // Set reasonable min/max distances for controls based on model size
                controls.minDistance = maxDimension * 0.5;
                controls.maxDistance = maxDimension * 5.0;

                // Update the controls
                controls.update();

                // Log camera info for debugging
                console.log('camera position:', camera.position.x, camera.position.y, camera.position.z);
                console.log('controls target:', controls.target.x, controls.target.y, controls.target.z);

                // Hide loading screen
                loadingScreen.style.display = 'none';
            },
            (xhr) => {
                // Progress callback (optional)
                // const percentComplete = (xhr.loaded / xhr.total) * 100;
                // loadingScreen.textContent = `LOADING FACTORY EXPERIENCE: ${Math.round(percentComplete)}%`;
            },
            (error) => {
                console.error('FACTORY OBJ ERROR:', error);
                loadingScreen.textContent = 'FACTORY MODEL FAILED TO LOAD — CHECK CONSOLE';
            }
        );
    },
    undefined,
    (error) => {
        console.error('MTL LOAD ERROR:', error);
        loadingScreen.textContent = 'FACTORY MODEL FAILED TO LOAD — CHECK CONSOLE';
    }
);

// Animation loop
let lastTime = 0;
function animate(time) {
    if (lastTime !== 0) {
        const deltaTime = (time - lastTime) / 1000; // convert to seconds
        updateAutoRotation(deltaTime);
        controls.update();
    }
    lastTime = time;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});