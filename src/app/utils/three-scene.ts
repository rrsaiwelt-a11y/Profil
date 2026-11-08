import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface SmartGrid3DState {
  windShareMw: number;
  dCiScore: number;
  fiberLatencyMs: number;
  selectedZone: 'ustka' | 'slupsk' | 'trojmiasto';
  wireframe: boolean;
  autoRotate: boolean;
}

export interface SmartGrid3DController {
  updateState: (state: Partial<SmartGrid3DState>) => void;
  setCameraPreset: (preset: 'overview' | 'turbine' | 'substation' | 'corridor') => void;
  dispose: () => void;
  isSoftwareRenderer: boolean;
}

export function initSmartGrid3DScene(
  canvas: HTMLCanvasElement,
  initialState: SmartGrid3DState,
): SmartGrid3DController {
  const state: SmartGrid3DState = {...initialState};

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });

  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererString = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : '';
  const isSoftwareGl =
    /SwiftShader|llvmpipe|Software|Mesa OffScreen|ANGLE.*Basic Render/i.test(rendererString);

  const width = canvas.clientWidth || 720;
  const height = canvas.clientHeight || 420;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x130e17);
  scene.fog = new THREE.FogExp2(0x130e17, 0.018);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  roomEnv.dispose();
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 250);
  camera.position.set(16, 11, 20);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = 6;
  controls.maxDistance = 48;
  controls.target.set(0, 3.5, 0);

  // Lighting Setup (Three-point + Hemisphere)
  const hemiLight = new THREE.HemisphereLight(0xd8ed00, 0x1b1421, 0.45);
  hemiLight.position.set(0, 30, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.8);
  keyLight.position.set(14, 22, 12);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xd8ed00, 0.9);
  rimLight.position.set(-16, 12, -10);
  scene.add(rimLight);

  // Shared PBR Materials
  const materials: THREE.MeshStandardMaterial[] = [];
  const makeMat = (params: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(params);
    materials.push(m);
    return m;
  };

  const seaMat = makeMat({
    color: 0x181122,
    roughness: 0.25,
    metalness: 0.75,
  });
  const landMat = makeMat({
    color: 0x241b2c,
    roughness: 0.7,
    metalness: 0.2,
  });
  const yellowAccentMat = makeMat({
    color: 0xd8ed00,
    roughness: 0.3,
    metalness: 0.6,
    emissive: 0xd8ed00,
    emissiveIntensity: 0.18,
  });
  const towerSteelMat = makeMat({
    color: 0xe2e8f0,
    roughness: 0.32,
    metalness: 0.82,
  });
  const darkMetalMat = makeMat({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.85,
  });
  const alertRedMat = makeMat({
    color: 0xef303f,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0xef303f,
    emissiveIntensity: 0.45,
  });
  const dciGlowMat = makeMat({
    color: 0xd8ed00,
    roughness: 0.2,
    metalness: 0.4,
    emissive: 0xd8ed00,
    emissiveIntensity: 0.55,
  });

  // Base Baltic Sea & Pomeranian Coast Platform
  const radialSegs = isSoftwareGl ? 16 : 32;
  const seaPlane = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 26), seaMat);
  seaPlane.position.set(0, -0.3, 0);
  seaPlane.receiveShadow = !isSoftwareGl;
  scene.add(seaPlane);

  const gridHelper = new THREE.GridHelper(36, 18, 0x32263d, 0x241b2c);
  gridHelper.position.y = 0.02;
  scene.add(gridHelper);

  // Coastline terrace for Ustka Port -> Słupsk GPZ -> Gdańsk Hotel
  const coastPlatform = new THREE.Mesh(new THREE.BoxGeometry(22, 0.8, 12), landMat);
  coastPlatform.position.set(4, 0.4, 3);
  coastPlatform.receiveShadow = !isSoftwareGl;
  scene.add(coastPlatform);

  // =========================================================================
  // COMPOSITE OBJECT 1: PGE BALTICA 2 & 3 OFFSHORE WIND TURBINE (9 PARTS)
  // =========================================================================
  const turbineGroup = new THREE.Group();
  turbineGroup.position.set(-8, 0, -4);
  scene.add(turbineGroup);

  // Part 1: Seabed Monopile Foundation
  const monopile = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.25, 2.2, radialSegs),
    yellowAccentMat,
  );
  monopile.position.y = 1.1;
  turbineGroup.add(monopile);

  // Part 2: Transition Piece & Service Platform Deck
  const platformDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.22, radialSegs),
    darkMetalMat,
  );
  platformDeck.position.y = 2.2;
  turbineGroup.add(platformDeck);

  // Part 3: Safety Railing Ring
  const railingRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.05, 8, radialSegs),
    yellowAccentMat,
  );
  railingRing.rotation.x = Math.PI / 2;
  railingRing.position.y = 2.5;
  turbineGroup.add(railingRing);

  // Part 4: Tapered Steel Tower
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.92, 8.2, radialSegs),
    towerSteelMat,
  );
  tower.position.y = 6.3;
  tower.castShadow = !isSoftwareGl;
  turbineGroup.add(tower);

  // Part 5: Yaw Ring Collar
  const yawCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.35, radialSegs),
    darkMetalMat,
  );
  yawCollar.position.y = 10.45;
  turbineGroup.add(yawCollar);

  // Part 6: Aerodynamic Nacelle Housing
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.15, 2.6), towerSteelMat);
  nacelle.position.set(0, 11.0, 0.2);
  nacelle.castShadow = !isSoftwareGl;
  turbineGroup.add(nacelle);

  // Part 7: Rear HV Cooler Hood & Aviation Warning Beacon
  const coolerHood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 0.7), darkMetalMat);
  coolerHood.position.set(0, 11.1, -1.25);
  turbineGroup.add(coolerHood);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), alertRedMat);
  beacon.position.set(0, 11.75, -0.8);
  turbineGroup.add(beacon);

  // Part 8 & 9: Rotor Hub Nose Cone + 3 Aerodynamic Pitched Blades
  const rotorAssembly = new THREE.Group();
  rotorAssembly.position.set(0, 11.0, 1.55);
  turbineGroup.add(rotorAssembly);

  const hubCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 1.25, radialSegs),
    yellowAccentMat,
  );
  hubCone.rotation.x = Math.PI / 2;
  hubCone.position.z = 0.4;
  rotorAssembly.add(hubCone);

  for (let i = 0; i < 3; i++) {
    const bladeHolder = new THREE.Group();
    bladeHolder.rotation.z = (i * Math.PI * 2) / 3;

    const bladeRoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 1.1, 12),
      darkMetalMat,
    );
    bladeRoot.position.y = 0.75;
    bladeHolder.add(bladeRoot);

    const bladeAirfoil = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 4.6, 0.09),
      towerSteelMat,
    );
    bladeAirfoil.position.y = 3.1;
    bladeAirfoil.rotation.y = 0.18;
    bladeHolder.add(bladeAirfoil);

    const bladeTip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.1), alertRedMat);
    bladeTip.position.y = 5.55;
    bladeTip.rotation.y = 0.18;
    bladeHolder.add(bladeTip);

    rotorAssembly.add(bladeHolder);
  }

  // =========================================================================
  // COMPOSITE OBJECT 2: USTKA PORT, SŁUPSK GPZ 400kV & GDAŃSK HOTEL NODES
  // =========================================================================
  // Node A: Ustka Port O&M & LoRaWAN dCi Sensor Mast (5 parts)
  const ustkaGroup = new THREE.Group();
  ustkaGroup.position.set(-1.5, 0.8, 1.5);
  scene.add(ustkaGroup);

  const ustkaBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 2.2), darkMetalMat);
  ustkaBase.position.y = 0.6;
  ustkaGroup.add(ustkaBase);

  const sensorMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 3.2, 12),
    towerSteelMat,
  );
  sensorMast.position.set(0.8, 2.2, 0);
  ustkaGroup.add(sensorMast);

  const dciDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), dciGlowMat);
  dciDome.position.set(0.8, 3.9, 0);
  ustkaGroup.add(dciDome);

  // Node B: Słupsk GPZ Wierzbięcino 400 kV Substation (6 parts)
  const slupskGroup = new THREE.Group();
  slupskGroup.position.set(4.5, 0.8, 4.8);
  scene.add(slupskGroup);

  const transformerCore = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 2.2), darkMetalMat);
  transformerCore.position.y = 0.9;
  slupskGroup.add(transformerCore);

  for (let b = -1; b <= 1; b++) {
    const bushing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 1.4, 12),
      yellowAccentMat,
    );
    bushing.position.set(b * 0.85, 2.4, 0);
    slupskGroup.add(bushing);
  }

  // Node C: Trójmiasto — Hotel Gdańsk Śródmieście Smart HVAC Tower (5 parts)
  const gdanskGroup = new THREE.Group();
  gdanskGroup.position.set(11.0, 0.8, 1.8);
  scene.add(gdanskGroup);

  const hotelMain = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.2, 2.6), towerSteelMat);
  hotelMain.position.y = 2.1;
  gdanskGroup.add(hotelMain);

  const hotelRoofSolar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.2), yellowAccentMat);
  hotelRoofSolar.position.y = 4.3;
  gdanskGroup.add(hotelRoofSolar);

  // Selection Ring Indicator
  const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.3, 0.09, 12, radialSegs),
    yellowAccentMat,
  );
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.position.set(-1.5, 0.9, 1.5);
  scene.add(selectionRing);

  // DWDM Optical Fiber Path + Animated Telemetry Pulses
  const corridorPoints = [
    new THREE.Vector3(-8, 1.5, -4),
    new THREE.Vector3(-1.5, 1.4, 1.5),
    new THREE.Vector3(4.5, 1.4, 4.8),
    new THREE.Vector3(11.0, 1.4, 1.8),
  ];
  const fiberCurve = new THREE.CatmullRomCurve3(corridorPoints);
  const fiberGeo = new THREE.TubeGeometry(fiberCurve, isSoftwareGl ? 24 : 48, 0.08, 8, false);
  const fiberMesh = new THREE.Mesh(fiberGeo, yellowAccentMat);
  scene.add(fiberMesh);

  const pulseSpheres: THREE.Mesh[] = [];
  for (let p = 0; p < 4; p++) {
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), alertRedMat);
    scene.add(pulse);
    pulseSpheres.push(pulse);
  }

  const updateZoneHighlight = () => {
    if (state.selectedZone === 'ustka') {
      selectionRing.position.set(-1.5, 0.9, 1.5);
    } else if (state.selectedZone === 'slupsk') {
      selectionRing.position.set(4.5, 0.9, 4.8);
    } else {
      selectionRing.position.set(11.0, 0.9, 1.8);
    }

    // Update dCi sensor dome color based on dCiScore
    if (state.dCiScore >= 75) {
      dciGlowMat.color.setHex(0xd8ed00);
      dciGlowMat.emissive.setHex(0xd8ed00);
    } else {
      dciGlowMat.color.setHex(0xef303f);
      dciGlowMat.emissive.setHex(0xef303f);
    }

    for (const m of materials) {
      m.wireframe = state.wireframe;
    }
  };
  updateZoneHighlight();

  let disposed = false;
  let timerId = 0;
  let rafId = 0;
  const clock = new THREE.Clock();

  const afterDraw = (cb: () => void) => {
    rafId = requestAnimationFrame(() => {
      timerId = window.setTimeout(cb, 0);
    });
  };

  const renderFrame = () => {
    if (disposed) return;

    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    // Rotate turbine blades proportional to windShareMw (e.g. 1420 MW -> ~1.4 rad/s)
    const rpmFactor = Math.max(0.25, (state.windShareMw / 1420) * 1.35);
    rotorAssembly.rotation.z -= delta * rpmFactor;

    // Pulse DWDM fiber packets along the corridor
    pulseSpheres.forEach((sphere, idx) => {
      const t = (elapsed * 0.28 + idx * 0.25) % 1;
      const pos = fiberCurve.getPointAt(t);
      sphere.position.copy(pos);
    });

    // Subtle rotation of selection ring
    selectionRing.rotation.z = elapsed * 0.8;

    if (state.autoRotate) {
      camera.position.x = Math.cos(elapsed * 0.15) * 20;
      camera.position.z = Math.sin(elapsed * 0.15) * 20;
    }

    controls.update();
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(renderFrame);
    } else {
      rafId = requestAnimationFrame(renderFrame);
    }
  };

  const handleResize = () => {
    if (disposed || !canvas.parentElement) return;
    const w = canvas.parentElement.clientWidth || 720;
    const h = canvas.parentElement.clientHeight || 420;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener('resize', handleResize);

  renderFrame();

  return {
    isSoftwareRenderer: isSoftwareGl,
    updateState(patch: Partial<SmartGrid3DState>) {
      Object.assign(state, patch);
      updateZoneHighlight();
    },
    setCameraPreset(preset: 'overview' | 'turbine' | 'substation' | 'corridor') {
      state.autoRotate = false;
      if (preset === 'turbine') {
        camera.position.set(-3, 12, 5);
        controls.target.set(-8, 9.5, -4);
      } else if (preset === 'substation') {
        camera.position.set(4.5, 6.5, 12.5);
        controls.target.set(4.5, 2.0, 4.8);
      } else if (preset === 'corridor') {
        camera.position.set(2, 18, 22);
        controls.target.set(2, 1.5, 1);
      } else {
        camera.position.set(16, 11, 20);
        controls.target.set(0, 3.5, 0);
      }
      controls.update();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      envTarget.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
