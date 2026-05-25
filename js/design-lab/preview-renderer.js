// 3D Preview Renderer for Design Lab (Upgraded Brutalist & Animated Assembly)
class PreviewRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.uavGroup = null;
        this.controls = null;
        this.propellers = [];
        this.ledMat = null;
        
        this.init();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xF2EDE8); // Matches portfolio background!
        this.scene.fog = new THREE.Fog(0xF2EDE8, 5, 20);

        // Camera setup
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0.6, 0.4, 0.6); // Cinematic close-up angle
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 4, 2);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 15;
        directionalLight.shadow.camera.left = -0.5;
        directionalLight.shadow.camera.right = 0.5;
        directionalLight.shadow.camera.top = 0.5;
        directionalLight.shadow.camera.bottom = -0.5;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);

        // Grid floor (Sleek brutalist grid)
        const gridHelper = new THREE.GridHelper(4, 20, 0xFF3D00, 0xbbbbbb);
        gridHelper.position.y = -0.15;
        this.scene.add(gridHelper);

        // Ground plane (Brutalist warm card color)
        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xEAE4DD,
            roughness: 0.9,
            metalness: 0.0
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.152;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Axis helper (Minimal)
        const axesHelper = new THREE.AxesHelper(0.3);
        axesHelper.position.set(-0.18, -0.14, -0.18);
        this.scene.add(axesHelper);

        // UAV group
        this.uavGroup = new THREE.Group();
        this.scene.add(this.uavGroup);

        // OrbitControls for interaction
        this.setupControls();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 0.3;
            this.controls.maxDistance = 3;
            this.controls.target.set(0, 0, 0);
        }
    }

    updateUAV(config) {
        // Clear existing UAV
        while (this.uavGroup.children.length > 0) {
            this.uavGroup.remove(this.uavGroup.children[0]);
        }
        this.propellers = []; // Reset propellers

        // Build detailed UAV based on configuration
        this.buildChassis(config.frame, config.flightController);
        this.buildMotorsAndProps(config.frame, config.motors, config.propellers);
        this.buildBattery(config.battery);
        this.buildPayload(config.payload);
    }

    buildChassis(frameConfig, fcConfig) {
        const { type, size, material } = frameConfig;
        const armLength = (size / 1000); 
        const motorDistance = armLength * 0.85 / 2;

        const materialColors = {
            'carbon': 0x1a1a1a,
            'aluminum': 0xb0b0b0,
            'plastic': 0x2e2e2e,
            'titanium': 0x555c64,
            'fiberglass': 0xdcdcdc
        };
        const color = materialColors[material] || 0x1a1a1a;

        const frameMat = new THREE.MeshStandardMaterial({ 
            color, 
            roughness: material === 'carbon' ? 0.8 : 0.4, 
            metalness: material === 'carbon' ? 0.3 : 0.8 
        });

        // 1. Bottom Chassis Plate
        const bottomPlateGeo = new THREE.BoxGeometry(0.14, 0.004, 0.14);
        const bottomPlate = new THREE.Mesh(bottomPlateGeo, frameMat);
        bottomPlate.position.y = -0.01;
        bottomPlate.castShadow = true;
        bottomPlate.receiveShadow = true;
        this.uavGroup.add(bottomPlate);

        // 2. Top Chassis Plate
        const topPlateGeo = new THREE.BoxGeometry(0.11, 0.004, 0.11);
        const topPlate = new THREE.Mesh(topPlateGeo, frameMat);
        topPlate.position.y = 0.02;
        topPlate.castShadow = true;
        this.uavGroup.add(topPlate);

        // 3. Aluminum Stand-offs (Connect plates)
        const spacerGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8);
        const spacerMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, metalness: 0.9, roughness: 0.1 });
        
        const spacerCoords = [
            {x: 0.045, z: 0.045}, {x: -0.045, z: 0.045},
            {x: 0.045, z: -0.045}, {x: -0.045, z: -0.045}
        ];
        
        spacerCoords.forEach(coords => {
            const spacer = new THREE.Mesh(spacerGeo, spacerMat);
            spacer.position.set(coords.x, 0.005, coords.z);
            spacer.castShadow = true;
            this.uavGroup.add(spacer);
        });

        // 4. Flight Controller Stack
        const stackGeo = new THREE.BoxGeometry(0.035, 0.012, 0.035);
        const stackMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 });
        const fcStack = new THREE.Mesh(stackGeo, stackMat);
        fcStack.position.set(0, 0.005, 0);
        fcStack.castShadow = true;
        this.uavGroup.add(fcStack);

        // Pulsating FC Status LED
        const ledGeo = new THREE.SphereGeometry(0.003, 8, 8);
        this.ledMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
        const statusLed = new THREE.Mesh(ledGeo, this.ledMat);
        statusLed.position.set(0.012, 0.012, 0.012);
        this.uavGroup.add(statusLed);

        // 5. GPS Antenna Mast
        if (fcConfig.type === 'gps' || fcConfig.type === 'advanced' || fcConfig.type === 'pixhawk') {
            const mastGroup = new THREE.Group();
            
            const rodGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.06, 8);
            const rodMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
            const rod = new THREE.Mesh(rodGeo, rodMat);
            rod.position.y = 0.03;
            rod.castShadow = true;
            mastGroup.add(rod);

            const puckGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.006, 16);
            const puckMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 });
            const puck = new THREE.Mesh(puckGeo, puckMat);
            puck.position.y = 0.06;
            puck.castShadow = true;
            mastGroup.add(puck);

            mastGroup.position.set(-0.03, 0.02, -0.03);
            this.uavGroup.add(mastGroup);
        }

        // 6. Main Arms & ESC Mounting
        const motorCount = type.includes('quad') ? 4 : type === 'hexa' ? 6 : 8;
        const armGeometry = new THREE.BoxGeometry(motorDistance, 0.008, 0.018);
        const armClampGeo = new THREE.BoxGeometry(0.02, 0.012, 0.022);
        const clampMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.9 });
        
        const escGeo = new THREE.BoxGeometry(0.032, 0.005, 0.015);
        const escMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

        for (let i = 0; i < motorCount; i++) {
            const angle = (i * 2 * Math.PI) / motorCount;
            
            const armGroup = new THREE.Group();
            
            const arm = new THREE.Mesh(armGeometry, frameMat);
            arm.position.x = motorDistance / 2;
            arm.castShadow = true;
            arm.receiveShadow = true;
            armGroup.add(arm);

            const clamp = new THREE.Mesh(armClampGeo, clampMat);
            clamp.position.x = 0.06;
            clamp.position.y = 0.002;
            clamp.castShadow = true;
            armGroup.add(clamp);

            const esc = new THREE.Mesh(escGeo, escMat);
            esc.position.set(motorDistance * 0.45, 0.006, 0);
            esc.castShadow = true;
            armGroup.add(esc);

            const wireGeo = new THREE.CylinderGeometry(0.001, 0.001, motorDistance * 0.5, 8);
            const wireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const wire = new THREE.Mesh(wireGeo, wireMat);
            wire.rotation.z = Math.PI / 2;
            wire.position.set(motorDistance * 0.22, 0.004, 0.003);
            armGroup.add(wire);

            armGroup.rotation.y = angle;
            this.uavGroup.add(armGroup);
        }
    }

    buildMotorsAndProps(frameConfig, motorConfig, propConfig) {
        const { type, size } = frameConfig;
        const armLength = (size / 1000); 
        const motorCount = type.includes('quad') ? 4 : type === 'hexa' ? 6 : 8;
        const propRadius = propConfig.size * 0.0254 / 2;
        const motorDistance = armLength * 0.85 / 2;
        
        const maxPropRadius = motorDistance * 0.95;
        const actualPropRadius = Math.min(propRadius, maxPropRadius);

        // Brushless motor materials
        const statorMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.2 });
        const copperMat = new THREE.MeshStandardMaterial({ color: 0xD2691E, metalness: 0.7, roughness: 0.3 });
        const bellMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, metalness: 0.9, roughness: 0.1 });
        const propMaterial = new THREE.MeshStandardMaterial({ 
            color: propConfig.material === 'carbon' ? 0x111111 : 
                   propConfig.material === 'wood' ? 0x8B5A2B : 
                   propConfig.material === 'aluminum' ? 0xCCCCCC : 0x2196F3,
            roughness: propConfig.material === 'carbon' ? 0.8 : 0.3,
            metalness: propConfig.material === 'aluminum' ? 0.8 : 0.1,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < motorCount; i++) {
            const angle = (i * 2 * Math.PI) / motorCount;
            const x = Math.cos(angle) * motorDistance;
            const z = Math.sin(angle) * motorDistance;

            // Motor Stator Base
            const statorGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.01, 16);
            const stator = new THREE.Mesh(statorGeo, statorMat);
            stator.position.set(x, 0.01, z);
            stator.castShadow = true;
            this.uavGroup.add(stator);

            // Copper Windings Inside Motor
            const coilsGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.012, 12);
            const coils = new THREE.Mesh(coilsGeo, copperMat);
            coils.position.set(x, 0.018, z);
            this.uavGroup.add(coils);

            // Rotating Motor Bell
            const bellGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.014, 16);
            const bell = new THREE.Mesh(bellGeo, bellMat);
            bell.position.set(x, 0.024, z);
            bell.castShadow = true;
            this.uavGroup.add(bell);

            // Metallic Rotor Shaft
            const shaftGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.034, 8);
            const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, metalness: 0.9 });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.position.set(x, 0.035, z);
            this.uavGroup.add(shaft);

            // Lock Nut
            const nutGeo = new THREE.CylinderGeometry(0.006, 0.007, 0.005, 6);
            const nutMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.9 });
            const nut = new THREE.Mesh(nutGeo, nutMat);
            nut.position.set(x, 0.046, z);
            this.uavGroup.add(nut);

            // Propeller Assembly with Pivot Shifting Correction (Overlapping fixed!)
            const propGroup = new THREE.Group();
            
            const hubGeometry = new THREE.CylinderGeometry(0.009, 0.009, 0.004, 16);
            const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 });
            const hub = new THREE.Mesh(hubGeometry, hubMaterial);
            hub.position.set(0, 0, 0);
            propGroup.add(hub);

            const bladeCount = propConfig.blades;
            const bladeLength = actualPropRadius * 0.9;
            
            for (let j = 0; j < bladeCount; j++) {
                const bladeAngle = (j * 2 * Math.PI) / bladeCount;
                
                const bladeGeometry = new THREE.BoxGeometry(bladeLength, 0.002, 0.016);
                bladeGeometry.translate(bladeLength / 2, 0, 0); // PIVOT SHIFT CORRECTION
                
                const blade = new THREE.Mesh(bladeGeometry, propMaterial);
                blade.rotation.y = bladeAngle;
                blade.rotation.x = 0.08; 
                blade.castShadow = true;
                
                propGroup.add(blade);
            }
            
            propGroup.position.set(x, 0.045, z);
            this.propellers.push(propGroup);
            this.uavGroup.add(propGroup);
        }
    }

    buildBattery(batteryConfig) {
        const { cells, capacity } = batteryConfig;
        
        const width = 0.038 + (capacity / 16000) * 0.04;
        const height = 0.024 + (cells / 8) * 0.025;
        const depth = 0.07 + (capacity / 16000) * 0.05;

        const battGroup = new THREE.Group();
        
        const batteryGeometry = new THREE.BoxGeometry(width, height, depth);
        const batteryMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xECECEC,
            roughness: 0.5,
            metalness: 0.2
        });
        const battery = new THREE.Mesh(batteryGeometry, batteryMaterial);
        battery.castShadow = true;
        battGroup.add(battery);

        const labelGeo = new THREE.BoxGeometry(width + 0.002, height * 0.7, depth * 0.5);
        const labelMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, roughness: 0.6 });
        const label = new THREE.Mesh(labelGeo, labelMat);
        battGroup.add(label);

        const wireGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 8);
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xFF0000, roughness: 0.9 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.rotation.x = Math.PI / 2;
        wire.position.set(0, 0, depth / 2 + 0.01);
        battGroup.add(wire);

        battGroup.position.y = -0.03;
        this.uavGroup.add(battGroup);
    }

    buildPayload(payloadConfig) {
        const { type } = payloadConfig;
        if (type === 'none') return;

        let payloadGroup = new THREE.Group();
        let bodyGeo, bodyMat;

        if (type.includes('camera')) {
            const barGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8);
            const barMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.y = -0.06;
            payloadGroup.add(bar);

            const camWidth = type === 'camera-large' ? 0.05 : type === 'camera-medium' ? 0.04 : 0.03;
            bodyGeo = new THREE.BoxGeometry(camWidth, 0.03, 0.03);
            bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
            const camBody = new THREE.Mesh(bodyGeo, bodyMat);
            camBody.position.y = -0.08;
            camBody.castShadow = true;
            payloadGroup.add(camBody);

            const lensGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 16);
            const lensMat = new THREE.MeshBasicMaterial({ color: 0x00D2FF });
            const lens = new THREE.Mesh(lensGeo, lensMat);
            lens.rotation.x = Math.PI / 2;
            lens.position.set(0, -0.08, camWidth * 0.45);
            payloadGroup.add(lens);

        } else if (type === 'sensor' || type === 'thermal' || type === 'lidar') {
            const scannerColor = type === 'thermal' ? 0xFF5722 : type === 'lidar' ? 0x3f51b5 : 0x4CAF50;
            bodyGeo = new THREE.SphereGeometry(0.022, 16, 16);
            bodyMat = new THREE.MeshStandardMaterial({ color: scannerColor, roughness: 0.5, metalness: 0.7 });
            const scanner = new THREE.Mesh(bodyGeo, bodyMat);
            scanner.position.y = -0.07;
            scanner.castShadow = true;
            payloadGroup.add(scanner);

            const mountGeo = new THREE.BoxGeometry(0.01, 0.015, 0.01);
            const mount = new THREE.Mesh(mountGeo, new THREE.MeshStandardMaterial({ color: 0x000000 }));
            mount.position.y = -0.05;
            payloadGroup.add(mount);

        } else if (type === 'delivery') {
            bodyGeo = new THREE.BoxGeometry(0.08, 0.06, 0.08);
            bodyMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.9 });
            const cargo = new THREE.Mesh(bodyGeo, bodyMat);
            cargo.position.y = -0.08;
            cargo.castShadow = true;
            payloadGroup.add(cargo);

        } else if (type === 'gripper') {
            const mountGeo = new THREE.BoxGeometry(0.04, 0.01, 0.04);
            const gripperMount = new THREE.Mesh(mountGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
            gripperMount.position.y = -0.05;
            payloadGroup.add(gripperMount);

            const fingerGeo = new THREE.BoxGeometry(0.008, 0.03, 0.012);
            const fingerMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, metalness: 0.8 });
            
            const leftFinger = new THREE.Mesh(fingerGeo, fingerMat);
            leftFinger.position.set(-0.016, -0.07, 0);
            leftFinger.rotation.z = -0.15;
            leftFinger.castShadow = true;
            payloadGroup.add(leftFinger);

            const rightFinger = new THREE.Mesh(fingerGeo, fingerMat);
            rightFinger.position.set(0.016, -0.07, 0);
            rightFinger.rotation.z = 0.15;
            rightFinger.castShadow = true;
            payloadGroup.add(rightFinger);

        } else if (type === 'searchlight') {
            const shellGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.024, 16);
            const shellMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
            const shell = new THREE.Mesh(shellGeo, shellMat);
            shell.rotation.x = Math.PI / 3;
            shell.position.set(0, -0.07, 0.01);
            shell.castShadow = true;
            payloadGroup.add(shell);

            const glassGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.002, 16);
            const glassMat = new THREE.MeshBasicMaterial({ color: 0xFFFFA0 });
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.rotation.x = Math.PI / 3;
            glass.position.set(0, -0.08, 0.016);
            payloadGroup.add(glass);
        }

        this.uavGroup.add(payloadGroup);
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update OrbitControls
        if (this.controls && this.controls.update) {
            this.controls.update();
        }
        
        // Slowly spin propellers in preview for high-end micro-animation!
        if (this.propellers && this.propellers.length > 0) {
            for (let i = 0; i < this.propellers.length; i++) {
                const spinDirection = i % 2 === 0 ? 1 : -1;
                this.propellers[i].rotation.y += 0.04 * spinDirection;
            }
        }
        
        // Subtle floating movement and slow rotation for design lab preview!
        const now = performance.now();
        this.uavGroup.position.y = Math.sin(now / 1000) * 0.03; // 3cm floating wave!
        
        // Pulse the LED!
        if (this.ledMat) {
            const pulse = Math.sin(now / 300) * 0.4 + 0.6;
            this.ledMat.color.setRGB(0, pulse, 0); // Pulse green LED!
        }
        
        // Slow auto-rotation for preview if not dragging
        if (this.controls && !this.controls.state === -1) {
            // controls active
        } else if (this.uavGroup) {
            this.uavGroup.rotation.y += 0.0015;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}
