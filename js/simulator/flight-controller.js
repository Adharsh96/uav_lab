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
        
        // Mouse/stick state
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
        
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            if (e.key === ' ') {
                e.preventDefault();
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

        // RC Sticks
        this.setupStickControls('left-stick', 'left-stick-boundary', (x, y) => {
            this.leftStick = { x, y };
        });

        this.setupStickControls('right-stick', 'right-stick-boundary', (x, y) => {
            this.rightStick = { x, y };
        });

        // Global mouse handlers for sticks
        document.addEventListener('mousemove', (e) => this.handleStickDrag(e));
        document.addEventListener('mouseup', () => this.handleStickRelease());

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

        boundary.addEventListener('mousedown', (e) => {
            this.draggingStick = stickId;
            this.handleStickDrag(e);
        });
    }

    handleStickDrag(e) {
        if (!this.draggingStick) return;

        const { stick, boundary, callback } = this.stickElements[this.draggingStick];
        const rect = boundary.getBoundingClientRect();
        const radius = rect.width / 2;
        const centerX = rect.left + radius;
        const centerY = rect.top + radius;
        
        let x = e.clientX - centerX;
        let y = e.clientY - centerY;
        
        const distance = Math.sqrt(x * x + y * y);
        if (distance > radius - 20) {
            const angle = Math.atan2(y, x);
            x = Math.cos(angle) * (radius - 20);
            y = Math.sin(angle) * (radius - 20);
        }
        
        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        const normalizedX = x / (radius - 20);
        const normalizedY = -y / (radius - 20);
        
        callback(normalizedX, normalizedY);
    }

    handleStickRelease() {
        if (!this.draggingStick) return;

        const { stick, boundary, callback } = this.stickElements[this.draggingStick];
        const radius = boundary.getBoundingClientRect().width / 2;

        if (this.draggingStick === 'right-stick') {
            stick.style.transform = 'translate(-50%, -50%)';
            callback(0, 0);
        } else if (this.draggingStick === 'left-stick') {
            const currentY = this.leftStick.y;
            stick.style.transform = `translate(-50%, calc(-50% + ${-currentY * (radius - 20)}px))`;
            callback(0, currentY);
        }
        
        this.draggingStick = null;
    }

    update(physicsState, dt) {
        // Base controls from sticks
        this.updateFromSticks();
        // Override with keyboard if keys are pressed
        this.updateFromKeyboard();
        
        // Deactivate loiter or RTH if manual input is significant
        const manualOverride = Math.abs(this.controls.pitch) > 0.05 || 
                               Math.abs(this.controls.roll) > 0.05 || 
                               Math.abs(this.controls.yaw) > 0.05 ||
                               this.keys['w'] || this.keys['s'];
                               
        if (manualOverride && (this.loiterMode || this.returnToHome)) {
            if (this.loiterMode) this.toggleLoiter();
            if (this.returnToHome) this.activateRTH();
        }
        
        // Apply PID stabilization if needed
        if (this.altitudeHold || this.positionHold || this.returnToHome || this.loiterMode) {
            this.applyStabilization(physicsState, dt);
        }
        
        return this.controls;
    }

    updateFromSticks() {
        // This sets the base values from the current stick positions
        if (this.draggingStick === 'left-stick') {
            this.controls.throttle = (this.leftStick.y + 1) / 2;
        }
        this.controls.yaw = this.leftStick.x;
        this.controls.pitch = this.rightStick.y;
        this.controls.roll = this.rightStick.x;
    }

    updateFromKeyboard() {
        // Throttle (W/S)
        if (this.keys['w']) {
            this.controls.throttle = Math.min(1, this.controls.throttle + 0.02);
        }
        if (this.keys['s']) {
            this.controls.throttle = Math.max(0, this.controls.throttle - 0.02);
        }
        
        // Yaw (A/D)
        if (this.keys['a']) {
            this.controls.yaw = -1;
        } else if (this.keys['d']) {
            this.controls.yaw = 1;
        }
        
        // Pitch (Up/Down Arrow)
        if (this.keys['arrowup']) {
            this.controls.pitch = 1;
        } else if (this.keys['arrowdown']) {
            this.controls.pitch = -1;
        }
        
        // Roll (Left/Right Arrow)
        if (this.keys['arrowleft']) {
            this.controls.roll = -1;
        } else if (this.keys['arrowright']) {
            this.controls.roll = 1;
        }
        
        this.updateLeftStickVisual();
        this.updateRightStickVisual();
    }
    
    updateLeftStickVisual() {
        const stick = document.getElementById('left-stick');
        const boundary = document.getElementById('left-stick-boundary');
        if (!stick || !boundary) return;
        
        const rect = boundary.getBoundingClientRect();
        const radius = rect.width / 2;
        
        const y = -(this.controls.throttle * 2 - 1) * (radius - 20);
        const x = this.controls.yaw * (radius - 20);
        
        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
    
    updateRightStickVisual() {
        const stick = document.getElementById('right-stick');
        const boundary = document.getElementById('right-stick-boundary');
        if (!stick || !boundary) return;
        
        const rect = boundary.getBoundingClientRect();
        const radius = rect.width / 2;
        
        const x = this.controls.roll * (radius - 20);
        const y = -this.controls.pitch * (radius - 20);
        
        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    applyStabilization(physicsState, dt) {
        // Get current orientation
        const euler = new THREE.Euler().setFromQuaternion(physicsState.rotation);
        const currentRoll = euler.x;
        const currentPitch = euler.z;
        const currentYaw = euler.y;
        
        // Altitude hold
        if (this.altitudeHold) {
            const desiredAltitude = 5; // 5 meters
            const throttleCorrection = this.pidController.updateAltitude(
                desiredAltitude,
                physicsState.position.y,
                dt
            );
            this.controls.throttle += throttleCorrection;
        }
        
        // Loiter Mode: Locks horizontal position (X, Z) and vertical height (Y)
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

            // Translate corrections to local body coordinates based on current heading (Yaw)
            const heading = currentYaw;
            const cosYaw = Math.cos(heading);
            const sinYaw = Math.sin(heading);
            
            // X error pushes roll, Z error pushes pitch (rotated for yaw)
            const localCorrectionX = posCorrection.x * cosYaw + posCorrection.y * sinYaw;
            const localCorrectionZ = -posCorrection.x * sinYaw + posCorrection.y * cosYaw;

            // Constrain stabilization tilt levels to safe angles
            this.controls.pitch = Math.max(-0.4, Math.min(0.4, localCorrectionX));
            this.controls.roll = Math.max(-0.4, Math.min(0.4, localCorrectionZ));
            this.controls.yaw = 0; // Maintain steady heading
        }
        
        // Return to home
        if (this.returnToHome) {
            // Simplified RTH
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
            
            const button = document.getElementById('arm-button');
            button.textContent = 'ARM';
            button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
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
        this.altitudeHold = false;
        this.positionHold = false;
        this.returnToHome = false;
        this.loiterMode = false;
        this.pidController.reset();
    }

    toggleLoiter() {
        if (window.uavSimulator && window.uavSimulator.physics) {
            if (!window.uavSimulator.physics.state.isArmed) return; // Can't loiter when disarmed
            
            this.loiterMode = !this.loiterMode;
            const btn = document.getElementById('loiter-button');
            
            if (this.loiterMode) {
                this.loiterPosition.copy(window.uavSimulator.physics.state.position);
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
