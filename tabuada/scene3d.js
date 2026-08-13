import * as THREE from "../assets/vendor/three/three.module.min.js";

const canvas = document.querySelector("#mundo3d");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(56, 1, .08, 150);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const hemi = new THREE.HemisphereLight(0xcdeaff, 0x31243d, 2.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 3.4);
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
const mat = (color, options = {}) => {
  const key = `${color}:${options.emissive || ""}:${options.metalness || 0}:${options.roughness ?? .68}:${options.transparent || false}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: options.roughness ?? .68, metalness: options.metalness || 0,
      emissive: options.emissive || 0x000000, emissiveIntensity: options.emissive ? .62 : 0,
      transparent: !!options.transparent, opacity: options.opacity ?? 1,
    }));
  }
  return materialCache.get(key);
};
const gateMat = (color) => {
  if (!gateMaterialCache.has(color)) gateMaterialCache.set(color, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  return gateMaterialCache.get(color);
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
const coneGeo = new THREE.ConeGeometry(1, 1, 16);
const sphereGeo = new THREE.SphereGeometry(1, 24, 14);

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

function createCar(color) {
  const g = new THREE.Group();
  const paint = mat(color, { metalness: .34, roughness: .26 });
  const dark = mat("#111722", { metalness: .25, roughness: .35 });
  const glass = mat("#143d59", { metalness: .18, roughness: .12 });
  const rubber = mat("#080b10", { roughness: .9 });
  const metal = mat("#9ca8b6", { metalness: .85, roughness: .2 });
  roundedBody(paint, [0, .5, 0], [1.22, .32, 1.72], g);
  roundedBody(paint, [0, .64, .73], [1.05, .25, .92], g);
  roundedBody(glass, [0, .85, -.05], [.62, .27, .66], g);
  mesh(boxGeo, dark, [0, .25, 0], [2.18, .22, 2.9], g);

  const wheels = [];
  for (const x of [-1.03, 1.03]) for (const z of [-.92, .92]) {
    const wheel = mesh(new THREE.CylinderGeometry(.34, .34, .32, 18), rubber, [x, .26, z], [1, 1, 1], g);
    wheel.rotation.z = Math.PI / 2; wheels.push(wheel);
    const hub = mesh(new THREE.CylinderGeometry(.15, .15, .335, 14), metal, [x, .26, z], [1, 1, 1], g);
    hub.rotation.z = Math.PI / 2;
  }
  const spoiler = mesh(boxGeo, dark, [0, 1.04, -1.28], [2.05, .09, .3], g);
  mesh(boxGeo, dark, [-.72, .78, -1.25], [.08, .55, .08], g);
  mesh(boxGeo, dark, [.72, .78, -1.25], [.08, .55, .08], g);
  for (const x of [-.68, .68]) mesh(boxGeo, mat("#ff2749", { emissive: "#ff1738" }), [x, .53, -1.5], [.46, .18, .08], g, false);
  for (const x of [-.62, .62]) mesh(new THREE.CylinderGeometry(.08, .08, .18, 12), metal, [x, .22, -1.56], [1, 1, 1], g).rotation.x = Math.PI / 2;
  g.userData = { type: "carro", wheels, body: g.children.filter((x) => x !== spoiler) };
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
  const windowFrame = mesh(new THREE.CylinderGeometry(.31, .31, .12, 20), dark, [0, 2.05, -.59], [1, 1, 1], g);
  windowFrame.rotation.x = Math.PI / 2;
  const windowGlass = mesh(new THREE.SphereGeometry(.25, 20, 12), mat("#24b9ed", { metalness: .15, roughness: .08 }), [0, 2.05, -.67], [1, 1, .3], g);
  const finGeo = triangleGeometry([[0, .85, 0], [.82, -.05, .05], [0, -.05, .62]]);
  for (const side of [-1, 1]) {
    const fin = mesh(finGeo, mat("#e3344f", { metalness: .18, roughness: .42 }), [side * .38, .62, 0], [side, 1, 1], g);
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

const road = mesh(new THREE.PlaneGeometry(4.55, 180), mat("#31394b", { roughness: .92 }), [0, 0, 80], [1, 1, 1], roadLayer);
road.rotation.x = -Math.PI / 2; road.receiveShadow = true;
const ground = mesh(new THREE.PlaneGeometry(90, 180), mat("#443447", { roughness: 1 }), [0, -.035, 80], [1, 1, 1], roadLayer);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
const laneMarks = [];
const curbs = [];
for (let i = 0; i < 150; i++) {
  for (const x of [-.62, .62]) laneMarks.push(mesh(boxGeo, mat("#f5f6fb"), [x, .022, i * 1.25], [.055, .025, .55], roadLayer, false));
  for (const x of [-2.36, 2.36]) curbs.push(mesh(boxGeo, mat(i % 2 ? "#ff4fa3" : "#6f5cff", { emissive: i % 2 ? "#7a143f" : "#281d73" }), [x, .055, i * 1.25], [.22, .1, 1.25], roadLayer, false));
}

function hash(n) { return Math.abs(Math.sin(n * 91.733) * 43758.5453) % 1; }
let sceneryStart = NaN;
let sceneryKind = "";
function rebuildScenery(start, kind, colors) {
  sceneryLayer.clear(); sceneryStart = start; sceneryKind = kind;
  const horizonMat = mat(colors.ground || "#443447", { roughness: 1 });
  ground.material = horizonMat;
  for (let i = start; i < start + 18; i++) for (const side of [-1, 1]) {
    const z = i * 5.2, r = hash(i * 2.7 + side), x = side * (4.2 + r * 2.8);
    const g = new THREE.Group(); g.position.set(x, 0, z); sceneryLayer.add(g);
    if (kind === "cidade") {
      const h = 3.2 + r * 6, w = 1.7 + hash(i + 4) * 2.2;
      mesh(boxGeo, mat(side > 0 ? "#25314a" : "#35263e", { roughness: .78 }), [0, h / 2, 0], [w, h, 2.3], g);
      for (let y = 1; y < h - .5; y += .85) for (const xx of [-.45, .45]) mesh(boxGeo, mat("#ffd46b", { emissive: "#9b6019" }), [xx * w, y, -1.17], [.22, .28, .035], g, false);
    } else if (kind === "deserto") {
      mesh(cylGeo, mat("#366c50"), [0, 1.05, 0], [.32, 2.1, .32], g);
      mesh(cylGeo, mat("#43815f"), [side * .45, 1.05, 0], [.18, .9, .18], g).rotation.z = side * 1.15;
    } else {
      mesh(cylGeo, mat("#5b3a2c"), [0, .65, 0], [.23, 1.3, .23], g);
      const snow = kind === "neve";
      mesh(coneGeo, mat(snow ? "#e8f8ff" : "#24563f"), [0, 2.15, 0], [1.1, 2.9, 1.1], g);
      if (snow) mesh(coneGeo, mat("#8dc8d5"), [0, 1.7, 0], [.78, 2.1, .78], g);
    }
  }
}

function textSprite(text, color, size = 112) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
  x.font = `900 ${size}px system-ui, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "rgba(8,10,18,.9)"; x.strokeText(text, 128, 67);
  x.fillStyle = color; x.fillText(text, 128, 67);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.userData.texture = texture; return sprite;
}

