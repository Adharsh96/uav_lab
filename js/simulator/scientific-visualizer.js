// Scientific Visualizer for UAV Flight Simulator
class ScientificVisualizer {
    constructor(scene, uavModel, motorCount) {
        this.scene = scene;
        this.uavModel = uavModel;
        this.motorCount = motorCount;
        
        // Active visual toggles
        this.toggles = {
            forces: true,
            thrusts: true,
            trail: true,
            com: true,
            axes: true,
            stability: true,
            path: true,
            drag: true,
            wind: true
        };

        // Helpers references
        this.arrows = {};
        this.motorArrows = [];
        this.trailLine = null;
        this.trailPoints = [];
        this.maxTrailPoints = 200;
        this.comMesh = null;
        this.axisRings = [];
        this.stabilityRing = null;
        this.pathLine = null;
        this.windHelper = null;
        
        // Initialize visualization components
        this.init();
    }

    init() {
        this.visualGroup = new THREE.Group();
        this.scene.add(this.visualGroup);

        // 1. Force Vectors (Arrow helpers from center)
        const zeroDir = new THREE.Vector3(0, 1, 0);
        const zeroPos = new THREE.Vector3(0, 0, 0);
        
        // Net Force: Green
        this.arrows.netForce = new THREE.ArrowHelper(zeroDir, zeroPos, 0.1, 0x00FF00, 0.15, 0.05);
        // Gravity: Yellow/Orange
        this.arrows.gravity = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), zeroPos, 0.1, 0xFFD700, 0.15, 0.05);
        // Drag: Red
        this.arrows.drag = new THREE.ArrowHelper(zeroDir, zeroPos, 0.1, 0xFF3D00, 0.15, 0.05);
        
        this.visualGroup.add(this.arrows.netForce);
        this.visualGroup.add(this.arrows.gravity);
        this.visualGroup.add(this.arrows.drag);

        // 2. Individual Motor Thrust Vectors (Blue arrows shooting from motors)
        const motorArrowMat = new THREE.MeshBasicMaterial({ color: 0x00D2FF });
        for (let i = 0; i < this.motorCount; i++) {
            const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), zeroPos, 0.1, 0x00D2FF, 0.08, 0.03);
            this.motorArrows.push(arrow);
            this.visualGroup.add(arrow);
        }

        // 3. Center of Mass Indicator (Spherical target sphere)
        const comGroup = new THREE.Group();
        const comGeo = new THREE.SphereGeometry(0.025, 16, 16);
        const comMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, wireframe: true });
        const comSph = new THREE.Mesh(comGeo, comMat);
        comGroup.add(comSph);

        // Add classic black/yellow quadrant lines
        const ringGeoX = new THREE.RingGeometry(0.026, 0.028, 32);
        const ringMatY = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
        const rx = new THREE.Mesh(ringGeoX, ringMatY);
        const ry = rx.clone();
        ry.rotation.y = Math.PI / 2;
        const rz = rx.clone();
        rz.rotation.x = Math.PI / 2;
        comGroup.add(rx);
        comGroup.add(ry);
        comGroup.add(rz);
        
        this.comMesh = comGroup;
        this.visualGroup.add(this.comMesh);

        // 4. Motion Trails (Dynamic buffer line)
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxTrailPoints * 3);
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xFF3D00,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        this.trailLine = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(this.trailLine); // Trail exists in world space directly!

        // 5. Rotational Axis Rings (Roll, Pitch, Yaw)
        const createRing = (radius, color, rotationEuler) => {
            const ringGeo = new THREE.RingGeometry(radius - 0.003, radius + 0.003, 64);
            const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.copy(rotationEuler);
            return ringMesh;
        };

        // Pitch ring (Z-axis rotation - Green)
        this.axisRings.push(createRing(0.18, 0x2E7D32, new THREE.Euler(0, Math.PI / 2, 0)));
        // Roll ring (X-axis rotation - Red)
        this.axisRings.push(createRing(0.18, 0xC62828, new THREE.Euler(Math.PI / 2, 0, 0)));
        // Yaw ring (Y-axis rotation - Blue)
        this.axisRings.push(createRing(0.20, 0x1565C0, new THREE.Euler(0, 0, 0)));

        this.axisRings.forEach(ring => this.visualGroup.add(ring));

        // 6. Stability Ground Indicator (Target deviation projection ring)
        const ringGeo = new THREE.RingGeometry(0.15, 0.17, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xFF3D00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.stabilityRing = new THREE.Mesh(ringGeo, ringMat);
        this.stabilityRing.rotation.x = -Math.PI / 2;
        this.scene.add(this.stabilityRing); // Exists in world space projected on the ground

        // 7. Wind Direction sky indicator helper
        const windArrowDir = new THREE.Vector3(1, 0, 0);
        this.windHelper = new THREE.ArrowHelper(windArrowDir, new THREE.Vector3(0, 15, 0), 2.5, 0xFF3D00, 0.6, 0.2);
        this.scene.add(this.windHelper);

        // 8. Flight Corridor Path indicator (Draw dynamic line from drone to home coordinate)
        const pathGeo = new THREE.BufferGeometry();
        const pathPositions = new Float32Array(6); // 2 points (x,y,z) -> drone and home
        pathGeo.setAttribute('position', new THREE.BufferAttribute(pathPositions, 3));
        const pathMat = new THREE.LineDashedMaterial({
            color: 0x1565C0,
            dashSize: 0.2,
            gapSize: 0.1,
            linewidth: 2
        });
        this.pathLine = new THREE.Line(pathGeo, pathMat);
        this.scene.add(this.pathLine);
    }

    update(physicsState, controls, environmentConfig, dt) {
        if (!this.uavModel || !this.uavModel.group) return;
        
        const pos = physicsState.position;
        const rot = physicsState.rotation;
        
        // Sync Visualizer Group coordinates & orientation directly with Drone
        this.visualGroup.position.copy(pos);
        this.visualGroup.quaternion.copy(rot);

        // 1. Update Force Vectors
        if (this.toggles.forces) {
            this.arrows.netForce.visible = true;
            this.arrows.gravity.visible = true;
            
            // Net Force calculation
            const mass = physicsState.mass || 1.5; // kg
            const netAcc = physicsState.acceleration.clone();
            const netForceMag = netAcc.length() * mass;
            if (netForceMag > 0.05) {
                const netDir = netAcc.clone().normalize();
                // Rotate to local frame because this.visualGroup is already rotated!
                const localNetDir = netDir.applyQuaternion(rot.clone().invert());
                this.arrows.netForce.setDirection(localNetDir);
                this.arrows.netForce.setLength(Math.min(1.5, netForceMag * 0.12), 0.15, 0.05);
            } else {
                this.arrows.netForce.setLength(0.001);
            }

            // Gravity helper is world space downward. In local group, it rotates opposite to rotation!
            const localGravDir = new THREE.Vector3(0, -1, 0).applyQuaternion(rot.clone().invert());
            this.arrows.gravity.setDirection(localGravDir);
            this.arrows.gravity.setLength(Math.min(1.2, (mass * 9.81) * 0.08), 0.12, 0.04);
        } else {
            this.arrows.netForce.visible = false;
            this.arrows.gravity.visible = false;
        }

        // 2. Drag Force Direction Arrow
        if (this.toggles.drag) {
            this.arrows.drag.visible = true;
            const velocity = physicsState.velocity.clone();
            const velMag = velocity.length();
            if (velMag > 0.1) {
                const dragDir = velocity.clone().negate().normalize();
                const localDragDir = dragDir.applyQuaternion(rot.clone().invert());
                this.arrows.drag.setDirection(localDragDir);
                // Scale arrow length based on square velocity index
                const dragLen = Math.min(1.5, velMag * velMag * 0.03 + velMag * 0.05);
                this.arrows.drag.setLength(dragLen, 0.15, 0.05);
            } else {
                this.arrows.drag.setLength(0.001);
            }
        } else {
            this.arrows.drag.visible = false;
        }

        // 3. Motor Thrust Vectors
        if (this.toggles.thrusts && physicsState.motorSpeeds && physicsState.motorSpeeds.length > 0) {
            const frameSize = this.uavModel.config.frame.size / 1000;
            const motorDistance = frameSize * 0.85 / 2;
            const motorCount = physicsState.motorSpeeds.length;

            for (let i = 0; i < this.motorCount; i++) {
                const arrow = this.motorArrows[i];
                if (!arrow) continue;

                arrow.visible = true;
                const motorSpeed = physicsState.motorSpeeds[i] || 0;
                
                // Retrieve physical motor coordinate relative to chassis center
                const angle = (i * 2 * Math.PI) / motorCount;
                const motorX = Math.cos(angle) * motorDistance;
                const motorZ = Math.sin(angle) * motorDistance;

                arrow.position.set(motorX, 0.04, motorZ);
                // Thrust always points straight UP relative to motor bell housing
                arrow.setDirection(new THREE.Vector3(0, 1, 0));
                arrow.setLength(Math.max(0.01, motorSpeed * 0.4), 0.06, 0.02);
            }
        } else {
            this.motorArrows.forEach(arrow => arrow.visible = false);
        }

        // 4. Center of Mass indicator
        if (this.comMesh) {
            this.comMesh.visible = this.toggles.com;
        }

        // 5. Rotational axes rings
        this.axisRings.forEach(ring => {
            ring.visible = this.toggles.axes;
        });

        // 6. Motion trail updates
        if (this.toggles.trail) {
            this.trailLine.visible = true;
            
            // Log location points
            this.trailPoints.push(pos.clone());
            if (this.trailPoints.length > this.maxTrailPoints) {
                this.trailPoints.shift();
            }

            const positions = this.trailLine.geometry.attributes.position.array;
            for (let i = 0; i < this.maxTrailPoints; i++) {
                const point = this.trailPoints[i] || pos;
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            }
            this.trailLine.geometry.attributes.position.needsUpdate = true;
        } else {
            this.trailLine.visible = false;
            this.trailPoints = []; // Flush coordinates
        }

        // 7. Ground Projection Deviation Ring
        if (this.toggles.stability) {
            this.stabilityRing.visible = true;
            // Project stability ring directly under drone coordinates
            this.stabilityRing.position.set(pos.x, 0.02, pos.z);
            
            // Adjust ring scale based on pitch/roll deviation to represent wobble indices
            const euler = new THREE.Euler().setFromQuaternion(rot);
            const deviation = Math.sqrt(euler.x * euler.x + euler.z * euler.z);
            const ringScale = 1.0 + deviation * 4.5;
            this.stabilityRing.scale.set(ringScale, ringScale, 1);
            
            // Fade ring color depending on target pitch tilt stability values
            if (deviation > 0.4) {
                this.stabilityRing.material.color.setHex(0xC62828); // Unstable red
            } else {
                this.stabilityRing.material.color.setHex(0xFF3D00); // Standard accent orange
            }
        } else {
            this.stabilityRing.visible = false;
        }

        // 8. Flight Corridor Path Corridor (Dynamic connector to Home)
        if (this.toggles.path) {
            this.pathLine.visible = true;
            const pathPositions = this.pathLine.geometry.attributes.position.array;
            
            // Point 0 is drone position, Point 1 is Home base
            pathPositions[0] = pos.x;
            pathPositions[1] = pos.y;
            pathPositions[2] = pos.z;
            
            pathPositions[3] = 0;
            pathPositions[4] = 0.1;
            pathPositions[5] = 0;
            
            this.pathLine.geometry.attributes.position.needsUpdate = true;
            this.pathLine.computeLineDistances(); // Compute dashes
        } else {
            this.pathLine.visible = false;
        }

        // 9. Wind Arrow Position Vane updates
        if (this.toggles.wind) {
            this.windHelper.visible = true;
            // Place wind arrow at (drone.x + offset, drone.y + 4, drone.z - offset) so it's always in view!
            this.windHelper.position.set(pos.x - 1.5, pos.y + 1.2, pos.z - 1.5);
            
            const windSpeed = environmentConfig.windSpeed || 0;
            const windDirRad = (environmentConfig.windDirection || 0) * Math.PI / 180;
            if (windSpeed > 0) {
                // Vector pointing in direction wind is blowing
                const dir = new THREE.Vector3(
                    Math.sin(windDirRad),
                    0,
                    Math.cos(windDirRad)
                ).normalize();
                
                this.windHelper.setDirection(dir);
                this.windHelper.setLength(1.0 + windSpeed * 0.05, 0.3, 0.1);
            } else {
                this.windHelper.setLength(0.001);
            }
        } else {
            this.windHelper.visible = false;
        }
    }

    setToggle(key, value) {
        if (key in this.toggles) {
            this.toggles[key] = value;
            
            // Special visibility toggles
            if (key === 'com' && this.comMesh) this.comMesh.visible = value;
            if (key === 'axes') this.axisRings.forEach(ring => ring.visible = value);
            if (key === 'trail' && !value) {
                this.trailLine.visible = false;
                this.trailPoints = [];
            }
            if (key === 'stability' && !value) this.stabilityRing.visible = false;
            if (key === 'path' && !value) this.pathLine.visible = false;
            if (key === 'wind' && !value) this.windHelper.visible = false;
        }
    }

    destroy() {
        if (this.visualGroup) {
            this.scene.remove(this.visualGroup);
        }
        if (this.trailLine) {
            this.scene.remove(this.trailLine);
        }
        if (this.stabilityRing) {
            this.scene.remove(this.stabilityRing);
        }
        if (this.pathLine) {
            this.scene.remove(this.pathLine);
        }
        if (this.windHelper) {
            this.scene.remove(this.windHelper);
        }
    }
}
