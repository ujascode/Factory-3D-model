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
// Initial position will be set after model loads will be set dynamically

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

// Lighting - neutral white lights (studio setup) - adjusted to be brighter
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.5);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
keyLight.position.set(100, 150, 100);
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

const fillLight = new THREE.DirectionalLight(0xffffff, 1.8);
fillLight.position.set(-100, 80, -50);
scene.add(fillLight);

// Subtle rim/back light
const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
rimLight.position.set(0, -50, -100);
scene.add(rimLight);

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
controls.minDistance = 2; // will be updated after model loads
controls.maxDistance = 100; // will be updated after model loads
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
mtlLoader.setResourcePath('./models/source/20251228_004_OUTPUT_LOD03/'); // Textures are in same directory as MTL

// Load MTL
mtlLoader.load(
    '20251228_004_RC_LOD0.mtl',
    (materials) => {
        console.log('MTL LOADED', materials);

        // Inspect the materials
        if (materials.materials) {
            for (const name in materials.materials) {
                const material = materials.materials[name];
                console.log(
                    'MATERIAL:',
                    name,
                    'color:',
                    material.color.getHex(),
                    'map:',
                    material.map ? 'YES' : 'NO',
                    'transparent:',
                    material.transparent,
                    'opacity:',
                    material.opacity
                );
                if (material.map) {
                    // Only apply sRGB color space to color/diffuse textures
                    material.map.colorSpace = THREE.SRGBColorSpace;
                    material.map.needsUpdate = true;
                    console.log('  SET SRGB COLORSPACE ON MAP');
                }
            }
        } else {
            console.log('WARNING: materials.materials is undefined or empty');
        }

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
                let meshCount = 0;
                let texturedMaterialCount = 0;
                let meshWithUVCount = 0;
                object.traverse((child) => {
                    if (child.isMesh) {
                        meshCount++;
                        console.log(
                            'MESH:',
                            child.name || '(no name)',
                            'MATERIAL:',
                            child.material ? child.material.name || '(no name)' : 'no material',
                            'TYPE:',
                            child.material ? child.material.type : 'none',
                            'HAS MAP:',
                            !!child.material.map,
                            'HAS UV:',
                            !!child.geometry?.attributes?.uv
                        );
                        if (child.material && child.material.map) {
                            texturedMaterialCount++;
                        }
                        if (child.geometry && child.geometry.attributes?.uv) {
                            meshWithUVCount++;
                        }
                    }
                });
                console.log('TOTAL MESHES:', meshCount);
                console.log('TOTAL TEXTURED MATERIALS:', texturedMaterialCount);
                console.log('TOTAL MESHES WITH UV:', meshWithUVCount);

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

                const sphere = box.getBoundingSphere(new THREE.Sphere());
                const radius = sphere.radius;
                console.log('bounding sphere radius:', radius);

                // Center model on X and Z only (preserve original Y position)
                object.position.x -= center.x;
                object.position.z -= center.z;

                // Recalculate bounding box to get the actual bottom after centering X/Z
                const groundedBox = new THREE.Box3().setFromObject(object);
                const bottom = groundedBox.min.y;
                // Position floor just below the model's bottom to avoid intersection
                floor.position.y = bottom - 0.02;

                // Calculate proper camera distance to fit the model in view
                const fovRadians = THREE.MathUtils.degToRad(camera.fov);
                const distance = radius / Math.sin(fovRadians / 2);
                // Add a small margin to ensure the model fits comfortably (about 15% extra)
                const fitDistance = distance * 1.15;

                console.log('calculated fit distance:', fitDistance);

                // Set up camera for 3/4 elevated hero view
                // We'll try a few directions and choose the one that shows the factory best.
                // Since we don't know the factory's orientation, we'll use a default diagonal
                // and then adjust based on the actual dimensions if needed.
                const direction = new THREE.Vector3(1, 0.55, 1).normalize();

                camera.position.copy(
                    center.clone().add(
                        direction.multiplyScalar(fitDistance)
                    )
                );

                // Look at the center of the model
                camera.lookAt(center.x, center.y, center.z);

                // Set proper near and far clipping planes
                camera.near = Math.max(0.01, radius / 1000); // at least 0.01
                camera.far = Math.max(1000, radius * 20);
                camera.updateProjectionMatrix();

                // Update OrbitControls target to the model center
                controls.target.set(center.x, center.y, center.z);

                // Set reasonable min/max distances for controls based on model size
                controls.minDistance = radius * 0.5;
                controls.maxDistance = radius * 5.0;

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