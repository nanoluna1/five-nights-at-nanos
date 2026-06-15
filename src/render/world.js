// Hand-authored render facade. (The Antigravity-CLI draft rendered an unlit, empty
// scene — no visible office/doors and a non-functional flashlight — so this replaces it.)
// One scene holds the office + four camera rooms. The office is deliberately lit enough
// to SEE (dark/moody, not pitch black); power drain dims it toward black.
export function createWorld(THREE, mountEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070b);
  scene.fog = new THREE.FogExp2(0x06070b, 0.018);

  // Low ambient so geometry is always faintly readable; mood comes from point lights.
  const ambient = new THREE.AmbientLight(0x556070, 0.55);
  scene.add(ambient);

  // ---- shared materials ----
  const matWall   = new THREE.MeshStandardMaterial({ color: 0x262a33, roughness: 0.95 });
  const matFloor  = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 1.0 });
  const matMetal  = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.55, metalness: 0.6 });
  const matDoor   = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.7, metalness: 0.4 });
  const matFrame  = new THREE.MeshStandardMaterial({ color: 0x4a4030, roughness: 0.8 });

  // =================== OFFICE ===================
  const office = new THREE.Group();
  scene.add(office);

  // floor / ceiling / back wall
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; office.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), matWall);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 4; office.add(ceiling);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), matWall);
  backWall.position.set(0, 2, -2.2); office.add(backWall);

  // a faint company poster on the back wall so the office reads as a room
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 1, emissive: 0x140a02 }));
  poster.position.set(-3, 2.2, -2.18); office.add(poster);

  // side walls with door openings (built as pillars flanking each doorway)
  function sideWall(sign) {
    const g = new THREE.Group();
    const x = sign * 4.2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 3), matWall);
    back.position.set(x, 2, -0.7); g.add(back);
    office.add(g);
    return g;
  }
  sideWall(-1); sideWall(1);

  // doorways + sliding door panels + door lights
  function makeDoor(sign) {
    const x = sign * 3.0;
    const grp = new THREE.Group();
    // frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 2.2), matFrame);
    frame.position.set(x, 1.7, 1.2); grp.add(frame);
    // doorway opening (dark void with a hint of hallway)
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.0),
      new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 1 }));
    opening.position.set(x - sign * 0.21, 1.6, 1.2);
    opening.rotation.y = sign * Math.PI / 2; grp.add(opening);
    // sliding metal door panel (y is raised=open, lowered=closed)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 1.8), matMetal);
    panel.position.set(x - sign * 0.21, 4.6, 1.2); panel.castShadow = true; grp.add(panel); // start open (up)
    // door light (off by default)
    const light = new THREE.PointLight(0xfff0c0, 0, 9, 2);
    light.position.set(x - sign * 1.0, 2.3, 1.2); grp.add(light);
    office.add(grp);
    return { panel, light, sign, x };
  }
  const doorL = makeDoor(-1);
  const doorR = makeDoor(1);

  // desk + monitor in front of the player
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 1.2), matMetal);
  desk.position.set(0, 1.0, 4.4); desk.castShadow = true; desk.receiveShadow = true; office.add(desk);
  const deskLeg = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 0.1), matWall);
  deskLeg.position.set(0, 0.5, 4.95); office.add(deskLeg);
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.08), matMetal);
  monitor.position.set(0.7, 1.5, 4.5); monitor.rotation.y = -0.2; office.add(monitor);
  const monitorScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.58),
    new THREE.MeshStandardMaterial({ color: 0x123a2a, emissive: 0x0c2a1e, emissiveIntensity: 1 }));
  monitorScreen.position.set(0.7, 1.5, 4.46); monitorScreen.rotation.y = -0.2; office.add(monitorScreen);

  // ceiling fan (rotates; casts a moving shadow on the floor)
  const fan = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12), matMetal);
  fan.add(hub);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.34), matMetal);
    blade.position.x = 0.9; blade.castShadow = true;
    const arm = new THREE.Group(); arm.add(blade); arm.rotation.y = (i * Math.PI * 2) / 3;
    fan.add(arm);
  }
  fan.position.set(0, 3.7, 2.2); office.add(fan);

  // office lighting: a warm overhead pool (shadow caster) + cool fill
  const officeMain = new THREE.PointLight(0xffd9a0, 1.5, 22, 2);
  officeMain.position.set(0, 3.5, 2.5); officeMain.castShadow = true;
  officeMain.shadow.mapSize.set(1024, 1024); office.add(officeMain);
  const officeFill = new THREE.PointLight(0x6678aa, 0.5, 18, 2);
  officeFill.position.set(0, 2.2, 5.5); office.add(officeFill);

  // =================== CAMERA ROOMS ===================
  const roomCams = {};
  const roomAnchors = {};
  function buildRoom(id, center, accent, propFn) {
    const grp = new THREE.Group(); grp.position.copy(center); scene.add(grp);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), matFloor);
    f.rotation.x = -Math.PI / 2; grp.add(f);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), matWall); w1.position.set(0, 2.5, -7); grp.add(w1);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), matWall); w2.position.set(-7, 2.5, 0); w2.rotation.y = Math.PI / 2; grp.add(w2);
    const w3 = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), matWall); w3.position.set(7, 2.5, 0); w3.rotation.y = -Math.PI / 2; grp.add(w3);
    // each room has its own dim light so its feed is visible (greenish night look)
    const rl = new THREE.PointLight(accent, 0.9, 26, 2); rl.position.set(0, 4, 2); grp.add(rl);
    grp.add(new THREE.AmbientLight(accent, 0.25));
    if (propFn) propFn(grp);
    // camera looking into the room
    const cam = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 200);
    cam.position.set(center.x, center.y + 2.2, center.z + 6.5);
    cam.lookAt(center.x, center.y + 1.4, center.z - 2);
    roomCams[id] = cam;
    const anchor = new THREE.Vector3(center.x, center.y, center.z - 1);
    roomAnchors[id] = anchor;
    return grp;
  }

  buildRoom('CAM1A', new THREE.Vector3(0, 0, -45), 0x88ffaa, (g) => {
    // show stage: a low platform + backdrop curtain
    const stage = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 4), matMetal); stage.position.set(0, 0.25, -2); g.add(stage);
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(10, 5),
      new THREE.MeshStandardMaterial({ color: 0x5a1020, roughness: 1 })); curtain.position.set(0, 2.5, -6.8); g.add(curtain);
  });
  buildRoom('CAM1B', new THREE.Vector3(24, 0, -45), 0x88ccff, (g) => {
    for (let i = -1; i <= 1; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 16), matMetal); t.position.set(i * 3, 1, -1); g.add(t); }
  });
  buildRoom('CAM3', new THREE.Vector3(-24, 0, -24), 0xaaaaff, (g) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.6), matWall); shelf.position.set(0, 1.5, -4); g.add(shelf);
  });
  buildRoom('CAM7', new THREE.Vector3(26, 0, -16), 0xffcc66, (g) => {
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(7, 5),
      new THREE.MeshStandardMaterial({ color: 0x6a2a10, roughness: 1 })); curtain.position.set(0, 2.5, -3); g.add(curtain);
  });

  // =================== HAR (owl) ===================
  function buildHar() {
    const g = new THREE.Group();
    const brown = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.8, metalness: 0.2 });
    const darkBrown = new THREE.MeshStandardMaterial({ color: 0x4a3720, roughness: 0.85, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 16), brown); body.scale.set(1, 1.25, 1); body.position.y = 1.0; g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x8a6b3c, roughness: 0.85 })); belly.scale.set(1, 1.25, 0.6); belly.position.set(0, 0.95, 0.55); g.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 16), brown); head.position.y = 2.15; g.add(head);
    // ear tufts
    for (const sx of [-1, 1]) { const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), darkBrown); tuft.position.set(sx * 0.42, 2.85, 0); tuft.rotation.z = sx * 0.3; g.add(tuft); }
    // eyes (amber, emissive — the menacing glow)
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffb024, emissive: 0xff9810, emissiveIntensity: 1.4, roughness: 0.3 });
    const eyes = [];
    for (const sx of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), new THREE.MeshStandardMaterial({ color: 0x14100a })); socket.position.set(sx * 0.3, 2.25, 0.6); g.add(socket);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), eyeMat); eye.position.set(sx * 0.3, 2.25, 0.72); g.add(eye); eyes.push(eye);
    }
    // beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), new THREE.MeshStandardMaterial({ color: 0xd8943a, roughness: 0.6 }));
    beak.position.set(0, 2.0, 0.78); beak.rotation.x = Math.PI / 2; g.add(beak);
    // maroon bowtie
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x7a2030, roughness: 0.7 })); w.position.set(sx * 0.22, 1.35, 0.78); w.rotation.z = Math.PI / 2 * sx; g.add(w); }
    g.scale.set(1.1, 1.1, 1.1);
    return { group: g, eyes };
  }
  const har = buildHar();
  har.group.visible = false;
  scene.add(har.group);

  // =================== OFFICE CAMERA + flashlight ===================
  const officeCam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  officeCam.position.set(0, 1.8, 6.6);
  officeCam.rotation.set(-0.04, 0, 0); // look slightly down the room toward both doors

  // flashlight follows whichever camera is active so it always lights the current view
  const flashlight = new THREE.SpotLight(0xffffff, 0, 30, Math.PI / 7, 0.4, 1.2);
  flashlight.visible = false;
  scene.add(flashlight); scene.add(flashlight.target);

  // office look-around (pure view pan; does not touch game state)
  let panYaw = 0, panTarget = 0;
  renderer.domElement.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
    panTarget = -nx * 0.5; // mouse right -> look right
  });

  // =================== CRT overlays (DOM, shown only on camera view) ===================
  const scan = document.createElement('div');
  scan.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;display:none;' +
    'background:repeating-linear-gradient(0deg,rgba(0,0,0,0.0) 0px,rgba(0,0,0,0.0) 2px,rgba(0,0,0,0.28) 3px,rgba(0,0,0,0.0) 4px);' +
    'mix-blend-mode:multiply;';
  mountEl.appendChild(scan);
  const staticEl = document.createElement('div');
  staticEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;display:none;opacity:0;' +
    "background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>\");";
  mountEl.appendChild(staticEl);

  // =================== state ===================
  let activeCam = officeCam;
  let monitorUp = false;
  let staticTimer = 0;
  let shakeAmt = 0;
  let jumpscaring = false;
  let powerLevel = 1;

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const aspect = window.innerWidth / window.innerHeight;
    officeCam.aspect = aspect; officeCam.updateProjectionMatrix();
    for (const c of Object.values(roomCams)) { c.aspect = aspect; c.updateProjectionMatrix(); }
  });

  function placeHarAt(roomId) {
    har.group.visible = true;
    if (roomId === 'OFFICE') {
      // looming in the office doorway/desk area (used when he reaches you)
      har.group.position.set(0, 0, 2.0);
      har.group.rotation.y = 0;
    } else if (roomAnchors[roomId]) {
      har.group.position.copy(roomAnchors[roomId]);
      har.group.rotation.y = Math.PI; // face the room camera
    }
  }

  return {
    render(state, dt) {
      // fan + eye shimmer
      fan.rotation.y += dt * 3.0;
      const flick = 0.9 + Math.sin(performance.now() * 0.02) * 0.1;
      har.eyes.forEach(e => { e.material.emissiveIntensity = 1.2 * flick; });

      // resolve which camera renders this frame (a jumpscare forces the office view)
      monitorUp = !jumpscaring && !!(state && state.monitorUp);
      if (monitorUp && state.activeCam && roomCams[state.activeCam]) activeCam = roomCams[state.activeCam];
      else activeCam = officeCam;

      // office pan (smoothed) + constant idle sway so the 3D depth is always obvious
      panYaw += (panTarget - panYaw) * Math.min(1, dt * 6);
      if (!monitorUp && !jumpscaring) {
        const t = performance.now() * 0.001;
        officeCam.position.x = Math.sin(t * 0.45) * 0.12;          // gentle drift
        officeCam.position.y = 1.8 + Math.sin(t * 0.62) * 0.04;    // breathing bob
        officeCam.position.z = 6.6 + Math.sin(t * 0.3) * 0.06;
        officeCam.rotation.y = panYaw + Math.sin(t * 0.33) * 0.05; // sway + mouse look
        officeCam.rotation.x = -0.04 + Math.sin(t * 0.5) * 0.012;
      } else {
        officeCam.rotation.y = 0;
        officeCam.position.set(0, 1.8, 6.6);
      }

      // flashlight rides the active camera
      if (flashlight.visible) {
        flashlight.position.copy(activeCam.getWorldPosition(new THREE.Vector3()));
        const dir = new THREE.Vector3(); activeCam.getWorldDirection(dir);
        flashlight.target.position.copy(flashlight.position.clone().add(dir.multiplyScalar(12)));
      }

      // screen shake — apply a temporary offset, then restore so it never drifts
      let ox = 0, oy = 0;
      if (shakeAmt > 0.001) {
        ox = (Math.random() - 0.5) * shakeAmt * 0.4;
        oy = (Math.random() - 0.5) * shakeAmt * 0.4;
        activeCam.position.x += ox; activeCam.position.y += oy;
        shakeAmt *= 0.88;
      }

      // CRT scanlines only on camera view
      scan.style.display = monitorUp ? 'block' : 'none';
      // static burst decay
      if (staticTimer > 0) { staticTimer -= dt; staticEl.style.display = 'block'; staticEl.style.opacity = String(Math.min(0.85, staticTimer * 2)); staticEl.style.backgroundPosition = `${Math.random() * 100}px ${Math.random() * 100}px`; }
      else { staticEl.style.display = 'none'; }

      renderer.render(scene, activeCam);
      activeCam.position.x -= ox; activeCam.position.y -= oy; // undo shake offset
    },
    setOfficeView() { monitorUp = false; },
    setCamView(camId) { if (roomCams[camId]) { /* selection mirrored from state in render */ } },
    setAnimatronicRoom(name, roomId) { if (name === 'har') placeHarAt(roomId); },
    setDoor(side, closed) {
      const d = side.toLowerCase()[0] === 'l' ? doorL : doorR;
      d.panel.position.y = closed ? 1.6 : 4.6; // down=closed, up=open
    },
    setLight(side, on) {
      const d = side.toLowerCase()[0] === 'l' ? doorL : doorR;
      d.light.intensity = on ? 2.2 : 0;
    },
    setFlashlight(on) { flashlight.visible = on; flashlight.intensity = on ? 3.2 : 0; },
    staticBurst() { staticTimer = 0.4; },
    shake(intensity) { shakeAmt = Math.max(shakeAmt, intensity); },
    playJumpscare(name) {
      jumpscaring = true;
      monitorUp = false;
      // slam Har huge, right in the office camera's face, hard cut
      har.group.visible = true;
      har.group.position.set(0, -0.4, 4.4);
      har.group.rotation.y = 0;
      har.group.scale.set(2.6, 2.6, 2.6);
      officeMain.intensity = 4.0; ambient.intensity = 1.2;
      shakeAmt = 1.4;
      return new Promise((resolve) => {
        setTimeout(() => {
          har.group.scale.set(1.1, 1.1, 1.1);
          officeMain.intensity = 1.5; ambient.intensity = 0.55;
          jumpscaring = false;
          resolve();
        }, 1100);
      });
    },
    dimForPower(level) {
      powerLevel = level;
      // keep a visible floor of light until truly 0 (power-out goes dark)
      officeMain.intensity = jumpscaring ? officeMain.intensity : 0.25 + 1.4 * level;
      officeFill.intensity = 0.15 + 0.45 * level;
    },
  };
}
