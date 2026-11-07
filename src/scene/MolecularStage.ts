import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ELEMENTS } from '../chem/elements';
import type { AtomNode, BondEdge, ElementSymbol, MoleculeGraph, MoleculeMetrics } from '../chem/types';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';

export type RepresentationMode = 'ball_stick' | 'space_filling' | 'wireframe';
export type MotionMode = 'static' | 'spin' | 'vibrate';
export type StageTheme = 'light' | 'dark';
export type CameraPreset = 'iso' | 'top' | 'front' | 'reset';

export interface StageOptions {
  representation: RepresentationMode;
  explodedFactor: number; // 1.0 to 1.8
  motionMode: MotionMode;
  showOrbitals: boolean;
  showElectronShell: boolean;
  stageTheme: StageTheme;
  selectedAtomId: string | null;
  hoveredAtomId: string | null;
  selectedBondId: string | null;
  hoveredBondId: string | null;
  selectedLonePair: { atomId: string; lobeIndex: number } | null;
}

// Pre-allocated scratch math helpers (zero GC inside render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _vec3D = new THREE.Vector3();
const _vec3Mid = new THREE.Vector3();
const _vec3Dir = new THREE.Vector3();
const _vec3Perp = new THREE.Vector3();
const _vec3Perp2 = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);

interface AtomRig {
  atomId: string;
  element: ElementSymbol;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  collarMesh: THREE.Mesh;
  reticleGroup: THREE.Group;
  lobeGroup: THREE.Group | null;
  shellMesh: THREE.Mesh | null;
  hitProxy: THREE.Mesh;
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  baseRadius: number;
  vdwRadius: number;
}

interface BondRig {
  bond: BondEdge;
  group: THREE.Group;
  hitProxy: THREE.Mesh;
  selectionIndicator: THREE.Mesh;
}

export class MolecularStage {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private textures: ProceduralTextureSet;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private rootGroup: THREE.Group;
  private moleculeGroup: THREE.Group;
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;

  private atomRigs = new Map<string, AtomRig>();
  private bondRigs: BondRig[] = [];
  private hitTargets: THREE.Mesh[] = [];
  private disposableGeometries: THREE.BufferGeometry[] = [];
  private disposableMaterials: THREE.Material[] = [];

  private currentMolecule: MoleculeGraph | null = null;
  private currentMetrics: MoleculeMetrics | null = null;
  private options: StageOptions = {
    representation: 'ball_stick',
    explodedFactor: 1.0,
    motionMode: 'static',
    showOrbitals: false,
    showElectronShell: false,
    stageTheme: 'light',
    selectedAtomId: null,
    hoveredAtomId: null,
    selectedBondId: null,
    hoveredBondId: null,
    selectedLonePair: null,
  };

  private currentExploded = 1.0;
  private cameraTargetPos: THREE.Vector3 | null = null;
  private cameraTargetLook: THREE.Vector3 | null = null;
  private currentPreset: CameraPreset = 'iso';
  private userMovedCamera = false;

  private rafId = 0;
  private timeoutId = 0;
  private lastWidth = 0;
  private lastHeight = 0;
  private renderBusy = false;
  private renderDirty = false;
  private continuousActive = false;
  private lastTickTime = performance.now();
  private elapsedSimTime = 0;
  private disposed = false;

  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerDownClient = { x: 0, y: 0 };
  private lastHoverRaycast = 0;

