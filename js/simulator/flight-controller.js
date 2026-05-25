class FlightController {
    constructor() {
        this.pidController = new CascadedPIDController();
        
        // Control inputs
        this.controls = {
            throttle: 0,
            pitch: 0,
            roll: 0,
            yaw: 0,
            cameraMode: 'chase'
        };
        
        // Keyboard state
        this.keys = {};
        
        // Smooth keyboard interpolation state
        this.keyboardPitch = 0;
        this.keyboardRoll = 0;
        this.keyboardYaw = 0;
        
        // Mouse/touch stick state
        this.leftStick = { x: 0, y: -1 }; // y = -1 for 0 throttle
        this.rightStick = { x: 0, y: 0 };
        this.draggingStick = null;
        this.stickElements = {};
        
        // Flight modes
        this.altitudeHold = false;
        this.positionHold = false;
        this.returnToHome = false;
        this.loiterMode = false;
        this.loiterPosition = new THREE.Vector3();
        this.loiterHeading = 0; // Saved heading for heading-hold in loiter
        
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            // Prevent default scrolling for game controls
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) || e.key === ' ') {
                e.preventDefault();
            }

            if (e.key === ' ') {
                this.emergencyStop();
            }
            if (key === 'r') {
                this.resetUAV();
            }
            if (key === 'c') {
                this.cycleCamera();
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
        });

        // RC Sticks (mouse + touch)
        this.setupStickControls('left-stick', 'left-stick-boundary', (x, y) => {
            this.leftStick = { x, y };
        });

        this.setupStickControls('right-stick', 'right-stick-boundary', (x, y) => {
            this.rightStick = { x, y };
        });

        // Global mouse handlers for stick dragging
        document.addEventListener('mousemove', (e) => this.handleStickDragFromCoords(e.clientX, e.clientY));
        document.addEventListener('mouseup', () => this.handleStickRelease());

        // Global touch handlers for stick dragging
        document.addEventListener('touchmove', (e) => {
            if (!this.draggingStick) return;
            e.preventDefault();
            const touch = e.touches[0];
            this.handleStickDragFromCoords(touch.clientX, touch.clientY);
        }, { passive: false });
        document.addEventListener('touchend', () => this.handleStickRelease());
        document.addEventListener('touchcancel', () => this.handleStickRelease());

        // Buttons
        document.getElementById('arm-button').addEventListener('click', () => this.toggleArm());
        document.getElementById('rth-button').addEventListener('click', () => this.activateRTH());
        document.getElementById('emergency-button').addEventListener('click', () => this.emergencyStop());
        
        const loiterBtn = document.getElementById('loiter-button');
        if (loiterBtn) {
            loiterBtn.addEventListener('click', () => this.toggleLoiter());
        }

        // Camera mode
        document.getElementById('camera-mode').addEventListener('change', (e) => {
            this.controls.cameraMode = e.target.value;
        });
    }

    setupStickControls(stickId, boundaryId, callback) {
        const stick = document.getElementById(stickId);
        const boundary = document.getElementById(boundaryId);
        
        this.stickElements[stickId] = { stick, boundary, callback };

        // Mouse support
        boundary.addEventListener('mousedown', (e) => {
            this.draggingStick = stickId;
            this.handleStickDragFromCoords(e.clientX, e.clientY);
        });

        // Touch support
        boundary.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.draggingStick = stickId;
            const touch = e.touches[0];
            this.handleStickDragFromCoords(touch.clientX, touch.clientY);
        }, { passive: false });
    }

    handleStickDragFromCoords(clientX, clientY) {
        if (!this.draggingStick) return;

        const { stick, boundary, callback } = this.stickElements[this.draggingStick];
        const rect = boundary.getBoundingClientRect();
        const radius = rect.width / 2;
        const centerX = rect.left + radius;
        const centerY = rect.top + radius;
        const maxRange = radius - 20;
        
        let x = clientX - centerX;
        let y = clientY - centerY;
        
        const distance = Math.sqrt(x * x + y * y);
        if (distance > maxRange) {
            const angle = Math.atan2(y, x);
            x = Math.cos(angle) * maxRange;
            y = Math.sin(angle) * maxRange;
        }
        
        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        const normalizedX = x / maxRange;
        const normalizedY = -y / maxRange;
        
        callback(normalizedX, normalizedY);
    }

    handleStickRelease() {
        if (!this.draggingStick) return;

        const { stick, boundary, callback } = this.stickElements[this.draggingStick];
        const radius = boundary.getBoundingClientRect().width / 2;
        const maxRange = radius - 20;

        if (this.draggingStick === 'right-stick') {
            stick.style.transform = 'translate(-50%, -50%)';
            callback(0, 0);
        } else if (this.draggingStick === 'left-stick') {
            const currentY = this.leftStick.y;
            stick.style.transform = `translate(-50%, calc(-50% + ${-currentY * maxRange}px))`;
            callback(0, currentY);
        }
        
        this.draggingStick = null;
    }

    update(physicsState, dt) {
        // Detect active manual input (sticks or keys)
        const hasManualInput = this.hasActiveInput();
        
        // Cancel autonomous modes on deliberate manual input
        if (hasManualInput && (this.loiterMode || this.returnToHome)) {
            if (this.loiterMode) this.toggleLoiter();
            if (this.returnToHome) this.activateRTH();
        }
        
        if (this.loiterMode || this.returnToHome) {
            // Autonomous mode — stabilization controls the drone entirely
            this.applyStabilization(physicsState, dt);
        } else {
            // Manual control from sticks and keyboard
            this.updateFromSticks();
            this.updateFromKeyboard(dt);
            
            // Altitude hold supplements manual control
            if (this.altitudeHold) {
                this.applyStabilization(physicsState, dt);
            }
        }
        
        return this.controls;
    }

    hasActiveInput() {
        // Returns true if the user is actively pushing directional keys or sticks
        const keyActive = this.keys['arrowup'] || this.keys['arrowdown'] || 
                         this.keys['arrowleft'] || this.keys['arrowright'] ||
                         this.keys['a'] || this.keys['d'] ||
                         this.keys['w'] || this.keys['s'];
        const stickActive = this.draggingStick === 'right-stick' ||
                           (this.draggingStick === 'left-stick' && Math.abs(this.leftStick.x) > 0.1);
        return keyActive || stickActive;
    }

    updateFromSticks() {
        // Set base values from current stick positions
        if (this.draggingStick === 'left-stick') {
            this.controls.throttle = (this.leftStick.y + 1) / 2;
        }
        this.controls.yaw = this.leftStick.x;
        this.controls.pitch = this.rightStick.y;
        this.controls.roll = this.rightStick.x;
    }

    updateFromKeyboard(dt) {
        const rampUp = 5.0;   // Rate at which inputs ramp toward target
        const rampDown = 8.0; // Rate at which inputs decay back to center

        // Throttle (W/S) — incremental, already smooth
        if (this.keys['w']) {
            this.controls.throttle = Math.min(1, this.controls.throttle + 0.02);
        }
        if (this.keys['s']) {
            this.controls.throttle = Math.max(0, this.controls.throttle - 0.02);
        }
        
        // --- Smooth Yaw (A/D) ---
        let targetYaw = 0;
        if (this.keys['a']) targetYaw = -0.7;
        else if (this.keys['d']) targetYaw = 0.7;
        
        if (targetYaw !== 0) {
            this.keyboardYaw += (targetYaw - this.keyboardYaw) * Math.min(1, rampUp * dt);
        } else {
            this.keyboardYaw *= Math.max(0, 1 - rampDown * dt);
            if (Math.abs(this.keyboardYaw) < 0.01) this.keyboardYaw = 0;
        }
        
        // --- Smooth Pitch (Up/Down Arrow) ---
        let targetPitch = 0;
        if (this.keys['arrowup']) targetPitch = 0.7;
        else if (this.keys['arrowdown']) targetPitch = -0.7;
        
        if (targetPitch !== 0) {
            this.keyboardPitch += (targetPitch - this.keyboardPitch) * Math.min(1, rampUp * dt);
        } else {
            this.keyboardPitch *= Math.max(0, 1 - rampDown * dt);
            if (Math.abs(this.keyboardPitch) < 0.01) this.keyboardPitch = 0;
        }
        
        // --- Smooth Roll (Left/Right Arrow) ---
        let targetRoll = 0;
        if (this.keys['arrowleft']) targetRoll = -0.7;
        else if (this.keys['arrowright']) targetRoll = 0.7;
        
        if (targetRoll !== 0) {
            this.keyboardRoll += (targetRoll - this.keyboardRoll) * Math.min(1, rampUp * dt);
        } else {
            this.keyboardRoll *= Math.max(0, 1 - rampDown * dt);
            if (Math.abs(this.keyboardRoll) < 0.01) this.keyboardRoll = 0;
        }
        
        // Override stick defaults with smoothed keyboard values
        if (Math.abs(this.keyboardYaw) > 0.01) this.controls.yaw = this.keyboardYaw;
        if (Math.abs(this.keyboardPitch) > 0.01) this.controls.pitch = this.keyboardPitch;
        if (Math.abs(this.keyboardRoll) > 0.01) this.controls.roll = this.keyboardRoll;
        
        this.updateLeftStickVisual();
        this.updateRightStickVisual();
    }
    
    updateLeftStickVisual() {
        const stick = document.getElementById('left-stick');
        const boundary = document.getElementById('left-stick-boundary');
        if (!stick || !boundary) return;
        
        const rect = boundary.getBoundingClientRect();
        const maxRange = rect.width / 2 - 20;
        
        const y = -(this.controls.throttle * 2 - 1) * maxRange;
        const x = this.controls.yaw * maxRange;
        
        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
    
    updateRightStickVisual() {
        const stick = document.getElementById('right-stick');
        const boundary = document.getElementById('right-stick-boundary');
        if (!stick || !boundary) return;
        
        const rect = boundary.getBoundingClientRect();
        const maxRange = rect.width / 2 - 20;
        
        const x = this.controls.roll * maxRange;
        const y = -this.controls.pitch * maxRange;
        
        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    applyStabilization(physicsState, dt) {
        // Get current orientation
        const euler = new THREE.Euler().setFromQuaternion(physicsState.rotation);
        const currentRoll = euler.x;
        const currentPitch = euler.z;
        const currentYaw = euler.y;
        
        // Altitude hold (standalone, supplements manual control)
        if (this.altitudeHold && !this.loiterMode && !this.returnToHome) {
            const desiredAltitude = 5; // 5 meters
            const throttleCorrection = this.pidController.updateAltitude(
                desiredAltitude,
                physicsState.position.y,
                dt
            );
            this.controls.throttle += throttleCorrection;
        }
        
        // Loiter Mode: Maintains GPS position, altitude, and heading
        if (this.loiterMode) {
            // 1. Altitude stabilization (maintain loiter Y position)
            const hoverThrottle = (window.uavSimulator && window.uavSimulator.physics) ? 
                                  (window.uavSimulator.physics.getHoverThrottle() / 100) : 0.5;
            
            const throttleCorrection = this.pidController.updateAltitude(
                this.loiterPosition.y,
                physicsState.position.y,
                dt
            );
            this.controls.throttle = hoverThrottle + throttleCorrection;

            // 2. Horizontal position stabilization (maintain loiter X, Z coordinates)
            const posCorrection = this.pidController.updatePosition(
                this.loiterPosition.x,
                this.loiterPosition.z,
                physicsState.position.x,
                physicsState.position.z,
                dt
            );

            // Translate corrections to local body coordinates based on current heading
            const heading = currentYaw;
            const cosYaw = Math.cos(heading);
            const sinYaw = Math.sin(heading);
            
            const localCorrectionX = posCorrection.x * cosYaw + posCorrection.y * sinYaw;
            const localCorrectionZ = -posCorrection.x * sinYaw + posCorrection.y * cosYaw;

            // Constrain stabilization tilt to safe angles
            this.controls.pitch = Math.max(-0.3, Math.min(0.3, localCorrectionX));
            this.controls.roll = Math.max(-0.3, Math.min(0.3, localCorrectionZ));
            
            // 3. Heading hold — actively maintain saved yaw heading via P-controller
            let yawError = this.loiterHeading - currentYaw;
            // Normalize to [-PI, PI]
            while (yawError < -Math.PI) yawError += Math.PI * 2;
            while (yawError > Math.PI) yawError -= Math.PI * 2;
            this.controls.yaw = Math.max(-0.5, Math.min(0.5, yawError * 2.0));
        }
        
        // Return to home
        if (this.returnToHome) {
            const homePosition = new THREE.Vector3(0, 5, 0); // Fly at safe altitude 5m
            const currentPosition = physicsState.position.clone();
            
            // Altitude correction
            const hoverThrottle = (window.uavSimulator && window.uavSimulator.physics) ? 
                                  (window.uavSimulator.physics.getHoverThrottle() / 100) : 0.5;
            const throttleCorrection = this.pidController.updateAltitude(5, currentPosition.y, dt);
            this.controls.throttle = hoverThrottle + throttleCorrection;
            
            const horizontalPos = currentPosition.clone();
            horizontalPos.y = 0;
            const homeHorizontal = homePosition.clone();
            homeHorizontal.y = 0;
            
            const distance = horizontalPos.distanceTo(homeHorizontal);
            
            if (distance > 1) {
                const direction = homeHorizontal.clone().sub(horizontalPos).normalize();
                const targetYaw = Math.atan2(direction.x, direction.z);
                
                // Adjust yaw to face home
                let yawError = targetYaw - currentYaw;
                // Normalize yawError to -PI to PI
                while (yawError < -Math.PI) yawError += Math.PI * 2;
                while (yawError > Math.PI) yawError -= Math.PI * 2;
                
                this.controls.yaw = Math.max(-0.5, Math.min(0.5, yawError * 1.5));
                
                // Tilt forward slightly to cruise home
                this.controls.pitch = 0.2;
                this.controls.roll = 0;
            } else {
                // Arrived home, initiate landing
                this.controls.pitch = 0;
                this.controls.roll = 0;
                this.controls.yaw = 0;
                this.controls.throttle = Math.max(0, this.controls.throttle - 0.005);
                
                if (currentPosition.y < 0.2) {
                    this.returnToHome = false;
                    if (window.uavSimulator && window.uavSimulator.physics) {
                        window.uavSimulator.physics.disarm();
                        const btn = document.getElementById('arm-button');
                        if (btn) {
                            btn.textContent = 'ARM';
                            btn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
                        }
                    }
                }
            }
        }
        
        // Clamp controls
        this.controls.throttle = Math.max(0, Math.min(1, this.controls.throttle));
        this.controls.pitch = Math.max(-1, Math.min(1, this.controls.pitch));
        this.controls.roll = Math.max(-1, Math.min(1, this.controls.roll));
        this.controls.yaw = Math.max(-1, Math.min(1, this.controls.yaw));
    }

    toggleArm() {
        console.log('Toggle ARM clicked');
        const button = document.getElementById('arm-button');
        if (window.uavSimulator && window.uavSimulator.physics) {
            if (window.uavSimulator.physics.state.isArmed) {
                window.uavSimulator.physics.disarm();
                button.textContent = 'ARM';
                button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
            } else {
                window.uavSimulator.physics.arm();
                button.textContent = 'DISARM';
                button.style.background = 'linear-gradient(135deg, #f44336 0%, #da190b 100%)';
            }
        }
    }

    emergencyStop() {
        if (window.uavSimulator && window.uavSimulator.physics) {
            window.uavSimulator.physics.disarm();
            this.controls.throttle = 0;
            this.controls.pitch = 0;
            this.controls.roll = 0;
            this.controls.yaw = 0;
            
            // Reset keyboard smooth state
            this.keyboardPitch = 0;
            this.keyboardRoll = 0;
            this.keyboardYaw = 0;
            
            // Deactivate autonomous modes
            this.loiterMode = false;
            this.returnToHome = false;
            
            const button = document.getElementById('arm-button');
            button.textContent = 'ARM';
            button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
            
            // Reset mode button UI
            const loiterBtn = document.getElementById('loiter-button');
            if (loiterBtn) loiterBtn.classList.remove('active');
            const rthBtn = document.getElementById('rth-button');
            if (rthBtn) rthBtn.classList.remove('active');
        }
    }

    resetUAV() {
        if (window.uavSimulator && window.uavSimulator.physics) {
            window.uavSimulator.physics.reset();
            this.reset();
        }
    }

    cycleCamera() {
        const cameraSelect = document.getElementById('camera-mode');
        if (cameraSelect) {
            const currentIndex = cameraSelect.selectedIndex;
            const nextIndex = (currentIndex + 1) % cameraSelect.options.length;
            cameraSelect.selectedIndex = nextIndex;
            cameraSelect.dispatchEvent(new Event('change'));
        }
    }

    reset() {
        this.controls.throttle = 0;
        this.controls.pitch = 0;
        this.controls.roll = 0;
        this.controls.yaw = 0;
        this.leftStick = { x: 0, y: -1 };
        this.rightStick = { x: 0, y: 0 };
        this.keyboardPitch = 0;
        this.keyboardRoll = 0;
        this.keyboardYaw = 0;
        this.altitudeHold = false;
        this.positionHold = false;
        this.returnToHome = false;
        this.loiterMode = false;
        this.pidController.reset();
        
        // Reset mode button UI
        const loiterBtn = document.getElementById('loiter-button');
        if (loiterBtn) loiterBtn.classList.remove('active');
        const rthBtn = document.getElementById('rth-button');
        if (rthBtn) rthBtn.classList.remove('active');
    }

    toggleLoiter() {
        if (window.uavSimulator && window.uavSimulator.physics) {
            if (!window.uavSimulator.physics.state.isArmed) return; // Can't loiter when disarmed
            
            this.loiterMode = !this.loiterMode;
            const btn = document.getElementById('loiter-button');
            
            if (this.loiterMode) {
                // Capture current position for hold
                this.loiterPosition.copy(window.uavSimulator.physics.state.position);
                
                // Capture current heading for heading-hold
                const euler = new THREE.Euler().setFromQuaternion(
                    window.uavSimulator.physics.state.rotation
                );
                this.loiterHeading = euler.y;
                
                // Kill angular velocity to stop any existing rotation immediately
                window.uavSimulator.physics.state.angularVelocity.set(0, 0, 0);
                
                this.returnToHome = false;
                this.altitudeHold = false;
                
                if (btn) btn.classList.add('active');
                
                // Clear active states on other buttons
                const rthBtn = document.getElementById('rth-button');
                if (rthBtn) rthBtn.classList.remove('active');
            } else {
                if (btn) btn.classList.remove('active');
                this.pidController.reset();
            }
        }
    }

    activateRTH() {
        if (window.uavSimulator && window.uavSimulator.physics) {
            if (!window.uavSimulator.physics.state.isArmed) return;
            
            this.returnToHome = !this.returnToHome;
            const btn = document.getElementById('rth-button');
            
            if (this.returnToHome) {
                this.loiterMode = false;
                this.altitudeHold = false;
                
                if (btn) btn.classList.add('active');
                
                const loiterBtn = document.getElementById('loiter-button');
                if (loiterBtn) loiterBtn.classList.remove('active');
            } else {
                if (btn) btn.classList.remove('active');
                this.pidController.reset();
            }
        }
    }
}
