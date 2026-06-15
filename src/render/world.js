// via Google Antigravity CLI

export function createWorld(THREE, mountEl) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020202, 0.025);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  mountEl.appendChild(renderer.domElement);

  // Cameras
  const aspect = mountEl.clientWidth / mountEl.clientHeight;
  const officeCam = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  officeCam.position.set(0, 12, 5);
  officeCam.lookAt(0, 12, -10);

  const cam1A = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  cam1A.position.set(0, 18, -35);
  cam1A.lookAt(0, 10, -50);

  const cam1B = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  cam1B.position.set(0, 18, -85);
  cam1B.lookAt(0, 10, -100);

  const cam3 = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  cam3.position.set(-30, 18, -35);
  cam3.lookAt(-30, 10, -50);

  const cam7 = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  cam7.position.set(30, 18, -35);
  cam7.lookAt(30, 10, -50);

  const cameras = {
    'CAM1A': cam1A,
    'CAM1B': cam1B,
    'CAM3': cam3,
    'CAM7': cam7
  };

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.1 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.2 });

  // Office Walls & Floor
  const officeFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), floorMat);
  officeFloor.rotation.x = -Math.PI / 2;
  scene.add(officeFloor);

  const wallGroup = new THREE.Group();
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 1), wallMat);
  frontWall.position.set(0, 10, -15);
  wallGroup.add(frontWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 1), wallMat);
  backWall.position.set(0, 10, 15);
  wallGroup.add(backWall);
  scene.add(wallGroup);

  // Office Furniture
  const deskGeo = new THREE.BoxGeometry(16, 6, 6);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.7 });
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.set(0, 3, -8);
  desk.castShadow = true;
  desk.receiveShadow = true;
  scene.add(desk);

  const monitorGeo = new THREE.BoxGeometry(4, 3, 1);
  const monitorMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
  const monitor = new THREE.Mesh(monitorGeo, monitorMat);
  monitor.position.set(0, 7.5, -8);
  scene.add(monitor);
  
  const monitorScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ color: 0x223322 }));
  monitorScreen.position.set(0, 7.5, -7.49);
  scene.add(monitorScreen);

  const fanGroup = new THREE.Group();
  fanGroup.position.set(0, 18, 0);
  const fanCenter = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  fanGroup.add(fanCenter);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    blade.position.z = 3;
    const pivot = new THREE.Group();
    pivot.rotation.y = (Math.PI * 2 / 3) * i;
    pivot.add(blade);
    fanGroup.add(pivot);
  }
  scene.add(fanGroup);

  // Lights
  const officeAmbient = new THREE.AmbientLight(0x111122, 0.2);
  scene.add(officeAmbient);
  
  const fanLight = new THREE.PointLight(0x555544, 1.0, 40);
  fanLight.position.set(0, 19, 0);
  fanLight.castShadow = true;
  scene.add(fanLight);

  // Doors & Door Lights
  const doorGeo = new THREE.BoxGeometry(1, 16, 8);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.6, roughness: 0.5 });
  
  const leftDoor = new THREE.Mesh(doorGeo, doorMat);
  leftDoor.position.set(-19, 8, 0);
  scene.add(leftDoor);
  
  const rightDoor = new THREE.Mesh(doorGeo, doorMat);
  rightDoor.position.set(19, 8, 0);
  scene.add(rightDoor);

  const leftLight = new THREE.PointLight(0xffaa88, 0, 30);
  leftLight.position.set(-21, 12, 0);
  scene.add(leftLight);
  
  const rightLight = new THREE.PointLight(0xffaa88, 0, 30);
  rightLight.position.set(21, 12, 0);
  scene.add(rightLight);

  // Rooms
  function createRoom(x, z, color) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    scene.add(floor);
    const light = new THREE.PointLight(0x444455, 0.6, 40);
    light.position.set(x, 15, z);
    scene.add(light);
    return floor;
  }
  createRoom(0, -50, 0x331111); // CAM1A Show Stage
  createRoom(0, -100, 0x113311); // CAM1B Dining
  createRoom(-30, -50, 0x111133); // CAM3 Closet
  createRoom(30, -50, 0x333311); // CAM7 Cove

  // Flashlight
  const flashlight = new THREE.SpotLight(0xffffff, 0, 60, Math.PI / 5, 0.5, 1.5);
  scene.add(flashlight);
  scene.add(flashlight.target);

  // Owl Animatronic
  const animatronics = {};
  
  function createOwl() {
    const owlGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.85, metalness: 0.3 });
    
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 9, 16), bodyMat);
    body.position.y = 4.5;
    owlGroup.add(body);
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), bodyMat);
    head.position.y = 11;
    owlGroup.add(head);
    
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.5, roughness: 0.2 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), eyeMat);
    leftEye.position.set(-1.2, 11.5, 2.5);
    owlGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), eyeMat);
    rightEye.position.set(1.2, 11.5, 2.5);
    owlGroup.add(rightEye);
    
    const bowtieMat = new THREE.MeshStandardMaterial({ color: 0x800000, roughness: 0.9, metalness: 0.1 });
    const bowtie = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 0.5), bowtieMat);
    bowtie.position.set(0, 8.5, 3.2);
    const bowLeft = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 4), bowtieMat);
    bowLeft.rotation.z = Math.PI / 2;
    bowLeft.position.set(-1.2, 0, 0);
    bowtie.add(bowLeft);
    const bowRight = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 4), bowtieMat);
    bowRight.rotation.z = -Math.PI / 2;
    bowRight.position.set(1.2, 0, 0);
    bowtie.add(bowRight);
    owlGroup.add(bowtie);
    
    const tuftGeo = new THREE.ConeGeometry(0.6, 2.5, 8);
    const leftTuft = new THREE.Mesh(tuftGeo, bodyMat);
    leftTuft.position.set(-2, 13, 0.5);
    leftTuft.rotation.z = Math.PI / 6;
    leftTuft.rotation.x = -Math.PI / 8;
    owlGroup.add(leftTuft);
    
    const rightTuft = new THREE.Mesh(tuftGeo, bodyMat);
    rightTuft.position.set(2, 13, 0.5);
    rightTuft.rotation.z = -Math.PI / 6;
    rightTuft.rotation.x = -Math.PI / 8;
    owlGroup.add(rightTuft);

    const beakMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.2 });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 4), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 10.5, 3.2);
    owlGroup.add(beak);

    scene.add(owlGroup);
    return owlGroup;
  }
  animatronics['har'] = createOwl();
  animatronics['har'].position.set(0, -100, 0); // Hide initially

  const roomPositions = {
    'CAM1A': { x: 0, z: -50 },
    'CAM1B': { x: 0, z: -100 },
    'CAM3': { x: -30, z: -50 },
    'CAM7': { x: 30, z: -50 }
  };

  // Post-processing setup
  const renderTarget = new THREE.WebGLRenderTarget(mountEl.clientWidth, mountEl.clientHeight);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postScene = new THREE.Scene();
  const postMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      time: { value: 0 },
      staticIntensity: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float time;
      uniform float staticIntensity;
      varying vec2 vUv;

      float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;

        // Chromatic Aberration
        float caOffset = 0.003;
        float r = texture2D(tDiffuse, uv + vec2(caOffset, 0.0)).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - vec2(caOffset, 0.0)).b;
        vec3 color = vec3(r, g, b);

        // Scanlines
        float scanline = sin(uv.y * 800.0) * 0.04;
        color -= scanline;

        // Grain
        float grain = rand(uv * time) * 0.1;
        color -= grain;

        // Static Burst
        if (staticIntensity > 0.0) {
          float noise = rand(uv * time * 2.0);
          color = mix(color, vec3(noise), staticIntensity);
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
  postScene.add(postQuad);

  let time = 0;
  let currentStatic = 0;
  let shakeMag = 0;
  let isJumpscare = false;
  let jumpscareAnimatronic = null;

  // Base positions for camera reset after shake
  const baseCamPositions = {
    office: officeCam.position.clone(),
    cam1A: cam1A.position.clone(),
    cam1B: cam1B.position.clone(),
    cam3: cam3.position.clone(),
    cam7: cam7.position.clone()
  };

  return {
    render(state, dt) {
      time += dt;
      fanGroup.rotation.y -= dt * 5;

      // Handle resize
      const width = mountEl.clientWidth;
      const height = mountEl.clientHeight;
      if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
        renderer.setSize(width, height, false);
        const aspect = width / height;
        officeCam.aspect = aspect; officeCam.updateProjectionMatrix();
        cam1A.aspect = aspect; cam1A.updateProjectionMatrix();
        cam1B.aspect = aspect; cam1B.updateProjectionMatrix();
        cam3.aspect = aspect; cam3.updateProjectionMatrix();
        cam7.aspect = aspect; cam7.updateProjectionMatrix();
        renderTarget.setSize(width, height);
      }

      if (currentStatic > 0) {
        currentStatic -= dt;
        if (currentStatic < 0) currentStatic = 0;
        postMaterial.uniforms.staticIntensity.value = currentStatic > 0 ? 0.8 : 0.0;
      } else {
        postMaterial.uniforms.staticIntensity.value = 0.0;
      }
      postMaterial.uniforms.time.value = time;

      let camToRender = officeCam;
      let monitorUp = state.monitorUp;

      if (isJumpscare && jumpscareAnimatronic) {
        monitorUp = false; // Hard cut to office
        camToRender = officeCam;
        
        officeCam.position.copy(baseCamPositions.office);
        officeCam.rotation.y = 0;

        const camPos = officeCam.position;
        const dir = new THREE.Vector3(0, 0, -1).applyEuler(officeCam.rotation);
        jumpscareAnimatronic.position.copy(camPos).add(dir.multiplyScalar(3.5));
        jumpscareAnimatronic.position.y -= 3.5; 
        jumpscareAnimatronic.lookAt(camPos);
        
        jumpscareAnimatronic.position.x += (Math.random() - 0.5) * 0.3;
        jumpscareAnimatronic.position.y += (Math.random() - 0.5) * 0.3;
      } else {
        if (monitorUp && state.activeCam && cameras[state.activeCam]) {
          camToRender = cameras[state.activeCam];
        } else {
          camToRender = officeCam;
          if (state.lookYaw !== undefined) {
            officeCam.rotation.y = state.lookYaw;
          }
        }
      }

      if (!isJumpscare) {
        officeCam.position.copy(baseCamPositions.office);
        cam1A.position.copy(baseCamPositions.cam1A);
        cam1B.position.copy(baseCamPositions.cam1B);
        cam3.position.copy(baseCamPositions.cam3);
        cam7.position.copy(baseCamPositions.cam7);
      }

      if (shakeMag > 0) {
        camToRender.position.x += (Math.random() - 0.5) * shakeMag;
        camToRender.position.y += (Math.random() - 0.5) * shakeMag;
        shakeMag -= dt * 2;
        if (shakeMag < 0) shakeMag = 0;
      }

      // Flashlight follows active camera
      flashlight.position.copy(camToRender.position);
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(camToRender.rotation);
      flashlight.target.position.copy(camToRender.position).add(dir.multiplyScalar(10));
      flashlight.target.updateMatrixWorld();

      if (monitorUp) {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camToRender);
        renderer.setRenderTarget(null);
        renderer.render(postScene, postCam);
      } else {
        renderer.render(scene, camToRender);
      }
    },
    
    setOfficeView() {
      // Stub: render() selects camera based on state.monitorUp
    },
    
    setCamView(camId) {
      // Stub: render() selects camera based on state.activeCam
    },
    
    setAnimatronicRoom(name, roomId) {
      const anim = animatronics[name];
      if (anim && roomPositions[roomId]) {
        const pos = roomPositions[roomId];
        anim.position.set(pos.x + (Math.random() - 0.5) * 4, 0, pos.z + (Math.random() - 0.5) * 4);
        if (cameras[roomId]) {
          anim.lookAt(cameras[roomId].position);
          anim.rotation.x = 0;
          anim.rotation.z = 0;
        }
      }
    },
    
    setDoor(side, closed) {
      const isLeft = side.toLowerCase() === 'left';
      const target = isLeft ? leftDoor : rightDoor;
      target.position.y = closed ? 8 : 25;
    },
    
    setLight(side, on) {
      const isLeft = side.toLowerCase() === 'left';
      const target = isLeft ? leftLight : rightLight;
      target.intensity = on ? 1.5 : 0;
    },
    
    setFlashlight(on) {
      flashlight.intensity = on ? 2.0 : 0.0;
    },
    
    staticBurst() {
      currentStatic = 0.4;
    },
    
    shake(intensity) {
      shakeMag = intensity;
    },
    
    playJumpscare(name) {
      return new Promise(resolve => {
        isJumpscare = true;
        jumpscareAnimatronic = animatronics[name];
        setTimeout(() => {
          isJumpscare = false;
          if (jumpscareAnimatronic) {
            jumpscareAnimatronic.position.set(0, -100, 0); 
          }
          jumpscareAnimatronic = null;
          resolve();
        }, 1000);
      });
    },
    
    dimForPower(level) {
      officeAmbient.intensity = 0.2 * level;
      fanLight.intensity = 1.0 * level;
    }
  };
}