  private onSelectAtom?: (atomId: string | null) => void;
  private onHoverAtom?: (atomId: string | null) => void;
  private onSelectBond?: (bondId: string | null) => void;
  private onHoverBond?: (bondId: string | null) => void;
  private onSelectLonePair?: (lp: { atomId: string; lobeIndex: number } | null) => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onSelectAtom?: (atomId: string | null) => void;
      onHoverAtom?: (atomId: string | null) => void;
      onSelectBond?: (bondId: string | null) => void;
      onHoverBond?: (bondId: string | null) => void;
      onSelectLonePair?: (lp: { atomId: string; lobeIndex: number } | null) => void;
    }
  ) {
    this.container = container;
    this.onSelectAtom = callbacks.onSelectAtom;
    this.onHoverAtom = callbacks.onHoverAtom;
    this.onSelectBond = callbacks.onSelectBond;
    this.onHoverBond = callbacks.onHoverBond;
    this.onSelectLonePair = callbacks.onSelectLonePair;

    // 1. Software WebGL Detection via GPU renderer string
    this.isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(300, container.clientWidth || window.innerWidth);
    const height = Math.max(240, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.lastWidth = width;
    this.lastHeight = height;
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'molecule-3d-canvas');
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Studio RoomEnvironment (structure-only canvas)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf3f6fa);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    );
    this.scene.environment = this.envRenderTarget.texture;
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls (unrestricted 360° orbit around structure)
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 150);
    this.camera.position.set(5.8, 2.9, 8.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 0.85;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 26;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.target.set(0, 0, 0);

    // Explicitly configure mouse and touch button bindings for standard and trackpad interactions
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.controls.addEventListener('start', () => {
      // Cancel any scripted camera transition immediately when user grabs camera
      this.cameraTargetPos = null;
      this.cameraTargetLook = null;
      this.userMovedCamera = true;
    });

    this.controls.addEventListener('change', () => {
      if (!this.continuousActive) {
        this.requestRender();
      }
    });

    // 4. Procedural Textures & Studio 3-Point + Softbox Lighting Rig
    this.textures = createProceduralTextures(this.renderer);

    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xcbd5e1, 0.78);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    this.keyLight.position.set(6.5, 11.5, 7.5);
    this.keyLight.target.position.set(0, 0, 0);
    this.scene.add(this.keyLight.target);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 1;
      this.keyLight.shadow.camera.far = 28;
      const d = 7.5;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.9);
    rimLight.position.set(-7.0, 5.5, -6.5);
    this.scene.add(rimLight);

    const bottomFillLight = new THREE.DirectionalLight(0xe2e8f0, 0.42);
    bottomFillLight.position.set(0, -8.0, 4.0);
    this.scene.add(bottomFillLight);

    if (!this.isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xffffff, 2.2, 6, 3);
      softbox.position.set(-4.5, 6.5, 4.5);
      softbox.lookAt(0, 0, 0);
      this.scene.add(softbox);
    }

    // 5. Pure Molecular Assembly Root (no pedestal plate or floor plane)
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.moleculeGroup = new THREE.Group();
    this.moleculeGroup.position.set(0, 0, 0);
    this.rootGroup.add(this.moleculeGroup);

    // Layer 1 is dedicated to fast raycasting against atom hit proxies
    this.raycaster.layers.set(1);

    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.requestRender();
  }


  /**
   * Computes camera distance so the entire molecule bounding sphere fits cleanly
   * inside both vertical and narrow horizontal viewport bounds.
   */
  private getOptimalViewDistance(): number {
    let maxR = 2.2;
    for (const rig of this.atomRigs.values()) {
      const r = rig.targetPos.length() + rig.baseRadius * 1.35;
      if (r > maxR) maxR = r;
    }
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = Math.max(0.45, this.camera.aspect || 1);
    const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * aspect);
    const sinV = Math.sin(vFov * 0.5);
    const sinH = Math.sin(hFov * 0.5);
    return Math.max(maxR / sinV, maxR / sinH) * 1.12;
  }

  private getPresetCameraPosition(preset: CameraPreset): THREE.Vector3 {
    const dist = this.getOptimalViewDistance();
    if (preset === 'top') {
      return new THREE.Vector3(0.01, dist * 1.05, 0.01);
    }
    if (preset === 'front') {
      return new THREE.Vector3(0, 0, dist * 1.02);
    }
    // Classic 3/4 isometric molecular view direction
    const dir = new THREE.Vector3(0.55, 0.28, 0.787).normalize();
    return dir.multiplyScalar(dist);
  }

  public setMolecule(molecule: MoleculeGraph, metrics: MoleculeMetrics) {
    const isNewMolecule = this.currentMolecule?.id !== molecule.id;
    this.currentMolecule = molecule;
    this.currentMetrics = metrics;
    this.rebuildMoleculeMeshes();
    if (isNewMolecule) {
      this.userMovedCamera = false;
    }
    if (!this.userMovedCamera) {
      const pos = this.getPresetCameraPosition(this.currentPreset);
      this.camera.position.copy(pos);
      this.controls.target.set(0, -0.22, 0);
      this.controls.update();
    }
    this.requestRender();
  }

  public setOptions(partial: Partial<StageOptions>) {
    const prevRep = this.options.representation;
    const prevOrbitals = this.options.showOrbitals;
    const prevShell = this.options.showElectronShell;
    const prevTheme = this.options.stageTheme;
    const prevMotion = this.options.motionMode;

    this.options = { ...this.options, ...partial };

    if (prevTheme !== this.options.stageTheme) {
      this.applyStageTheme(this.options.stageTheme);
    }

    if (
      prevRep !== this.options.representation ||
      prevOrbitals !== this.options.showOrbitals ||
      prevShell !== this.options.showElectronShell
    ) {
      this.rebuildMoleculeMeshes();
    } else {
      this.updateHighlightStates();
    }

    const needsContinuous =
      this.options.motionMode !== 'static' ||
      Math.abs(this.currentExploded - this.options.explodedFactor) > 0.005 ||
      this.cameraTargetPos !== null;

    if (needsContinuous && !this.continuousActive) {
      this.startContinuousLoop();
    } else if (!needsContinuous && prevMotion !== 'static') {
      this.continuousActive = false;
      this.requestRender();
    } else {
      this.requestRender();
    }
  }

  public setCameraPreset(preset: CameraPreset) {
    this.currentPreset = preset === 'reset' ? 'iso' : preset;
    this.userMovedCamera = false;
    const target = new THREE.Vector3(0, -0.22, 0);
    if (preset === 'reset') {
      this.moleculeGroup.rotation.set(0, 0, 0);
    }
    this.cameraTargetPos = this.getPresetCameraPosition(this.currentPreset);
    this.cameraTargetLook = target;

    if (this.isSoftwareGl) {
      // Snap cleanly on software GL if static, or let requestRender advance
      this.camera.position.copy(this.cameraTargetPos);
      this.controls.target.copy(this.cameraTargetLook);
      this.cameraTargetPos = null;
      this.cameraTargetLook = null;
      this.controls.update();
      this.requestRender();
    } else if (!this.continuousActive) {
      this.startContinuousLoop();
    }
  }

  public captureSnapshotDataUrl(): string {
    // Render synchronously right before toDataURL per threejs skill requirement
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public exportImage(format: 'png' | 'jpeg' = 'png', quality = 0.95): string {
    const prevBg = this.scene.background;
    if (format === 'jpeg') {
      this.scene.background = new THREE.Color(
        this.options.stageTheme === 'dark' ? 0x0b1120 : 0xf3f6fa
      );
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = this.renderer.domElement.toDataURL(mime, quality);
    this.scene.background = prevBg;
    return dataUrl;
  }

  private applyStageTheme(theme: StageTheme) {
    if (theme === 'dark') {
      const bg = 0x0b1120;
      (this.scene.background as THREE.Color).setHex(bg);
      this.hemiLight.color.setHex(0x93c5fd);
      this.hemiLight.groundColor.setHex(0x0f172a);
      this.hemiLight.intensity = 0.72;
    } else {
      const bg = 0xf3f6fa;
      (this.scene.background as THREE.Color).setHex(bg);
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0xcbd5e1);
      this.hemiLight.intensity = 0.78;
    }
  }

  private disposeMoleculeResources() {
    while (this.moleculeGroup.children.length > 0) {
      this.moleculeGroup.remove(this.moleculeGroup.children[0]);
    }
    for (const g of this.disposableGeometries) {
      g.dispose();
    }
    for (const m of this.disposableMaterials) {
      m.dispose();
    }
    this.disposableGeometries = [];
    this.disposableMaterials = [];
    this.atomRigs.clear();
    this.bondRigs = [];
    this.hitTargets = [];
  }

  private rebuildMoleculeMeshes() {
    const prevPositions = new Map<string, THREE.Vector3>();
    for (const [id, rig] of this.atomRigs.entries()) {
      prevPositions.set(id, rig.currentPos.clone());
    }

    this.disposeMoleculeResources();
    const mol = this.currentMolecule;
    if (!mol || mol.atoms.length === 0) return;

    const rep = this.options.representation;
    const isWireframe = rep === 'wireframe';
    const isSpaceFilling = rep === 'space_filling';

    // Shared geometries for composite atom & bond parts
    const unitSphereGeo = new THREE.SphereGeometry(1, 32, 24);
    const unitCollarGeo = new THREE.TorusGeometry(1.14, 0.055, 12, 36);
    const unitReticleGeo = new THREE.TorusGeometry(1.38, 0.045, 10, 40);
    const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1);
    const unitFerruleGeo = new THREE.CylinderGeometry(1.28, 1.38, 0.09, 20, 1);
    const unitPiRingGeo = new THREE.TorusGeometry(0.18, 0.022, 10, 28);
    this.disposableGeometries.push(
      unitSphereGeo,
      unitCollarGeo,
      unitReticleGeo,
      unitCylGeo,
      unitFerruleGeo,
      unitPiRingGeo
    );

    // Lone pair teardrop geometry via LatheGeometry
    const lobePoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.12, 0.14),
      new THREE.Vector2(0.22, 0.34),
      new THREE.Vector2(0.19, 0.52),
      new THREE.Vector2(0.0, 0.62),
    ];
    const lobeGeo = new THREE.LatheGeometry(lobePoints, 20);
    this.disposableGeometries.push(lobeGeo);

    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.82,
      roughness: 0.22,
    });
    const ferruleMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.86,
      roughness: 0.18,
    });
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
    });
    const bondSelectMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const lobeMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.05,
      roughness: 0.15,
      clearcoat: 0.9,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    const electronShellMat = new THREE.MeshPhysicalMaterial({
      color: 0x60a5fa,
      metalness: 0.0,
      roughness: 0.25,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    electronShellMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        transformed += normal * (sin(position.x * 5.0 + position.y * 5.0) * 0.025);
        `
      );
    };

    this.disposableMaterials.push(
      collarMat,
      ferruleMat,
      reticleMat,
      bondSelectMat,
      lobeMat,
      electronShellMat
    );

    // Per-element PBR materials cache
    const elementMatCache = new Map<ElementSymbol, THREE.MeshPhysicalMaterial>();
    const getElementMat = (el: ElementSymbol) => {
      if (!elementMatCache.has(el)) {
        const spec = ELEMENTS[el] ?? ELEMENTS.C;
        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(spec.cpkColor),
          roughness: spec.roughness,
          metalness: spec.metalness,
          roughnessMap: this.textures.brushedRoughnessMap,
          clearcoat: 0.65,
          clearcoatRoughness: 0.18,
        });
        elementMatCache.set(el, mat);
        this.disposableMaterials.push(mat);
      }
      return elementMatCache.get(el)!;
    };

    // Build Composite Multi-Part Atom Groups
    for (const atom of mol.atoms) {
      const spec = ELEMENTS[atom.element] ?? ELEMENTS.C;
      const analysis = this.currentMetrics?.atomAnalyses[atom.id];
      const baseRadius = isSpaceFilling
        ? spec.vdwRadius * 0.82
        : isWireframe
        ? 0.16
        : Math.max(0.24, spec.covalentRadius * 0.46);

      const group = new THREE.Group();
      const targetPos = new THREE.Vector3(atom.x3d, atom.y3d, atom.z3d);
      const prev = prevPositions.get(atom.id);
      const currentPos = prev ? prev.clone() : targetPos.clone();
      group.position.copy(currentPos);

      // Part 1: Primary atomic shell
      const coreMesh = new THREE.Mesh(unitSphereGeo, getElementMat(atom.element));
      coreMesh.scale.setScalar(baseRadius);
      coreMesh.castShadow = !this.isSoftwareGl;
      coreMesh.receiveShadow = !this.isSoftwareGl;
      group.add(coreMesh);

      // Part 2: Equatorial hybridization collar ring
      const collarMesh = new THREE.Mesh(unitCollarGeo, collarMat);
      collarMesh.scale.setScalar(baseRadius);
      if (analysis?.hybridization === 'sp2') {
        collarMesh.rotation.x = Math.PI / 2;
      } else if (analysis?.hybridization === 'sp') {
        collarMesh.rotation.y = Math.PI / 2;
      } else {
        collarMesh.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      }
      collarMesh.visible = !isSpaceFilling && !isWireframe;
      group.add(collarMesh);

      // Part 3: Selection / Hover reticle halo
      const reticleGroup = new THREE.Group();
      const reticleRing = new THREE.Mesh(unitReticleGeo, reticleMat);
      reticleRing.scale.setScalar(baseRadius);
      reticleGroup.add(reticleRing);
      reticleGroup.visible = false;
      group.add(reticleGroup);

      // Part 4: Lone-pair / orbital lobes when enabled
      let lobeGroup: THREE.Group | null = null;
      if (this.options.showOrbitals && analysis && analysis.lonePairs > 0) {
        lobeGroup = new THREE.Group();
        for (let lp = 0; lp < Math.min(3, analysis.lonePairs); lp++) {
          const lobe = new THREE.Mesh(lobeGeo, lobeMat);
          const angle = (lp * Math.PI * 2) / Math.max(1, analysis.lonePairs);
          lobe.rotation.set(Math.PI / 3, angle, 0);
          lobe.position.set(
            Math.sin(angle) * baseRadius * 0.7,
            baseRadius * 0.65,
            Math.cos(angle) * baseRadius * 0.7
          );

          // Dedicated hit proxy for lone pair on Layer 1
          const lobeHitProxy = new THREE.Mesh(
            unitSphereGeo,
            new THREE.MeshBasicMaterial({ visible: false })
          );
          lobeHitProxy.scale.setScalar(0.42);
          lobeHitProxy.position.set(0, 0.32, 0);
          lobeHitProxy.layers.set(1);
          lobeHitProxy.userData = {
            type: 'lone_pair',
            atomId: atom.id,
            lobeIndex: lp,
          };
          lobe.add(lobeHitProxy);
          this.hitTargets.push(lobeHitProxy);
          this.disposableMaterials.push(lobeHitProxy.material as THREE.Material);

          lobeGroup.add(lobe);
        }
        group.add(lobeGroup);
      }

      // Part 5: Translucent electron density envelope
      let shellMesh: THREE.Mesh | null = null;
      if (this.options.showElectronShell) {
        shellMesh = new THREE.Mesh(unitSphereGeo, electronShellMat);
        shellMesh.scale.setScalar(spec.vdwRadius * 0.92);
        shellMesh.renderOrder = 6;
        group.add(shellMesh);
      }

      // Invisible raycast hit proxy on Layer 1
      const hitProxy = new THREE.Mesh(
        unitSphereGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      this.disposableMaterials.push(hitProxy.material as THREE.Material);
      hitProxy.scale.setScalar(Math.max(0.45, baseRadius * 1.25));
      hitProxy.layers.set(1);
      hitProxy.userData = {
        type: 'atom',
        atomId: atom.id,
      };
      group.add(hitProxy);
      this.hitTargets.push(hitProxy);

      this.moleculeGroup.add(group);
      this.atomRigs.set(atom.id, {
        atomId: atom.id,
        element: atom.element,
        group,
        coreMesh,
        collarMesh,
        reticleGroup,
        lobeGroup,
        shellMesh,
        hitProxy,
        currentPos,
        targetPos,
        baseRadius,
        vdwRadius: spec.vdwRadius,
      });
    }

    // Build Composite Multi-Part Covalent Bond Groups
    for (const bond of mol.bonds) {
      const rigA = this.atomRigs.get(bond.from);
      const rigB = this.atomRigs.get(bond.to);
      if (!rigA || !rigB) continue;

      const bondGroup = new THREE.Group();
      const matA = getElementMat(rigA.element);
      const matB = getElementMat(rigB.element);

      const stickRadius = isWireframe ? 0.055 : bond.order === 1 ? 0.095 : 0.068;

      if (bond.order === 1 || isWireframe) {
        // Two half-cylinders colored by each atom + two machined metallic junction ferrules
        const halfA = new THREE.Mesh(unitCylGeo, matA);
        halfA.name = 'halfA';
        halfA.castShadow = !this.isSoftwareGl;
        bondGroup.add(halfA);

        const halfB = new THREE.Mesh(unitCylGeo, matB);
        halfB.name = 'halfB';
        halfB.castShadow = !this.isSoftwareGl;
        bondGroup.add(halfB);

        if (!isWireframe) {
          const ferA = new THREE.Mesh(unitFerruleGeo, ferruleMat);
          ferA.name = 'ferA';
          ferA.scale.set(stickRadius, 1, stickRadius);
          bondGroup.add(ferA);

          const ferB = new THREE.Mesh(unitFerruleGeo, ferruleMat);
          ferB.name = 'ferB';
          ferB.scale.set(stickRadius, 1, stickRadius);
          bondGroup.add(ferB);
        }
      } else if (bond.order === 2) {
        // Parallel sigma + pi rods + central pi-cloud collar ring
        for (let strand = 0; strand < 2; strand++) {
          const hA = new THREE.Mesh(unitCylGeo, matA);
          hA.name = `doubleA_${strand}`;
          hA.castShadow = !this.isSoftwareGl;
          bondGroup.add(hA);

          const hB = new THREE.Mesh(unitCylGeo, matB);
          hB.name = `doubleB_${strand}`;
          hB.castShadow = !this.isSoftwareGl;
          bondGroup.add(hB);
        }
        const piRing = new THREE.Mesh(unitPiRingGeo, ferruleMat);
        piRing.name = 'piRing';
        piRing.rotation.x = Math.PI / 2;
        bondGroup.add(piRing);
      } else {
        // Triple bond: tri-axial cylinder bundle + dual stabilizing collar rings
        for (let strand = 0; strand < 3; strand++) {
          const hA = new THREE.Mesh(unitCylGeo, matA);
          hA.name = `tripleA_${strand}`;
          hA.castShadow = !this.isSoftwareGl;
          bondGroup.add(hA);

          const hB = new THREE.Mesh(unitCylGeo, matB);
          hB.name = `tripleB_${strand}`;
          hB.castShadow = !this.isSoftwareGl;
          bondGroup.add(hB);
        }
        const ring1 = new THREE.Mesh(unitPiRingGeo, ferruleMat);
        ring1.name = 'tripleRing1';
        ring1.rotation.x = Math.PI / 2;
        bondGroup.add(ring1);

        const ring2 = new THREE.Mesh(unitPiRingGeo, ferruleMat);
        ring2.name = 'tripleRing2';
        ring2.rotation.x = Math.PI / 2;
        bondGroup.add(ring2);
      }

      // Bond hit proxy on Layer 1 (for direct 3D bond selection)
      const hitProxy = new THREE.Mesh(
        unitCylGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxy.layers.set(1);
      hitProxy.userData = { type: 'bond', bondId: bond.id };
      bondGroup.add(hitProxy);
      this.hitTargets.push(hitProxy);
      this.disposableMaterials.push(hitProxy.material as THREE.Material);

      // Bond selection highlight sleeve
      const selectionIndicator = new THREE.Mesh(unitCylGeo, bondSelectMat);
      selectionIndicator.name = 'selectionIndicator';
      selectionIndicator.visible = false;
      bondGroup.add(selectionIndicator);

      bondGroup.visible = !isSpaceFilling;
      this.moleculeGroup.add(bondGroup);
      this.bondRigs.push({ bond, group: bondGroup, hitProxy, selectionIndicator });
    }

    this.updateHighlightStates();
    this.updateBondTransforms();
  }

  private updateHighlightStates() {
    for (const [id, rig] of this.atomRigs.entries()) {
      const isSelected = id === this.options.selectedAtomId;
      const isHovered = id === this.options.hoveredAtomId;
      rig.reticleGroup.visible = isSelected || isHovered;
      const pulseScale = isSelected ? 1.12 : isHovered ? 1.05 : 1.0;
      rig.coreMesh.scale.setScalar(rig.baseRadius * pulseScale);

      // Highlight selected lone pair lobe
      if (rig.lobeGroup) {
        rig.lobeGroup.children.forEach((child, idx) => {
          if (child instanceof THREE.Mesh) {
            const isLpSelected =
              this.options.selectedLonePair?.atomId === id &&
              this.options.selectedLonePair?.lobeIndex === idx;
            child.scale.setScalar(isLpSelected ? 1.35 : 1.0);
          }
        });
      }
    }

    for (const rig of this.bondRigs) {
      const isSelected = rig.bond.id === this.options.selectedBondId;
      const isHovered = rig.bond.id === this.options.hoveredBondId;
      rig.selectionIndicator.visible = isSelected || isHovered;
      if (rig.selectionIndicator.material instanceof THREE.MeshBasicMaterial) {
        rig.selectionIndicator.material.opacity = isSelected ? 0.75 : 0.4;
      }
    }
  }

  /**
   * Aligns all multi-part covalent bond assemblies between current atom positions (zero GC).
   */
  private updateBondTransforms() {
    const rep = this.options.representation;
    if (rep === 'space_filling') return;

    const isWireframe = rep === 'wireframe';
    const exp = this.currentExploded;

    for (const { bond, group } of this.bondRigs) {
      const rigA = this.atomRigs.get(bond.from);
      const rigB = this.atomRigs.get(bond.to);
      if (!rigA || !rigB) continue;

      _vec3A.copy(rigA.currentPos).multiplyScalar(exp);
      _vec3B.copy(rigB.currentPos).multiplyScalar(exp);

      _vec3Dir.subVectors(_vec3B, _vec3A);
      const len = _vec3Dir.length();
      if (len < 0.001) {
        group.visible = false;
        continue;
      }
      group.visible = true;

      _vec3Mid.addVectors(_vec3A, _vec3B).multiplyScalar(0.5);
      group.position.copy(_vec3Mid);

      _vec3Dir.divideScalar(len);
      _quatA.setFromUnitVectors(_upVec, _vec3Dir);
      group.quaternion.copy(_quatA);

      const halfLen = len * 0.5;
      const stickRadius = isWireframe ? 0.055 : bond.order === 1 ? 0.095 : 0.064;

      if (bond.order === 1 || isWireframe) {
        const halfA = group.getObjectByName('halfA') as THREE.Mesh | undefined;
        const halfB = group.getObjectByName('halfB') as THREE.Mesh | undefined;
        if (halfA && halfB) {
          halfA.scale.set(stickRadius, halfLen, stickRadius);
          halfA.position.set(0, -halfLen * 0.5, 0);
          halfB.scale.set(stickRadius, halfLen, stickRadius);
          halfB.position.set(0, halfLen * 0.5, 0);
        }
        const ferA = group.getObjectByName('ferA') as THREE.Mesh | undefined;
        const ferB = group.getObjectByName('ferB') as THREE.Mesh | undefined;
        if (ferA && ferB) {
          const offsetA = Math.min(halfLen * 0.65, rigA.baseRadius * 0.92);
          const offsetB = Math.min(halfLen * 0.65, rigB.baseRadius * 0.92);
          ferA.position.set(0, -halfLen + offsetA, 0);
          ferB.position.set(0, halfLen - offsetB, 0);
        }
      } else if (bond.order === 2) {
        const sep = 0.105;
        for (let s = 0; s < 2; s++) {
          const xOff = s === 0 ? -sep : sep;
          const hA = group.getObjectByName(`doubleA_${s}`) as THREE.Mesh | undefined;
          const hB = group.getObjectByName(`doubleB_${s}`) as THREE.Mesh | undefined;
          if (hA && hB) {
            hA.scale.set(stickRadius, halfLen, stickRadius);
            hA.position.set(xOff, -halfLen * 0.5, 0);
            hB.scale.set(stickRadius, halfLen, stickRadius);
            hB.position.set(xOff, halfLen * 0.5, 0);
          }
        }
        const piRing = group.getObjectByName('piRing') as THREE.Mesh | undefined;
        if (piRing) {
          piRing.position.set(0, 0, 0);
        }
      } else {
        const rTri = 0.115;
        for (let s = 0; s < 3; s++) {
          const ang = (s * Math.PI * 2) / 3;
          const xOff = Math.cos(ang) * rTri;
          const zOff = Math.sin(ang) * rTri;
          const hA = group.getObjectByName(`tripleA_${s}`) as THREE.Mesh | undefined;
          const hB = group.getObjectByName(`tripleB_${s}`) as THREE.Mesh | undefined;
          if (hA && hB) {
            hA.scale.set(stickRadius * 0.88, halfLen, stickRadius * 0.88);
            hA.position.set(xOff, -halfLen * 0.5, zOff);
            hB.scale.set(stickRadius * 0.88, halfLen, stickRadius * 0.88);
            hB.position.set(xOff, halfLen * 0.5, zOff);
          }
        }
        const r1 = group.getObjectByName('tripleRing1') as THREE.Mesh | undefined;
        const r2 = group.getObjectByName('tripleRing2') as THREE.Mesh | undefined;
        if (r1 && r2) {
          r1.position.set(0, -halfLen * 0.35, 0);
          r2.position.set(0, halfLen * 0.35, 0);
        }
      }

      // Update hit proxy and selection sleeve
      const selIndicator = group.getObjectByName('selectionIndicator') as THREE.Mesh | undefined;
      if (selIndicator) {
        selIndicator.scale.set(stickRadius * 2.2, len * 0.98, stickRadius * 2.2);
        selIndicator.position.set(0, 0, 0);
      }
      const bondHit = group.children.find(
        (c) => c.userData?.type === 'bond'
      ) as THREE.Mesh | undefined;
      if (bondHit) {
        bondHit.scale.set(Math.max(0.3, stickRadius * 3.2), len, Math.max(0.3, stickRadius * 3.2));
        bondHit.position.set(0, 0, 0);
      }
    }
  }

  private bindEvents() {
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';

    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownClient.x = e.clientX;
      this.pointerDownClient.y = e.clientY;
      if (dom.setPointerCapture) {
        try {
          dom.setPointerCapture(e.pointerId);
        } catch {
          // ignore pointer capture errors
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dom.releasePointerCapture) {
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }

      const dist = Math.hypot(
        e.clientX - this.pointerDownClient.x,
        e.clientY - this.pointerDownClient.y
      );
      if (dist > 6) return; // User was orbiting, not clicking an atom or bond

      const rect = dom.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.hitTargets, false);
      if (hits.length > 0) {
        const u = hits[0].object.userData;
        if (u.type === 'bond') {
          this.onSelectBond?.(u.bondId);
          this.onSelectAtom?.(null);
          this.onSelectLonePair?.(null);
        } else if (u.type === 'lone_pair') {
          this.onSelectLonePair?.({ atomId: u.atomId, lobeIndex: u.lobeIndex });
          this.onSelectAtom?.(u.atomId);
          this.onSelectBond?.(null);
        } else {
          const atomId = u.atomId as string;
          this.onSelectAtom?.(atomId);
          this.onSelectBond?.(null);
          this.onSelectLonePair?.(null);
        }
      } else {
        this.onSelectAtom?.(null);
        this.onSelectBond?.(null);
        this.onSelectLonePair?.(null);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - this.lastHoverRaycast < 50) return;
      this.lastHoverRaycast = now;

      const rect = dom.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.hitTargets, false);
      if (hits.length > 0) {
        const u = hits[0].object.userData;
        dom.style.cursor = 'pointer';
        if (u.type === 'bond') {
          if (u.bondId !== this.options.hoveredBondId) {
            this.onHoverBond?.(u.bondId);
            this.onHoverAtom?.(null);
          }
        } else if (u.type === 'lone_pair') {
          if (u.atomId !== this.options.hoveredAtomId) {
            this.onHoverAtom?.(u.atomId);
            this.onHoverBond?.(null);
          }
        } else {
          const atomId = u.atomId as string;
          if (atomId !== this.options.hoveredAtomId) {
            this.onHoverAtom?.(atomId);
            this.onHoverBond?.(null);
          }
        }
      } else {
        dom.style.cursor = 'grab';
        if (this.options.hoveredAtomId) this.onHoverAtom?.(null);
        if (this.options.hoveredBondId) this.onHoverBond?.(null);
      }
    };

    /**
     * Trackpad gestures:
     * - Trackpad 2-finger scroll (wheel without Ctrl, or with Shift/Alt): smoothly rotates the 3D structure!
     * - Trackpad pinch (wheel with Ctrl, which browsers dispatch for pinch-zoom): smoothly zooms in/out!
     */
    const onWheel = (e: WheelEvent) => {
      // If user pinches on trackpad (Ctrl key set by browser) or uses Cmd/Meta, let OrbitControls handle zoom
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      // Trackpad two-finger scroll -> 3D camera orbit rotation
      e.preventDefault();
      e.stopPropagation();

      this.cameraTargetPos = null;
      this.cameraTargetLook = null;
      this.userMovedCamera = true;

      const sensitivity = 0.0035;
      const deltaX = e.deltaX || 0;
      const deltaY = e.deltaY || 0;

      // Rotate camera left/right around Y axis and up/down around pitch axis
      this.controls.rotateLeft(deltaX * sensitivity);
      this.controls.rotateUp(deltaY * sensitivity);
      this.requestRender();
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = Math.max(300, this.container.clientWidth);
      const h = Math.max(240, this.container.clientHeight);
      if (w === this.lastWidth && h === this.lastHeight) {
        return;
      }
      this.lastWidth = w;
      this.lastHeight = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (!this.userMovedCamera && this.atomRigs.size > 0) {
        this.camera.position.copy(this.getPresetCameraPosition(this.currentPreset));
        this.controls.target.set(0, -0.22, 0);
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.requestRender();
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(this.container);

    this.cleanupListeners = () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
    };
  }

  private cleanupListeners: () => void = () => {};

  /**
   * Coalesced on-demand render with software-WebGL afterDraw() pacing.
   */
  public requestRender() {
    if (this.disposed || this.continuousActive) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.rafId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      this.stepSimulation(0.016);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty && !this.disposed) {
          this.requestRender();
        }
      };
      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  }

  private startContinuousLoop() {
    if (this.disposed || this.continuousActive) return;
    this.continuousActive = true;
    this.lastTickTime = performance.now();

    const tick = () => {
      if (this.disposed || !this.continuousActive) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTickTime) / 1000));
      this.lastTickTime = now;

      const stillTransitioning = this.stepSimulation(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      const shouldContinue =
        this.options.motionMode !== 'static' || stillTransitioning;
      if (!shouldContinue) {
        this.continuousActive = false;
        return;
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.rafId = requestAnimationFrame(tick);
    }
  }

  private stepSimulation(dt: number): boolean {
    let anyActive = false;
    this.elapsedSimTime += dt;

    // 1. Exponential damping on exploded bond expansion
    const expDiff = Math.abs(this.currentExploded - this.options.explodedFactor);
    if (expDiff > 0.002) {
      this.currentExploded = THREE.MathUtils.damp(
        this.currentExploded,
        this.options.explodedFactor,
        9,
        dt
      );
      anyActive = true;
    } else {
      this.currentExploded = this.options.explodedFactor;
    }

    // 2. Exponential damping on atom positions + optional vibrational normal mode
    const vibrate = this.options.motionMode === 'vibrate';
    let idx = 0;
    for (const rig of this.atomRigs.values()) {
      const dist = rig.currentPos.distanceTo(rig.targetPos);
      if (dist > 0.002) {
        rig.currentPos.x = THREE.MathUtils.damp(rig.currentPos.x, rig.targetPos.x, 11, dt);
        rig.currentPos.y = THREE.MathUtils.damp(rig.currentPos.y, rig.targetPos.y, 11, dt);
        rig.currentPos.z = THREE.MathUtils.damp(rig.currentPos.z, rig.targetPos.z, 11, dt);
        anyActive = true;
      } else {
        rig.currentPos.copy(rig.targetPos);
      }

      _vec3C.copy(rig.currentPos).multiplyScalar(this.currentExploded);
      if (vibrate) {
        const phase = this.elapsedSimTime * 9.5 + idx * 1.37;
        _vec3C.x += Math.sin(phase) * 0.032;
        _vec3C.y += Math.cos(phase * 1.15) * 0.032;
        _vec3C.z += Math.sin(phase * 0.85) * 0.025;
      }
      rig.group.position.copy(_vec3C);

      if (rig.reticleGroup.visible) {
        rig.reticleGroup.rotation.z += dt * 1.2;
      }
      idx++;
    }

    this.updateBondTransforms();

    // 3. Spin mode rotation
    if (this.options.motionMode === 'spin') {
      this.moleculeGroup.rotation.y += dt * 0.65;
    }

    // 4. Exponential damping for scripted camera presets
    if (this.cameraTargetPos && this.cameraTargetLook) {
      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        this.cameraTargetPos.x,
        7,
        dt
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        this.cameraTargetPos.y,
        7,
        dt
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        this.cameraTargetPos.z,
        7,
        dt
      );
      this.controls.target.x = THREE.MathUtils.damp(
        this.controls.target.x,
        this.cameraTargetLook.x,
        7,
        dt
      );
      this.controls.target.y = THREE.MathUtils.damp(
        this.controls.target.y,
        this.cameraTargetLook.y,
        7,
        dt
      );
      this.controls.target.z = THREE.MathUtils.damp(
        this.controls.target.z,
        this.cameraTargetLook.z,
        7,
        dt
      );

      if (
        this.camera.position.distanceTo(this.cameraTargetPos) < 0.03 &&
        this.controls.target.distanceTo(this.cameraTargetLook) < 0.03
      ) {
        this.camera.position.copy(this.cameraTargetPos);
        this.controls.target.copy(this.cameraTargetLook);
        this.cameraTargetPos = null;
        this.cameraTargetLook = null;
      } else {
        anyActive = true;
      }
    }

    return anyActive;
  }

  /**
   * Software-WebGL GPU fenceSync + 80ms cooldown pacing so SwiftShader never starves the event loop.
   */
  private afterDraw(cb: () => void) {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.timeoutId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.timeoutId = window.setTimeout(cb, 80);
        }
      };
      this.timeoutId = window.setTimeout(poll, 5);
    } catch {
      this.timeoutId = window.setTimeout(cb, 85);
    }
  }

  public dispose() {
    this.disposed = true;
    this.continuousActive = false;
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.timeoutId);
    this.cleanupListeners();
    this.disposeMoleculeResources();
    this.controls.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
