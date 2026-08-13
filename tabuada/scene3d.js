import * as THREE from "../assets/vendor/three/three.module.min.js";

const canvas = document.querySelector("#mundo3d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(56, 1, .08, 150);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .94;

const hemi = new THREE.HemisphereLight(0xd8edff, 0x25283a, 1.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d2, 2.2);
sun.position.set(-7, 12, -5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -11; sun.shadow.camera.right = 11;
sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -3;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 34;
scene.add(sun);

const world = new THREE.Group();
const roadLayer = new THREE.Group();
const sceneryLayer = new THREE.Group();
const gatesLayer = new THREE.Group();
const itemLayer = new THREE.Group();
const playerLayer = new THREE.Group();
world.add(roadLayer, sceneryLayer, gatesLayer, itemLayer, playerLayer);
scene.add(world);

const materialCache = new Map();
const gateMaterialCache = new Map();
const panelMaterialCache = new Map();
const mat = (color, options = {}) => {
  const key = `${color}:${options.emissive || ""}:${options.metalness || 0}:${options.roughness ?? .68}:${options.transparent || false}:${options.opacity ?? 1}:${options.depthWrite ?? true}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: options.roughness ?? .68, metalness: options.metalness || 0,
      emissive: options.emissive || 0x000000, emissiveIntensity: options.emissive ? .62 : 0,
      transparent: !!options.transparent, opacity: options.opacity ?? 1,
      depthWrite: options.depthWrite ?? true,
    }));
  }
  return materialCache.get(key);
};
const gateMat = (color) => {
  if (!gateMaterialCache.has(color)) gateMaterialCache.set(color, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  return gateMaterialCache.get(color);
};
const panelMat = (color) => {
  if (!panelMaterialCache.has(color)) panelMaterialCache.set(color, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: .075, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }));
  return panelMaterialCache.get(color);
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
const coneGeo = new THREE.ConeGeometry(1, 1, 16);
const sphereGeo = new THREE.SphereGeometry(1, 24, 14);
const wheelGeo = new THREE.CylinderGeometry(.34, .34, .3, 20);
wheelGeo.rotateZ(Math.PI / 2);
const wheelHubGeo = new THREE.CylinderGeometry(.17, .17, .315, 16);
wheelHubGeo.rotateZ(Math.PI / 2);
const gatePostGeo = new THREE.CapsuleGeometry(.052, 1.98, 5, 12);
const gateBeamGeo = new THREE.CapsuleGeometry(.052, 1.02, 5, 12);
const gatePanelGeo = new THREE.PlaneGeometry(1.08, 2.02);

function mesh(geometry, material, position, scale, parent, shadows = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position); m.scale.set(...scale);
  m.castShadow = shadows; m.receiveShadow = shadows;
  (parent || world).add(m);
  return m;
}

function roundedBody(material, position, scale, parent) {
  const body = mesh(sphereGeo, material, position, scale, parent);
  body.geometry.computeVertexNormals();
  return body;
}

function loftGeometry(sections) {
  const positions = [];
  const faces = [];
  const addQuad = (a, b, c, d) => faces.push(a, b, c, a, c, d);
  for (const [z, halfWidth, bottom, top] of sections) {
    positions.push(-halfWidth, bottom, z, halfWidth, bottom, z, halfWidth, top, z, -halfWidth, top, z);
  }
  for (let i = 0; i < sections.length - 1; i++) {
    const a = i * 4, b = (i + 1) * 4;
    addQuad(a, a + 1, b + 1, b);
    addQuad(a + 1, a + 2, b + 2, b + 1);
    addQuad(a + 2, a + 3, b + 3, b + 2);
    addQuad(a + 3, a, b, b + 3);
  }
  faces.push(0, 2, 1, 0, 3, 2);
  const end = (sections.length - 1) * 4;
  faces.push(end, end + 1, end + 2, end, end + 2, end + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(faces); geometry.computeVertexNormals();
  return geometry;
}

function cabinGeometry() {
  const positions = [
    -.76, .75, -.78, .76, .75, -.78, .76, .75, .64, -.76, .75, .64,
    -.5, 1.42, -.4, .5, 1.42, -.4, .5, 1.42, .22, -.5, 1.42, .22,
  ];
  const faces = [
    0,1,5, 0,5,4, 1,2,6, 1,6,5, 2,3,7, 2,7,6, 3,0,4, 3,4,7,
    4,5,6, 4,6,7, 0,3,2, 0,2,1,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(faces); geometry.computeVertexNormals();
  return geometry;
}

function createCar(color) {
  const g = new THREE.Group();
  const bodyRig = new THREE.Group(); g.add(bodyRig);
  const paint = mat(color, { metalness: .38, roughness: .3 });
  const paintLight = mat(tint(color, .085), { metalness: .32, roughness: .28 });
  const dark = mat("#0d1420", { metalness: .42, roughness: .34 });
  const glass = mat("#123e59", { metalness: .25, roughness: .13 });
  const rubber = mat("#080b10", { roughness: .95 });
  const metal = mat("#aeb9c6", { metalness: .88, roughness: .18 });
  const red = mat("#ff334f", { emissive: "#8d1028", roughness: .22 });
  const white = mat("#eff8ff", { emissive: "#637581", roughness: .2 });

  mesh(boxGeo, dark, [0, .22, -.02], [2.18, .18, 3.32], bodyRig);
  mesh(loftGeometry([
    [-1.68, .98, .3, .69], [-1.18, 1.1, .29, .84],
    [.46, 1.08, .3, .82], [1.28, .96, .29, .67], [1.66, .7, .3, .54],
  ]), paint, [0, 0, 0], [1, 1, 1], bodyRig);
  mesh(cabinGeometry(), glass, [0, 0, 0], [1, 1, 1], bodyRig);
  // Teto escuro integra a cabine à silhueta; a antiga placa clara parecia
  // uma caixa apoiada em cima do carro quando vista pela câmera baixa.
  mesh(boxGeo, dark, [0, 1.43, -.08], [.98, .045, .6], bodyRig);
  mesh(boxGeo, paintLight, [0, .88, -.94], [1.78, .12, .55], bodyRig);
  mesh(boxGeo, dark, [0, .48, -1.705], [1.75, .38, .055], bodyRig);

  for (const x of [-.61, .61]) {
    mesh(boxGeo, red, [x, .67, -1.74], [.54, .12, .035], bodyRig, false);
    mesh(boxGeo, white, [x, .61, 1.57], [.42, .1, .035], bodyRig, false);
    const exhaust = mesh(new THREE.CylinderGeometry(.075, .075, .16, 12), metal, [x * .72, .24, -1.77], [1, 1, 1], bodyRig);
    exhaust.rotation.x = Math.PI / 2;
  }
  mesh(boxGeo, metal, [0, .43, -1.75], [.42, .1, .035], bodyRig, false);
  mesh(boxGeo, dark, [0, .2, -1.76], [1.74, .18, .18], bodyRig);

  const wing = mesh(boxGeo, dark, [0, 1.17, -1.42], [1.8, .065, .24], bodyRig);
  wing.rotation.x = -.08;
  for (const x of [-.58, .58]) mesh(boxGeo, dark, [x, .94, -1.37], [.055, .43, .08], bodyRig);

  const wheels = [], frontWheels = [];
  for (const x of [-1.02, 1.02]) for (const z of [-1.03, 1.08]) {
    const carrier = new THREE.Group(); carrier.position.set(x, .3, z); g.add(carrier);
    const wheel = mesh(wheelGeo, rubber, [0, 0, 0], [1, 1, 1], carrier); wheels.push(wheel);
    mesh(wheelHubGeo, metal, [x > 0 ? .012 : -.012, 0, 0], [1, 1, 1], carrier);
    for (let i = 0; i < 5; i++) {
      const spoke = mesh(boxGeo, dark, [x > 0 ? .175 : -.175, 0, 0], [.025, .045, .23], carrier, false);
      spoke.rotation.x = i * Math.PI / 5;
    }
    if (z > 0) frontWheels.push(carrier);
  }
  g.userData = { type: "carro", wheels, frontWheels, bodyRig, wheelSpin: 0, steer: 0 };
  return g;
}

function triangleGeometry(points) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  geo.computeVertexNormals();
  return geo;
}

function createRocket(color) {
  const g = new THREE.Group();
  const body = mat("#dce5ee", { metalness: .58, roughness: .27 });
  const accent = mat(color, { metalness: .25, roughness: .34 });
  const dark = mat("#293544", { metalness: .55, roughness: .3 });
  mesh(new THREE.CylinderGeometry(.55, .68, 2.65, 24), body, [0, 1.65, 0], [1, 1, 1], g);
  mesh(new THREE.ConeGeometry(.55, 1.2, 24), accent, [0, 3.55, 0], [1, 1, 1], g);
  mesh(new THREE.TorusGeometry(.64, .08, 8, 24), dark, [0, .38, 0], [1, 1, 1], g).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(.59, .035, 8, 24), dark, [0, 2.75, 0], [1, 1, 1], g).rotation.x = Math.PI / 2;
  const windowFrame = mesh(new THREE.CylinderGeometry(.31, .31, .12, 20), dark, [0, 2.05, -.59], [1, 1, 1], g);
  windowFrame.rotation.x = Math.PI / 2;
  const windowGlass = mesh(new THREE.SphereGeometry(.25, 20, 12), mat("#24b9ed", { metalness: .15, roughness: .08 }), [0, 2.05, -.67], [1, 1, .3], g);
  const finGeo = triangleGeometry([[0, .85, 0], [.82, -.05, .05], [0, -.05, .62]]);
  for (const side of [-1, 1]) {
    const fin = mesh(finGeo, accent, [side * .38, .62, 0], [side, 1, 1], g);
    fin.material.side = THREE.DoubleSide;
  }
  const flame = mesh(new THREE.ConeGeometry(.34, 1.25, 18), mat("#ff8c21", { emissive: "#ff5a13" }), [0, -.38, 0], [1, 1, 1], g, false);
  flame.rotation.x = Math.PI;
  const core = mesh(new THREE.ConeGeometry(.15, .85, 16), mat("#fff1a6", { emissive: "#ffc329" }), [0, -.26, 0], [1, 1, 1], g, false);
  core.rotation.x = Math.PI;
  g.userData = { type: "foguete", flame, core, windowGlass };
  return g;
}

function createMascot(color) {
  const g = new THREE.Group();
  const skin = mat("#ffd6ae", { roughness: .72 });
  mesh(new THREE.CapsuleGeometry(.42, .65, 6, 14), mat(color, { roughness: .52 }), [0, .75, 0], [1, 1, 1], g);
  mesh(sphereGeo, skin, [0, 1.65, 0], [.55, .58, .55], g);
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(.1, .62, 4, 10), skin, [side * .48, .88, 0], [1, 1, 1], g); arm.rotation.z = side * .25; limbs.push(arm);
    const leg = mesh(new THREE.CapsuleGeometry(.12, .62, 4, 10), mat("#273148"), [side * .23, .08, 0], [1, 1, 1], g); limbs.push(leg);
    mesh(sphereGeo, mat("#201a18"), [side * .19, 1.72, -.5], [.07, .09, .06], g, false);
  }
  g.userData = { type: "mascote", limbs };
  return g;
}

function createBanana() {
  const g = new THREE.Group();
  const yellow = mat("#ffd93b", { roughness: .42 });
  const body = mesh(new THREE.TorusGeometry(.72, .22, 14, 32, Math.PI * 1.42), yellow, [0, 1.08, 0], [1, 1, 1], g);
  body.rotation.z = -.72; body.rotation.y = .18;
  const limbs = [];
  for (const side of [-1, 1]) {
    const shoe = mesh(sphereGeo, mat("#f8f8ff"), [side * .35, .2, 0], [.3, .13, .42], g); limbs.push(shoe);
    mesh(sphereGeo, mat("#241b18"), [side * .18, 1.18, -.68], [.06, .08, .05], g, false);
  }
  g.userData = { type: "mascote", limbs }; return g;
}

function createCrocodile() {
  const g = new THREE.Group();
  const green = mat("#4caf65", { roughness: .58 });
  roundedBody(green, [0, .82, 0], [.7, .48, .78], g);
  roundedBody(mat("#367c4b"), [0, .72, -.72], [.76, .3, .62], g);
  const limbs = [];
  for (const side of [-1, 1]) {
    const wing = mesh(triangleGeometry([[0,.45,0],[.9,0,.1],[0,-.18,.28]]), mat("#8ecde8"), [side*.45,.9,.2], [side,1,1], g); wing.material.side = THREE.DoubleSide; limbs.push(wing);
    mesh(sphereGeo, mat("#ffffff"), [side*.27,1.17,-.52], [.16,.18,.15], g);
    mesh(sphereGeo, mat("#161b1d"), [side*.27,1.18,-.66], [.06,.07,.04], g, false);
  }
  g.userData = { type: "mascote", limbs }; return g;
}

function createCappuccino() {
  const g = new THREE.Group();
  const cup = mat("#f1ece5", { metalness: .1, roughness: .32 });
  mesh(new THREE.CylinderGeometry(.52, .42, 1.05, 24), cup, [0,.85,0], [1,1,1], g);
  mesh(new THREE.CylinderGeometry(.47, .47, .06, 24), mat("#6f3e23"), [0,1.4,0], [1,1,1], g, false);
  const handle = mesh(new THREE.TorusGeometry(.38,.09,10,24,Math.PI*1.55), cup, [.48,.9,0], [1,1,1], g); handle.rotation.y=Math.PI/2;
  mesh(new THREE.TorusGeometry(.66,.14,10,28), mat("#ff9fc8"), [0,.38,0], [1,.46,1], g);
  const limbs=[];
  for(const side of [-1,1]) limbs.push(mesh(new THREE.CapsuleGeometry(.08,.42,4,8),mat("#f2c7aa"),[side*.28,.05,0],[1,1,1],g));
  g.userData={type:"mascote",limbs}; return g;
}

let player = null;
let playerKey = "";
function ensurePlayer(type, color) {
  const key = `${type}:${color}`;
  if (key === playerKey) return;
  if (player) playerLayer.remove(player);
  player = type === "carro" ? createCar(color)
    : type === "foguete" ? createRocket(color)
    : type === "bananella" ? createBanana()
    : type === "coccodrillo" ? createCrocodile()
    : type === "cappuccino" ? createCappuccino()
    : createMascot(color);
  playerKey = key; playerLayer.add(player);
}

const road = mesh(new THREE.PlaneGeometry(4.7, 180), mat("#31394b", { roughness: .94 }), [0, 0, 80], [1, 1, 1], roadLayer);
road.rotation.x = -Math.PI / 2; road.receiveShadow = true;
const ground = mesh(new THREE.PlaneGeometry(90, 180), mat("#443447", { roughness: 1 }), [0, -.035, 80], [1, 1, 1], roadLayer);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
const laneMarks = [];
const laneMaterial = mat("#f5f6fb", { roughness: .75 });
for (let i = 0; i < 110; i++) {
  for (const x of [-.62, .62]) laneMarks.push(mesh(boxGeo, laneMaterial, [x, .018, i * 1.72], [.045, .018, .6], roadLayer, false));
}
const edgeLeft = mesh(boxGeo, mat("#ff6fa7", { emissive: "#59213b" }), [-2.4, .035, 80], [.1, .045, 180], roadLayer, false);
const edgeRight = mesh(boxGeo, mat("#75d8ff", { emissive: "#1c4158" }), [2.4, .035, 80], [.1, .045, 180], roadLayer, false);

function hash(n) { return Math.abs(Math.sin(n * 91.733) * 43758.5453) % 1; }
function tint(color, lightness) {
  const c = new THREE.Color(color || "#4b596e"); c.offsetHSL(0, 0, lightness); return `#${c.getHexString()}`;
}
let sceneryStart = NaN;
let sceneryKind = "";
let sceneryStyleKey = "";
function rebuildScenery(start, kind, colors) {
  sceneryLayer.clear(); sceneryStart = start; sceneryKind = kind;
  sceneryStyleKey = `${colors.scenery}:${colors.sceneryDark}:${colors.ground}`;
  const horizonMat = mat(colors.ground || "#443447", { roughness: 1 });
  ground.material = horizonMat;
  for (let i = start; i < start + 14; i++) for (const side of [-1, 1]) {
    const z = i * 7.2, r = hash(i * 2.7 + side), x = side * (6 + r * 2.8);
    const g = new THREE.Group(); g.position.set(x, 0, z); sceneryLayer.add(g);
    if (kind === "cidade") {
      const h = 3.4 + r * 4.4, w = 1.55 + hash(i + 4) * 1.5, d = 1.8 + hash(i + 9) * 1.2;
      const facade = side > 0 ? tint(colors.sceneryDark, -.025) : tint(colors.scenery, -.08);
      mesh(boxGeo, mat(facade, { roughness: .82 }), [0, h / 2, 0], [w, h, d], g);
      mesh(boxGeo, mat(tint(facade, .045), { roughness: .9 }), [0, h + .08, 0], [w * .82, .16, d * .78], g);
      const windowColor = colors.window || "#ffd985";
      for (let y = 1.05; y < h - .55; y += 1.15) for (const xx of [-.28, .28]) {
        mesh(boxGeo, mat(windowColor, { emissive: tint(windowColor, -.16) }), [xx * w, y, -d / 2 - .018], [.19, .24, .025], g, false);
      }
    } else if (kind === "deserto") {
      const cactus = mat(colors.scenery || "#3e7658", { roughness: .82 });
      const altura = 1.35 + r * .8;
      mesh(cylGeo, cactus, [0, altura / 2, 0], [.24, altura, .24], g);
      mesh(cylGeo, mat(tint(colors.scenery, .035)), [side * .34, altura * .55, 0], [.13, .65, .13], g).rotation.z = side * 1.08;
      mesh(sphereGeo, mat(tint(colors.ground, -.08), { roughness: 1 }), [-side * .8, .12, .35], [.55, .15, .38], g);
    } else {
      const escala = .72 + r * .42;
      mesh(cylGeo, mat("#654838", { roughness: 1 }), [0, .55 * escala, 0], [.16 * escala, 1.1 * escala, .16 * escala], g);
      const snow = kind === "neve";
      const foliage = snow ? "#dff5fb" : (colors.scenery || "#32624a");
      mesh(coneGeo, mat(tint(foliage, -.045), { roughness: .92 }), [0, 1.45 * escala, 0], [.92 * escala, 1.65 * escala, .92 * escala], g);
      mesh(coneGeo, mat(tint(foliage, .035), { roughness: .9 }), [0, 2.18 * escala, 0], [.65 * escala, 1.45 * escala, .65 * escala], g);
    }
  }
}

function textSprite(text, color, size = 82, chip = true) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
  if (chip) {
    x.fillStyle = "rgba(10,14,25,.86)";
    x.strokeStyle = color; x.lineWidth = 5;
    x.beginPath(); x.roundRect(38, 8, 180, 112, 30); x.fill(); x.stroke();
  }
  x.font = `900 ${size}px system-ui, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = chip ? 0 : 9; x.strokeStyle = "rgba(8,10,18,.86)";
  if (!chip) x.strokeText(text, 128, 67);
  x.fillStyle = chip ? "#ffffff" : color; x.fillText(text, 128, 67);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.userData.texture = texture; return sprite;
}

let gatesKey = "";
function rebuildGates(gates, gateColors) {
  gatesLayer.traverse((o) => { if (o.userData.texture) o.userData.texture.dispose(); });
  gatesLayer.clear();
  for (const gate of gates.slice(0, 1)) {
    const g = new THREE.Group(); g.position.z = gate.z / 1000; gatesLayer.add(g);
    for (let lane = 0; lane < 3; lane++) {
      const color = gateColors[lane];
      // A câmera olha para +Z; por isso o eixo X da cena é o inverso do eixo
      // lógico do jogo. Espelhar aqui mantém pista 1 à esquerda na tela.
      const center = -(lane - 1) * 1.24;
      mesh(gatePostGeo, gateMat(color), [center - .55, 1.04, 0], [1, 1, 1], g, false);
      mesh(gatePostGeo, gateMat(color), [center + .55, 1.04, 0], [1, 1, 1], g, false);
      const beam = mesh(gateBeamGeo, gateMat(color), [center, 2.08, 0], [1, 1, 1], g, false); beam.rotation.z = Math.PI / 2;
      mesh(gatePanelGeo, panelMat(color), [center, 1.04, .035], [1, 1, 1], g, false);
      const label = textSprite(String(gate.options[lane]), color, 74, true);
      label.position.set(center, 1.2, -.09); label.scale.set(1.02, .51, 1); g.add(label);
    }
  }
}

function roundedPickupGeometry() {
  const s = .5, r = .13, shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s); shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r); shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s); shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r); shape.quadraticCurveTo(-s, -s, -s + r, -s);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1, steps: 1, curveSegments: 4,
    bevelEnabled: true, bevelSegments: 2, bevelSize: .075, bevelThickness: .075,
  });
  geometry.center(); return geometry;
}

const pickup = new THREE.Group();
const pickupShell = mesh(roundedPickupGeometry(), mat("#4fe4ff", {
  emissive: "#126f8a", metalness: .28, roughness: .2, transparent: true, opacity: .72, depthWrite: false,
}), [0, 0, 0], [1, 1, 1], pickup);
const pickupCore = mesh(new THREE.OctahedronGeometry(.32, 0), mat("#7d53e8", {
  emissive: "#36227c", metalness: .42, roughness: .2,
}), [0, 0, 0], [1, 1, 1], pickup);
const pickupIcon = textSprite("?", "#ffffff", 88, false);
pickupIcon.scale.set(1.32, .66, 1);
itemLayer.add(pickup, pickupIcon); pickup.visible = false; pickupIcon.visible = false;

function resize() {
  const w = Math.max(canvas.clientWidth, 1), h = Math.max(canvas.clientHeight, 1);
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

function render(state) {
  canvas.hidden = false; resize();
  const z = state.playerZ / 1000;
  road.position.z = z + 82; ground.position.z = z + 82;
  edgeLeft.position.z = z + 82; edgeRight.position.z = z + 82;
  const firstMark = Math.floor((z - 4) / 1.72);
  laneMarks.forEach((m, i) => { m.position.z = (firstMark + Math.floor(i / 2)) * 1.72; });
  road.material.color.set(state.colors.road || "#31394b");
  laneMaterial.color.set(state.colors.lane || "#f5f6fb");
  edgeLeft.material.color.set(state.colors.edges?.[0] || "#ff6fa7");
  edgeRight.material.color.set(state.colors.edges?.[1] || "#75d8ff");

  const sceneryIndex = Math.floor((z - 10) / 7.2);
  const styleKey = `${state.colors.scenery}:${state.colors.sceneryDark}:${state.colors.ground}`;
  if (sceneryIndex !== sceneryStart || state.scenario !== sceneryKind || styleKey !== sceneryStyleKey) rebuildScenery(sceneryIndex, state.scenario, state.colors);
  const key = JSON.stringify(state.gates.slice(0, 1).map((g) => [g.index, ...g.options])) + state.gateColors.join();
  if (key !== gatesKey) { gatesKey = key; rebuildGates(state.gates, state.gateColors); }

  ensurePlayer(state.runner, state.runnerColor);
  const escalaCorredor = state.runner === "carro" ? .46 : state.runner === "foguete" ? .26 : .62;
  player.scale.setScalar(escalaCorredor);
  player.position.set(-state.playerX / 1000, state.runner === "carro" ? .045 : state.runner === "foguete" ? .08 : .04, z + 2.05);
  player.rotation.y = state.inclination * (state.runner === "carro" ? 1.02 : 1.15);
  player.rotation.z = state.runner === "foguete" ? -state.inclination * .45 : state.inclination * .04;
  if (player.userData.type === "carro") {
    const vigor = Math.min(Math.max(state.speed / 6.2, .35), 1);
    const vibracao = reducedMotion ? 0 : (Math.sin(state.time * 9.2) * .004 + Math.sin(state.time * 15.7) * .0025) * vigor;
    player.userData.wheelSpin -= state.dt * state.speed * 6.6;
    player.userData.steer += (state.inclination * 1.35 - player.userData.steer) * Math.min(state.dt * 12, 1);
    player.userData.wheels.forEach((wheel) => { wheel.rotation.x = player.userData.wheelSpin; });
    player.userData.frontWheels.forEach((wheel) => { wheel.rotation.y = player.userData.steer; });
    player.userData.bodyRig.position.y = vibracao;
    player.userData.bodyRig.rotation.x = -.012 + Math.sin(state.time * 5.4) * .004 * vigor;
    player.userData.bodyRig.rotation.z += (state.inclination * .3 - player.userData.bodyRig.rotation.z) * Math.min(state.dt * 9, 1);
  } else if (player.userData.type === "foguete") {
    player.position.y += .3 + Math.sin(state.time * 3.2) * .08;
    const pulse = .8 + Math.abs(Math.sin(state.time * 20)) * .42;
    player.userData.flame.scale.y = pulse; player.userData.core.scale.y = .85 + pulse * .22;
  } else {
    player.position.y += Math.abs(Math.sin(state.time * 8)) * .09;
    player.userData.limbs.forEach((limb, i) => { limb.rotation.x = Math.sin(state.time * 9 + i * Math.PI) * .58; });
  }

  const item = state.item;
  pickup.visible = pickupIcon.visible = !!item;
  if (item) {
    const itemY = .78 + Math.sin(state.time * 2.7) * .09;
    const itemX = -(item.lane - 1) * 1.24;
    pickup.scale.setScalar(.64);
    pickup.position.set(itemX, itemY, item.z / 1000);
    // A caixa exibe profundidade sem dar as costas para o jogador: a rotação
    // curta preserva o ponto de interrogação e evita o efeito de “maleta”.
    pickup.rotation.set(Math.sin(state.time * .72) * .1, Math.sin(state.time * .9) * .42, Math.sin(state.time * .54) * .06);
    pickupCore.rotation.y = -state.time * 1.7; pickupCore.rotation.x = state.time * .8;
    pickupIcon.position.set(itemX, itemY, item.z / 1000 - .6);
  }

  const desiredCamera = new THREE.Vector3(-state.camX / 1000, 2.35, z - 2.65);
  camera.position.lerp(desiredCamera, state.dragging ? .34 : .13);
  camera.lookAt(-state.camX / 1000, .18, z + 8.2);
  sun.position.set(camera.position.x - 7, 12, z - 4);
  sun.target.position.set(0, 0, z + 12); scene.add(sun.target);
  scene.fog = new THREE.Fog(state.colors.fog || state.colors.skyBottom || "#b76e73", 18, 68);
  renderer.render(scene, camera);
}

function hide() { canvas.hidden = true; }

window.CorridaCena3D = { ready: true, render, resize, hide };
window.dispatchEvent(new Event("corrida3dready"));
