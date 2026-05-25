// UAV 3D Model for Simulator (Upgraded Brutalist & Detailed Assembly)
class UAVModel {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.group = new THREE.Group();
        this.propellers = [];
        this.statusLed = null;
        this.lastLedFlash = 0;
        this.build();
    }

    build() {
        const { frame, motors, propellers, battery, flightController, payload } = this.config;
        
        // Build chassis frames (Top plate, Bottom plate, Stand-offs, Stack)
        this.buildChassis(frame, flightController);
        
        // Build detailed motors and propellers
        this.buildMotorsAndProps(frame, motors, propellers);
        
        // Build battery pack
        this.buildBattery(battery);
        
        // Build payload
        this.buildPayload(payload);
        
        // Add to scene
        this.scene.add(this.group);
    }

    buildChassis(frameConfig, fcConfig) {
        const { type, size, material } = frameConfig;
        const armLength = (size / 1000); // Full frame width in meters
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
        this.group.add(bottomPlate);

        // 2. Top Chassis Plate
        const topPlateGeo = new THREE.BoxGeometry(0.11, 0.004, 0.11);
        const topPlate = new THREE.Mesh(topPlateGeo, frameMat);
        topPlate.position.y = 0.02;
        topPlate.castShadow = true;
        this.group.add(topPlate);

        // 3. Aluminum Frame Stand-offs/Spacers (Connect plates)
        const spacerGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8);
        const spacerMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, metalness: 0.9, roughness: 0.1 }); // Accent color!
        
        const spacerCoords = [
            {x: 0.045, z: 0.045}, {x: -0.045, z: 0.045},
            {x: 0.045, z: -0.045}, {x: -0.045, z: -0.045}
        ];
        
        spacerCoords.forEach(coords => {
            const spacer = new THREE.Mesh(spacerGeo, spacerMat);
            spacer.position.set(coords.x, 0.005, coords.z);
            spacer.castShadow = true;
            this.group.add(spacer);
        });

        // 4. Flight Controller Stack (inside plates)
        const stackGeo = new THREE.BoxGeometry(0.035, 0.012, 0.035);
        const stackMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 }); // PCB Green
        const fcStack = new THREE.Mesh(stackGeo, stackMat);
        fcStack.position.set(0, 0.005, 0);
        fcStack.castShadow = true;
        this.group.add(fcStack);

        // Blinking FC Status LED
        const ledGeo = new THREE.SphereGeometry(0.003, 8, 8);
        this.ledMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
        this.statusLed = new THREE.Mesh(ledGeo, this.ledMat);
        this.statusLed.position.set(0.012, 0.012, 0.012);
        this.group.add(this.statusLed);

        // 5. GPS Antenna Mast (if GPS enabled)
        if (fcConfig.type === 'gps' || fcConfig.type === 'advanced' || fcConfig.type === 'pixhawk') {
            const mastGroup = new THREE.Group();
            
            // Mast rod
            const rodGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.06, 8);
            const rodMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
            const rod = new THREE.Mesh(rodGeo, rodMat);
            rod.position.y = 0.03;
            rod.castShadow = true;
            mastGroup.add(rod);

            // GPS puck receiver
            const puckGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.006, 16);
            const puckMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 }); // High-end white GPS puck
            const puck = new THREE.Mesh(puckGeo, puckMat);
            puck.position.y = 0.06;
            puck.castShadow = true;
            mastGroup.add(puck);

            mastGroup.position.set(-0.03, 0.02, -0.03);
            this.group.add(mastGroup);
        }

        // 6. Main Arms & ESC Mounting
        const motorCount = type.includes('quad') ? 4 : type === 'hexa' ? 6 : 8;
        const armGeometry = new THREE.BoxGeometry(motorDistance, 0.008, 0.018); // Elegant slim arms
        const armClampGeo = new THREE.BoxGeometry(0.02, 0.012, 0.022); // Arm clamp mounts
        const clampMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.9 });
        
        const escGeo = new THREE.BoxGeometry(0.032, 0.005, 0.015);
        const escMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }); // Shrink wrap black ESC

        for (let i = 0; i < motorCount; i++) {
            const angle = (i * 2 * Math.PI) / motorCount;
            
            // Arm rotation and positioning
            const armGroup = new THREE.Group();
            
            const arm = new THREE.Mesh(armGeometry, frameMat);
            arm.position.x = motorDistance / 2;
            arm.castShadow = true;
            arm.receiveShadow = true;
            armGroup.add(arm);

            // Arm clamp base
            const clamp = new THREE.Mesh(armClampGeo, clampMat);
            clamp.position.x = 0.06;
            clamp.position.y = 0.002;
            clamp.castShadow = true;
            armGroup.add(clamp);

            // Mounting ESC on each arm
            const esc = new THREE.Mesh(escGeo, escMat);
            esc.position.set(motorDistance * 0.45, 0.006, 0);
            esc.castShadow = true;
            armGroup.add(esc);

            // Wire rendering from ESC to body center
            const wireGeo = new THREE.CylinderGeometry(0.001, 0.001, motorDistance * 0.5, 8);
            const wireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const wire = new THREE.Mesh(wireGeo, wireMat);
            wire.rotation.z = Math.PI / 2;
            wire.position.set(motorDistance * 0.22, 0.004, 0.003);
            armGroup.add(wire);

            armGroup.rotation.y = angle;
            this.group.add(armGroup);
        }
    }

    buildMotorsAndProps(frameConfig, motorConfig, propConfig) {
        const { type, size } = frameConfig;
        const armLength = (size / 1000); 
        const motorCount = type.includes('quad') ? 4 : type === 'hexa' ? 6 : 8;
        const propRadius = propConfig.size * 0.0254 / 2;
        const motorDistance = armLength * 0.85 / 2;
        
        // Propeller radius sizing safety check
        const maxPropRadius = motorDistance * 0.95;
        const actualPropRadius = Math.min(propRadius, maxPropRadius);

        // Brushless motor materials
        const statorMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.2 });
        const copperMat = new THREE.MeshStandardMaterial({ color: 0xD2691E, metalness: 0.7, roughness: 0.3 }); // Copper windings!
        const bellMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, metalness: 0.9, roughness: 0.1 }); // Vibrant neon bell!
        const propMaterial = new THREE.MeshStandardMaterial({ 
            color: propConfig.material === 'carbon' ? 0x111111 : 
                   propConfig.material === 'wood' ? 0x8B5A2B : 
                   propConfig.material === 'aluminum' ? 0xCCCCCC : 0x2196F3,
            roughness: propConfig.material === 'carbon' ? 0.8 : 0.3,
            metalness: propConfig.material === 'aluminum' ? 0.8 : 0.1,
            transparent: true,
            opacity: 0.75
        });

        for (let i = 0; i < motorCount; i++) {
            const angle = (i * 2 * Math.PI) / motorCount;
            const x = Math.cos(angle) * motorDistance;
            const z = Math.sin(angle) * motorDistance;

            // 1. Motor Stator Base
            const statorGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.01, 16);
            const stator = new THREE.Mesh(statorGeo, statorMat);
            stator.position.set(x, 0.01, z);
            stator.castShadow = true;
            this.group.add(stator);

            // 2. Copper Windings Inside Motor
            const coilsGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.012, 12);
            const coils = new THREE.Mesh(coilsGeo, copperMat);
            coils.position.set(x, 0.018, z);
            this.group.add(coils);

            // 3. Rotating Motor Bell (Outter housing cover)
            const bellGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.014, 16);
            const bell = new THREE.Mesh(bellGeo, bellMat);
            bell.position.set(x, 0.024, z);
            bell.castShadow = true;
            this.group.add(bell);

            // 4. Metallic Rotor Shaft
            const shaftGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.034, 8);
            const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, metalness: 0.9 });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.position.set(x, 0.035, z);
            this.group.add(shaft);

            // 5. Anodized Propeller Lock Nut
            const nutGeo = new THREE.CylinderGeometry(0.006, 0.007, 0.005, 6);
            const nutMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.9 });
            const nut = new THREE.Mesh(nutGeo, nutMat);
            nut.position.set(x, 0.046, z);
            this.group.add(nut);

            // 6. Propeller Assembly with Pivot Shifting Correction (Solves overlapping!)
            const propGroup = new THREE.Group();
            
            // Propeller Hub centerpiece
            const hubGeometry = new THREE.CylinderGeometry(0.009, 0.009, 0.004, 16);
            const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 });
            const hub = new THREE.Mesh(hubGeometry, hubMaterial);
            hub.position.set(0, 0, 0);
            propGroup.add(hub);

            // Propeller blades extending from center
            const bladeCount = propConfig.blades;
            const bladeLength = actualPropRadius * 0.9;
            
            // Build separate blades rotated radially around hub center
            for (let j = 0; j < bladeCount; j++) {
                const bladeAngle = (j * 2 * Math.PI) / bladeCount;
                
                // Shift box geometry so its pivot is exactly at the shaft coordinate (0,0,0)
                const bladeGeometry = new THREE.BoxGeometry(bladeLength, 0.002, 0.016);
                bladeGeometry.translate(bladeLength / 2, 0, 0); // PIVOT SHIFT CORRECTION
                
                // Slight aerodynamic twist to the blade
                const blade = new THREE.Mesh(bladeGeometry, propMaterial);
                blade.rotation.y = bladeAngle;
                blade.rotation.x = 0.08; // Aero pitch angle!
                blade.castShadow = true;
                
                propGroup.add(blade);
            }
            
            propGroup.position.set(x, 0.045, z);
            this.propellers.push(propGroup);
            this.group.add(propGroup);
        }
    }

    buildBattery(batteryConfig) {
        const { cells, capacity } = batteryConfig;
        
        const width = 0.038 + (capacity / 16000) * 0.04;
        const height = 0.024 + (cells / 8) * 0.025;
        const depth = 0.07 + (capacity / 16000) * 0.05;

        // Realistic layered LiPo Battery pack block
        const battGroup = new THREE.Group();
        
        const batteryGeometry = new THREE.BoxGeometry(width, height, depth);
        const batteryMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xECECEC, // Off-white/silver shrinkwrap
            roughness: 0.5,
            metalness: 0.2
        });
        const battery = new THREE.Mesh(batteryGeometry, batteryMaterial);
        battery.castShadow = true;
        battGroup.add(battery);

        // Add yellow/accent LiPo label strap
        const labelGeo = new THREE.BoxGeometry(width + 0.002, height * 0.7, depth * 0.5);
        const labelMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, roughness: 0.6 }); // Accent red strap
        const label = new THREE.Mesh(labelGeo, labelMat);
        battGroup.add(label);

        // Battery power output lead wires
        const wireGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 8);
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xFF0000, roughness: 0.9 }); // Red silicone wires
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.rotation.x = Math.PI / 2;
        wire.position.set(0, 0, depth / 2 + 0.01);
        battGroup.add(wire);

        battGroup.position.y = -0.03;
        this.group.add(battGroup);
    }

    buildPayload(payloadConfig) {
        const { type } = payloadConfig;
        if (type === 'none') return;

        let payloadGroup = new THREE.Group();
        let bodyGeo, bodyMat;

        if (type.includes('camera')) {
            // Camera gimbal support bar
            const barGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8);
            const barMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.y = -0.06;
            payloadGroup.add(bar);

            // Camera chassis (Brutalist matte black sensor housing)
            const camWidth = type === 'camera-large' ? 0.05 : type === 'camera-medium' ? 0.04 : 0.03;
            bodyGeo = new THREE.BoxGeometry(camWidth, 0.03, 0.03);
            bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
            const camBody = new THREE.Mesh(bodyGeo, bodyMat);
            camBody.position.y = -0.08;
            camBody.castShadow = true;
            payloadGroup.add(camBody);

            // Glowing blue lens glass
            const lensGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 16);
            const lensMat = new THREE.MeshBasicMaterial({ color: 0x00D2FF });
            const lens = new THREE.Mesh(lensGeo, lensMat);
            lens.rotation.x = Math.PI / 2;
            lens.position.set(0, -0.08, camWidth * 0.45);
            payloadGroup.add(lens);

        } else if (type === 'sensor' || type === 'thermal' || type === 'lidar') {
            // Scientific scanning instruments
            const scannerColor = type === 'thermal' ? 0xFF5722 : type === 'lidar' ? 0x3f51b5 : 0x4CAF50;
            bodyGeo = new THREE.SphereGeometry(0.022, 16, 16);
            bodyMat = new THREE.MeshStandardMaterial({ color: scannerColor, roughness: 0.5, metalness: 0.7 });
            const scanner = new THREE.Mesh(bodyGeo, bodyMat);
            scanner.position.y = -0.07;
            scanner.castShadow = true;
            payloadGroup.add(scanner);

            // Sensor mount arm
            const mountGeo = new THREE.BoxGeometry(0.01, 0.015, 0.01);
            const mount = new THREE.Mesh(mountGeo, new THREE.MeshStandardMaterial({ color: 0x000000 }));
            mount.position.y = -0.05;
            payloadGroup.add(mount);

        } else if (type === 'delivery') {
            // Cardboard Delivery cargo container
            bodyGeo = new THREE.BoxGeometry(0.08, 0.06, 0.08);
            bodyMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.9 }); // Cardboard tan
            const cargo = new THREE.Mesh(bodyGeo, bodyMat);
            cargo.position.y = -0.08;
            cargo.castShadow = true;
            payloadGroup.add(cargo);

        } else if (type === 'gripper') {
            // Mechanical claw arms
            const mountGeo = new THREE.BoxGeometry(0.04, 0.01, 0.04);
            const gripperMount = new THREE.Mesh(mountGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
            gripperMount.position.y = -0.05;
            payloadGroup.add(gripperMount);

            const fingerGeo = new THREE.BoxGeometry(0.008, 0.03, 0.012);
            const fingerMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00, metalness: 0.8 }); // Orange robotic arms
            
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
            // Super-bright searchlight unit
            const shellGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.024, 16);
            const shellMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
            const shell = new THREE.Mesh(shellGeo, shellMat);
            shell.rotation.x = Math.PI / 3; // Angled forward down
            shell.position.set(0, -0.07, 0.01);
            shell.castShadow = true;
            payloadGroup.add(shell);

            const glassGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.002, 16);
            const glassMat = new THREE.MeshBasicMaterial({ color: 0xFFFFA0 }); // Bright warm white light emitter
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.rotation.x = Math.PI / 3;
            glass.position.set(0, -0.08, 0.016);
            payloadGroup.add(glass);
        }

        this.group.add(payloadGroup);
    }

    update(state) {
        // Update 3D position
        this.group.position.copy(state.position);
        
        // Update 3D rotation
        this.group.quaternion.copy(state.rotation);
        
        // Spin propellers visually based on physics motor speeds
        if (state.motorSpeeds && this.propellers.length > 0) {
            for (let i = 0; i < this.propellers.length; i++) {
                const speed = state.motorSpeeds[i] || 0;
                const spinDirection = i % 2 === 0 ? 1 : -1;
                // Accumulate rotation angle based on spin speed
                this.propellers[i].rotation.y += speed * 0.5 * spinDirection;
            }
        }

        // Flashing LED status tracker in flight
        const now = performance.now();
        if (state.isArmed) {
            // Flash LED quickly (every 250ms)
            if (now - this.lastLedFlash > 250) {
                const isRed = this.ledMat.color.getHex() === 0xFF0000;
                this.ledMat.color.setHex(isRed ? 0x00FF00 : 0xFF0000); // Toggle Red/Green
                this.lastLedFlash = now;
            }
        } else {
            // Red breathing light when disarmed
            const glowVal = Math.sin(now / 500) * 0.5 + 0.5;
            this.ledMat.color.setRGB(glowVal, 0, 0);
        }
    }

    getPosition() {
        return this.group.position.clone();
    }

    getRotation() {
        return this.group.quaternion.clone();
    }

    remove() {
        this.scene.remove(this.group);
    }
}