let gatesKey = "";
function rebuildGates(gates, gateColors) {
  gatesLayer.traverse((o) => { if (o.userData.texture) o.userData.texture.dispose(); });
  gatesLayer.clear();
  for (const gate of gates) {
    const g = new THREE.Group(); g.position.z = gate.z / 1000; gatesLayer.add(g);
    const boundaries = [-1.86, -.62, .62, 1.86];
    boundaries.forEach((x, idx) => mesh(boxGeo, gateMat(gateColors[Math.min(idx, 2)]), [x, 1.18, 0], [.09, 2.36, .16], g));
    for (let lane = 0; lane < 3; lane++) {
      const color = gateColors[lane];
      mesh(boxGeo, gateMat(color), [(lane - 1) * 1.24, 2.32, 0], [1.22, .1, .16], g);
      const label = textSprite(String(gate.options[lane]), "#ffffff", 104);
      label.position.set((lane - 1) * 1.24, 1.45, -.11); label.scale.set(1.15, .58, 1); g.add(label);
    }
    const question = textSprite(`${gate.a} × ${gate.b}`, gateColors[0], 82);
    question.position.set(0, 3.15, 0); question.scale.set(2.1, 1.05, 1); g.add(question);
  }
}

const capsule = new THREE.Group();
const core = mesh(new THREE.IcosahedronGeometry(.42, 1), mat("#64ebff", { emissive: "#186b8a", metalness: .45, roughness: .18 }), [0, 0, 0], [1, 1, 1], capsule);
const ringA = mesh(new THREE.TorusGeometry(.7, .055, 10, 30), mat("#9e62ff", { emissive: "#5322aa" }), [0, 0, 0], [1, 1, 1], capsule, false);
const ringB = mesh(new THREE.TorusGeometry(.7, .055, 10, 30), mat("#5eeaff", { emissive: "#17758b" }), [0, 0, 0], [1, 1, 1], capsule, false);
ringB.rotation.y = Math.PI / 2; itemLayer.add(capsule); capsule.visible = false;

