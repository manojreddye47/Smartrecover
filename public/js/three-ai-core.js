/**
 * SMARTRECOVER - 3D AI NEURAL CORE
 * Abstract high-tech neural network core with glowing translucent central sphere,
 * orbital energy rings, floating data nodes, dynamic state transitions, and mouse parallax.
 */

window.SmartRecoverAICore = (function () {
  let container, scene, camera, renderer;
  let coreGroup, innerSphere, wireSphere, ring1, ring2, ring3, particles;
  let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
  let isVisible = true;
  let currentState = 'IDLE'; // IDLE, ANALYZING, RECOVERY, SUCCESS, FRAUD, ESCALATED
  let speedMultiplier = 1.0;

  function init(containerId) {
    container = document.getElementById(containerId || 'aiCoreCanvasContainer');
    if (!container || typeof THREE === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 300;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 220;

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Central Glowing Icosahedron Core
    const coreGeo = new THREE.IcosahedronGeometry(28, 2);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x1E3A8A,
      emissive: 0x22D3EE,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.85,
      shininess: 90
    });
    innerSphere = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(innerSphere);

    // 2. Wireframe Lattice Overlay
    const wireGeo = new THREE.IcosahedronGeometry(32, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x60A5FA,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    wireSphere = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(wireSphere);

    // 3. Orbital Energy Rings
    const ringGeo1 = new THREE.TorusGeometry(46, 0.6, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.6 });
    ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(54, 0.4, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xA78BFA, transparent: true, opacity: 0.5 });
    ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    coreGroup.add(ring2);

    const ringGeo3 = new THREE.TorusGeometry(62, 0.3, 16, 100);
    const ringMat3 = new THREE.MeshBasicMaterial({ color: 0x60A5FA, transparent: true, opacity: 0.35 });
    ring3 = new THREE.Mesh(ringGeo3, ringMat3);
    ring3.rotation.z = Math.PI / 5;
    coreGroup.add(ring3);

    // 4. Floating Neural Particles Cloud
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x22D3EE);
    const color2 = new THREE.Color(0xA78BFA);
    const color3 = new THREE.Color(0x60A5FA);

    for (let i = 0; i < particleCount; i++) {
      const radius = 35 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const chosenColor = (i % 3 === 0) ? color1 : (i % 3 === 1 ? color2 : color3);
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x0F172A, 1.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x22D3EE, 2.5, 300);
    pointLight1.position.set(60, 60, 80);
    scene.add(pointLight1);

    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);

    animate();
  }

  function onResize() {
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function onMouseMove(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    targetMouseX = x * 25;
    targetMouseY = y * 25;
  }

  function setCoreState(state) {
    currentState = state;
    if (!innerSphere) return;

    if (state === 'ANALYZING') {
      innerSphere.material.emissive.setHex(0x22D3EE);
      wireSphere.material.color.setHex(0x22D3EE);
      speedMultiplier = 2.5;
    } else if (state === 'RECOVERY') {
      innerSphere.material.emissive.setHex(0x60A5FA);
      wireSphere.material.color.setHex(0x60A5FA);
      speedMultiplier = 1.8;
    } else if (state === 'SUCCESS') {
      innerSphere.material.emissive.setHex(0x34D399);
      wireSphere.material.color.setHex(0x34D399);
      speedMultiplier = 1.2;
    } else if (state === 'FRAUD' || state === 'ESCALATED') {
      innerSphere.material.emissive.setHex(0xFB7185);
      wireSphere.material.color.setHex(0xFB7185);
      speedMultiplier = 3.0;
    } else {
      innerSphere.material.emissive.setHex(0x22D3EE);
      wireSphere.material.color.setHex(0x60A5FA);
      speedMultiplier = 1.0;
    }
  }

  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;

    const elapsedTime = clock.getElapsedTime();

    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    coreGroup.rotation.y = (elapsedTime * 0.2 * speedMultiplier) + (mouseX * 0.02);
    coreGroup.rotation.x = Math.sin(elapsedTime * 0.15) * 0.1 - (mouseY * 0.02);

    ring1.rotation.z = elapsedTime * 0.35 * speedMultiplier;
    ring2.rotation.x = elapsedTime * 0.25 * speedMultiplier;
    ring3.rotation.y = elapsedTime * -0.3 * speedMultiplier;

    particles.rotation.y = elapsedTime * -0.12 * speedMultiplier;

    const pulse = 1 + Math.sin(elapsedTime * (2.2 * speedMultiplier)) * 0.05;
    innerSphere.scale.set(pulse, pulse, pulse);

    renderer.render(scene, camera);
  }

  return {
    init,
    setCoreState
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  SmartRecoverAICore.init('aiCoreCanvasContainer');
});
