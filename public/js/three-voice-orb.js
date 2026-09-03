/**
 * SMARTRECOVER - 3D AI VOICE ORB
 * Dynamic animated voice orb for the Tier 2 Hinglish Voice Simulator.
 * Shifts states dynamically: READY -> CONNECTING -> CALLING -> ENDED
 */

window.SmartRecoverVoiceOrb = (function () {
  let container, scene, camera, renderer;
  let orbGroup, mainSphere, auraSphere, ring1, ring2, particleCloud;
  let currentState = 'READY'; // READY, CONNECTING, CALLING, PROCESSING, ENDED
  let audioIntensity = 0;
  let isVisible = true;

  function init(containerId) {
    container = document.getElementById(containerId || 'voiceOrbCanvasContainer');
    if (!container || typeof THREE === 'undefined') return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 300;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 200;

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // 1. Central Core Sphere (Holographic Voice Core)
    const sphereGeo = new THREE.SphereGeometry(24, 32, 32);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x065F46, // Emerald base
      emissive: 0x10B981,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
      shininess: 100
    });
    mainSphere = new THREE.Mesh(sphereGeo, sphereMat);
    orbGroup.add(mainSphere);

    // 2. Translucent Aura Outer Shell
    const auraGeo = new THREE.IcosahedronGeometry(30, 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x34D399,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    auraSphere = new THREE.Mesh(auraGeo, auraMat);
    orbGroup.add(auraSphere);

    // 3. Dual Harmonic Rings
    const ringGeo1 = new THREE.TorusGeometry(38, 0.5, 16, 80);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x22D3EE,
      transparent: true,
      opacity: 0.7
    });
    ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 4;
    orbGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(44, 0.4, 16, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xA78BFA,
      transparent: true,
      opacity: 0.5
    });
    ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 3;
    orbGroup.add(ring2);

    // 4. Voice Particles Ring
    const particleCount = 80;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cyan = new THREE.Color(0x22D3EE);
    const emerald = new THREE.Color(0x34D399);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 48 + (Math.random() - 0.5) * 8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;

      const c = i % 2 === 0 ? cyan : emerald;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    particleCloud = new THREE.Points(particleGeo, pMat);
    orbGroup.add(particleCloud);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x064E3B, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x34D399, 2.5, 250);
    pointLight.position.set(40, 50, 60);
    scene.add(pointLight);

    window.addEventListener('resize', onResize);

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

  function setState(state) {
    currentState = state;
    if (!mainSphere) return;

    if (state === 'CALLING') {
      mainSphere.material.emissive.setHex(0x10B981);
      auraSphere.material.color.setHex(0x34D399);
    } else if (state === 'CONNECTING') {
      mainSphere.material.emissive.setHex(0xF59E0B);
      auraSphere.material.color.setHex(0xFBBF24);
    } else if (state === 'ENDED') {
      mainSphere.material.emissive.setHex(0x64748B);
      auraSphere.material.color.setHex(0x94A3B8);
    } else {
      mainSphere.material.emissive.setHex(0x3B82F6);
      auraSphere.material.color.setHex(0x60A5FA);
    }
  }

  function setAudioLevel(level) {
    audioIntensity = Math.min(Math.max(level, 0), 1);
  }

  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;

    const elapsedTime = clock.getElapsedTime();

    if (currentState === 'READY') {
      // Gentle breathing idle
      const breathe = 1 + Math.sin(elapsedTime * 2.0) * 0.04;
      mainSphere.scale.set(breathe, breathe, breathe);
      auraSphere.rotation.y = elapsedTime * 0.2;
      orbGroup.rotation.y = elapsedTime * 0.15;
      ring1.rotation.z = elapsedTime * 0.3;
      ring2.rotation.x = elapsedTime * 0.25;
    } else if (currentState === 'CONNECTING') {
      // Fast accelerating whirl
      const pulse = 1 + Math.sin(elapsedTime * 6.0) * 0.08;
      mainSphere.scale.set(pulse, pulse, pulse);
      orbGroup.rotation.y = elapsedTime * 0.8;
      ring1.rotation.z = elapsedTime * 1.2;
      ring2.rotation.x = elapsedTime * 1.0;
    } else if (currentState === 'CALLING') {
      // Dynamic voice reactive pulse with audio intensity
      const dynamicPulse = 1 + (Math.sin(elapsedTime * 4.0) * 0.06) + (audioIntensity * 0.25);
      mainSphere.scale.set(dynamicPulse, dynamicPulse, dynamicPulse);
      auraSphere.scale.set(1 + audioIntensity * 0.2, 1 + audioIntensity * 0.2, 1 + audioIntensity * 0.2);
      orbGroup.rotation.y = elapsedTime * (0.3 + audioIntensity * 0.5);
      ring1.rotation.z = elapsedTime * (0.4 + audioIntensity * 0.8);
      ring2.rotation.x = elapsedTime * (0.35 + audioIntensity * 0.7);
    } else if (currentState === 'ENDED') {
      mainSphere.scale.set(0.95, 0.95, 0.95);
      orbGroup.rotation.y = elapsedTime * 0.05;
    }

    renderer.render(scene, camera);
  }

  return {
    init,
    setState,
    setAudioLevel
  };
})();