function resize() {
  const w = Math.max(canvas.clientWidth, 1), h = Math.max(canvas.clientHeight, 1);
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

function render(state) {
  canvas.hidden = false; resize();
  const z = state.playerZ / 1000;
  road.position.z = z + 82; ground.position.z = z + 82;
  const firstMark = Math.floor((z - 4) / 1.25);
  laneMarks.forEach((m, i) => { m.position.z = (firstMark + Math.floor(i / 2)) * 1.25; });
  curbs.forEach((m, i) => { m.position.z = (firstMark + Math.floor(i / 2)) * 1.25; });
  road.material.color.set(state.colors.road || "#31394b");

  const sceneryIndex = Math.floor((z - 8) / 5.2);
  if (sceneryIndex !== sceneryStart || state.scenario !== sceneryKind) rebuildScenery(sceneryIndex, state.scenario, state.colors);
  const key = JSON.stringify(state.gates.map((g) => [g.index, g.a, g.b, ...g.options])) + state.gateColors.join();
  if (key !== gatesKey) { gatesKey = key; rebuildGates(state.gates, state.gateColors); }

  ensurePlayer(state.runner, state.runnerColor);
  const escalaCorredor = state.runner === "carro" ? .43 : state.runner === "foguete" ? .26 : .62;
  player.scale.setScalar(escalaCorredor);
  player.position.set(state.playerX / 1000, state.runner === "carro" ? .16 : state.runner === "foguete" ? .08 : .04, z + 2.05);
  player.rotation.y = -state.inclination * 1.15;
  player.rotation.z = state.runner === "foguete" ? -state.inclination * .45 : state.inclination * .22;
  if (player.userData.type === "carro") {
    player.position.y += Math.sin(state.time * 17) * .018;
    player.userData.wheels.forEach((w) => { w.rotation.x -= state.dt * state.speed * .065; });
  } else if (player.userData.type === "foguete") {
    player.position.y += .3 + Math.sin(state.time * 3.2) * .08;
    const pulse = .8 + Math.abs(Math.sin(state.time * 20)) * .42;
    player.userData.flame.scale.y = pulse; player.userData.core.scale.y = .85 + pulse * .22;
  } else {
    player.position.y += Math.abs(Math.sin(state.time * 8)) * .09;
    player.userData.limbs.forEach((limb, i) => { limb.rotation.x = Math.sin(state.time * 9 + i * Math.PI) * .58; });
  }

  const item = state.item;
  capsule.visible = !!item;
  if (item) {
    capsule.position.set((item.lane - 1) * 1.24, .75 + Math.sin(state.time * 3) * .12, item.z / 1000);
    capsule.rotation.y = state.time * 1.8; ringA.rotation.x = state.time * 1.2; ringB.rotation.z = state.time * 1.45;
  }

  const desiredCamera = new THREE.Vector3(state.camX / 1000, 2.35, z - 2.65);
  camera.position.lerp(desiredCamera, state.dragging ? .34 : .13);
  camera.lookAt(state.camX / 1000, .18, z + 8.2);
  sun.position.set(camera.position.x - 7, 12, z - 4);
  sun.target.position.set(0, 0, z + 12); scene.add(sun.target);
  scene.fog = new THREE.Fog(state.colors.fog || state.colors.skyBottom || "#b76e73", 20, 83);
  renderer.render(scene, camera);
}

function hide() { canvas.hidden = true; }

window.CorridaCena3D = { ready: true, render, resize, hide };
window.dispatchEvent(new Event("corrida3dready"));
