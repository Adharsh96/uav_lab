// Physics Engine for UAV Simulation
class PhysicsEngine {
    constructor(uavConfig, environmentConfig) {
        this.config = uavConfig;
        this.environment = environmentConfig;
        
        // Physics state
        this.state = {
            position: new THREE.Vector3(0, 2, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            acceleration: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Quaternion(),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            motorSpeeds: [],
            batteryVoltage: 0,
            batteryPercentage: 100,
            currentDraw: 0,
            isArmed: false,
            timestamp: 0
        };
        
        // Constants
        this.gravity = 9.81;
        this.airDensity = this.calculateAirDensity();
        this.dragCoefficient = 0.5;
        this.frontalArea = Math.pow(this.config.frame.size / 1000, 2);
        
        // Initialize motor speeds
        const motorCount = this.getMotorCount();
        this.state.motorSpeeds = new Array(motorCount).fill(0);
        
        // Battery (Initialize before properties calculation!)
        this.batteryCapacityAh = this.config.battery.capacity / 1000;
        this.batteryUsedAh = 0;
        this.state.batteryVoltage = this.config.battery.cells * 4.2; // Fully charged
        
        // Calculate UAV properties (requires battery voltage initialized first!)
        this.calculateProperties();
        
        // Home position
        this.homePosition = this.state.position.clone();
        
        // Expose scientific variables in state
        this.state.mass = this.totalMass;
        this.state.thrustForce = 0;
        this.state.dragForce = 0;
        this.state.energyConsumedWh = 0;
    }

    calculateProperties() {
        // Calculate mass
        this.totalMass = this.calculateTotalMass() / 1000; // Convert to kg
        
        // Calculate thrust coefficient
        const propSize = this.config.propellers.size * 0.0254;
        const propPitch = this.config.propellers.pitch;
        const propBlades = this.config.propellers.blades;
        const bladeMultiplier = 1 + (propBlades - 2) * 0.1;
        this.thrustCoefficient = 0.00001 * Math.pow(propSize, 4) * propPitch * bladeMultiplier;
        
        // Calculate motor properties
        this.motorKv = this.config.motors.kv;
        this.maxRPM = this.motorKv * this.state.batteryVoltage;
        this.maxOmega = (this.maxRPM * 2 * Math.PI) / 60;
        
        // Calculate max thrust per motor
        this.maxThrustPerMotor = this.thrustCoefficient * this.maxOmega * this.maxOmega;
        
        // Arm length
        this.armLength = (this.config.frame.size / 1000) / 2;
    }

    calculateTotalMass() {
        // Simplified mass calculation
        const frameMultiplier = { 'carbon': 1.0, 'aluminum': 1.3, 'plastic': 1.5, 'titanium': 1.1, 'fiberglass': 1.2 };
        const frameMass = 200 * (this.config.frame.size / 450) * (frameMultiplier[this.config.frame.material] || 1.0);
        
        const motorCount = this.getMotorCount();
        const motorMass = 40 * motorCount;
        const propMass = this.config.propellers.size * 2 * motorCount;
        const batteryMass = this.config.battery.capacity * 0.15;
        const fcMass = 30;
        const payloadMass = this.getPayloadMass();
        
        return frameMass + motorMass + propMass + batteryMass + fcMass + payloadMass;
    }

    getMotorCount() {
        const type = this.config.frame.type;
        if (type.includes('quad')) return 4;
        if (type === 'hexa') return 6;
        if (type === 'octa') return 8;
        return 4;
    }

    getPayloadMass() {
        const masses = {
            'none': 0, 'camera-small': 50, 'camera-medium': 100,
            'camera-large': 200, 'sensor': 50, 'delivery': 300,
            'thermal': 150, 'lidar': 400, 'searchlight': 80, 'gripper': 250
        };
        return masses[this.config.payload.type] || 0;
    }

    calculateAirDensity() {
        const temp = this.environment.temperature + 273.15; // Convert to Kelvin
        const tempRef = 288.15; // 15°C in Kelvin
        const densityRef = 1.225; // kg/m³ at sea level, 15°C
        return densityRef * (tempRef / temp);
    }

    update(controls, dt) {
        if (!this.state.isArmed) {
            // Reset motor speeds when disarmed
            this.state.motorSpeeds.fill(0);
            return this.state;
        }

        // Update motor speeds based on controls
        this.updateMotorSpeeds(controls, dt);
        
        // Calculate forces
        const forces = this.calculateForces();
        
        // Calculate torques
        const torques = this.calculateTorques(controls);
        
        // Update linear motion
        this.updateLinearMotion(forces, dt);
        
        // Update angular motion
        this.updateAngularMotion(torques, dt);
        
        // Update battery
        this.updateBattery(dt);
        
        // Update timestamp
        this.state.timestamp += dt;
        
        return this.state;
    }

    updateMotorSpeeds(controls, dt) {
        const { throttle, pitch, roll, yaw } = controls;
        
        // Base throttle for all motors
        const baseThrottle = Math.max(0, Math.min(1, throttle));
        
        const motorCount = this.getMotorCount();
        const targetSpeeds = new Array(motorCount).fill(0);
        
        if (motorCount === 4) {
            // Quad X-configuration: motors 0,2 spin CW; motors 1,3 spin CCW
            // Front-right (CW), Back-left (CCW), Front-left (CCW), Back-right (CW)
            targetSpeeds[0] = baseThrottle + pitch - roll + yaw; // FR - CW
            targetSpeeds[1] = baseThrottle - pitch + roll - yaw; // BL - CCW
            targetSpeeds[2] = baseThrottle + pitch + roll - yaw; // FL - CCW
            targetSpeeds[3] = baseThrottle - pitch - roll + yaw; // BR - CW
        } else if (motorCount === 6) {
            // Hexa-rotor mixing
            // Motor layout: 0=front-right, 1=right, 2=back-right, 3=back-left, 4=left, 5=front-left
            // CW, CCW, CW, CCW, CW, CCW
            targetSpeeds[0] = baseThrottle + pitch * 0.866 - roll * 0.5 + yaw; 
            targetSpeeds[1] = baseThrottle - roll - yaw; 
            targetSpeeds[2] = baseThrottle - pitch * 0.866 - roll * 0.5 + yaw; 
            targetSpeeds[3] = baseThrottle - pitch * 0.866 + roll * 0.5 - yaw; 
            targetSpeeds[4] = baseThrottle + roll + yaw; 
            targetSpeeds[5] = baseThrottle + pitch * 0.866 + roll * 0.5 - yaw; 
        } else {
            // Octa-rotor mixing
            for (let i = 0; i < motorCount; i++) {
                const angle = (i * 2 * Math.PI) / motorCount;
                const motorPitch = Math.cos(angle);
                const motorRoll = Math.sin(angle);
                const motorYaw = i % 2 === 0 ? 1 : -1;
                targetSpeeds[i] = baseThrottle + pitch * motorPitch + roll * motorRoll + yaw * motorYaw;
            }
        }
        
        // Clamp and LERP motor speeds to simulate response lag
        const responseRate = 12.0; // Filter constant for motor spin transition delay
        for (let i = 0; i < motorCount; i++) {
            const targetSpeed = Math.max(0, Math.min(1, targetSpeeds[i]));
            // LERP current motor speeds to target
            this.state.motorSpeeds[i] += (targetSpeed - this.state.motorSpeeds[i]) * responseRate * dt;
            this.state.motorSpeeds[i] = Math.max(0, Math.min(1, this.state.motorSpeeds[i]));
        }
    }

    calculateForces() {
        const forces = new THREE.Vector3();
        
        // 1. Thrust force (body frame, pointing up)
        let totalThrust = 0;
        for (let i = 0; i < this.state.motorSpeeds.length; i++) {
            const omega = this.state.motorSpeeds[i] * this.maxOmega;
            const thrust = this.thrustCoefficient * omega * omega;
            totalThrust += thrust;
        }
        
        // Ground effect (increased thrust near ground)
        const altitude = this.state.position.y;
        const rotorDiameter = this.config.propellers.size * 0.0254;
        if (altitude < rotorDiameter) {
            const groundEffectMultiplier = 1 + 0.1 * (1 - altitude / rotorDiameter);
            totalThrust *= groundEffectMultiplier;
        }
        
        // Transform thrust to world frame
        const thrustBody = new THREE.Vector3(0, totalThrust, 0);
        const thrustWorld = thrustBody.applyQuaternion(this.state.rotation.clone());
        forces.add(thrustWorld);
        
        // 2. Gravity force (world frame, pointing down)
        const gravity = new THREE.Vector3(0, -this.totalMass * this.gravity, 0);
        forces.add(gravity);
        
        // 3. Drag force (opposite to velocity)
        const speed = this.state.velocity.length();
        let totalDragMagnitude = 0;
        if (speed > 0.01) {
            const dragMagnitude = 0.5 * this.airDensity * this.dragCoefficient * 
                                 this.frontalArea * speed * speed;
            totalDragMagnitude += dragMagnitude;
            const dragForce = this.state.velocity.clone().normalize().multiplyScalar(-dragMagnitude);
            forces.add(dragForce);
        }
        
        // 4. Wind force
        const windSpeed = this.environment.windSpeed;
        const windDir = this.environment.windDirection * Math.PI / 180;
        const windVelocity = new THREE.Vector3(
            Math.sin(windDir) * windSpeed,
            0,
            Math.cos(windDir) * windSpeed
        );
        
        // Add turbulence
        const time = this.state.timestamp;
        const pos = this.state.position;
        const turbulence = new THREE.Vector3(
            perlin.noise3D(pos.x / 10, pos.y / 10, time * 0.5) * windSpeed * 0.3,
            perlin.noise3D(pos.x / 10 + 100, pos.y / 10, time * 0.5) * windSpeed * 0.2,
            perlin.noise3D(pos.x / 10, pos.y / 10 + 100, time * 0.5) * windSpeed * 0.3
        );
        windVelocity.add(turbulence);
        
        const relativeVelocity = this.state.velocity.clone().sub(windVelocity);
        const relativeSpeed = relativeVelocity.length();
        if (relativeSpeed > 0.01) {
            const windDragMagnitude = 0.5 * this.airDensity * this.dragCoefficient * 
                                     this.frontalArea * relativeSpeed * relativeSpeed;
            totalDragMagnitude += windDragMagnitude;
            const windForce = relativeVelocity.clone().normalize().multiplyScalar(-windDragMagnitude);
            forces.add(windForce);
        }
        
        // Record total drag and thrust forces in Newtons!
        this.state.dragForce = totalDragMagnitude;
        this.state.thrustForce = totalThrust;
        
        return forces;
    }

    calculateTorques(controls) {
        const torques = new THREE.Vector3();
        
        // Simplified torque calculation
        const { pitch, roll, yaw } = controls;
        
        // Roll torque
        torques.x = roll * this.armLength * this.maxThrustPerMotor * 2;
        
        // Pitch torque
        torques.z = pitch * this.armLength * this.maxThrustPerMotor * 2;
        
        // Yaw torque (from motor drag — increased for realistic heading authority)
        torques.y = yaw * 0.05 * this.maxThrustPerMotor;
        
        // Aerodynamic damping (higher value settles angular velocity faster)
        const damping = 0.5;
        torques.sub(this.state.angularVelocity.clone().multiplyScalar(damping));
        
        return torques;
    }

    updateLinearMotion(forces, dt) {
        // F = ma => a = F/m (clone forces to avoid mutating the original)
        this.state.acceleration = forces.clone().divideScalar(this.totalMass);
        
        // Update velocity: v = v + a*dt
        this.state.velocity.add(this.state.acceleration.clone().multiplyScalar(dt));
        
        // Update position: p = p + v*dt
        this.state.position.add(this.state.velocity.clone().multiplyScalar(dt));
        
        // Ground collision
        if (this.state.position.y < 0.1) {
            this.state.position.y = 0.1;
            this.state.velocity.y = Math.max(0, this.state.velocity.y * -0.3); // Bounce
            this.state.velocity.x *= 0.8; // Friction
            this.state.velocity.z *= 0.8;
        }
    }

    updateAngularMotion(torques, dt) {
        // Simplified angular dynamics
        const inertia = this.totalMass * this.armLength * this.armLength;
        
        // τ = Iα => α = τ/I
        const angularAccel = torques.divideScalar(inertia);
        
        // Update angular velocity
        this.state.angularVelocity.add(angularAccel.multiplyScalar(dt));
        
        // Update rotation (simplified)
        const deltaRotation = new THREE.Euler(
            this.state.angularVelocity.x * dt,
            this.state.angularVelocity.y * dt,
            this.state.angularVelocity.z * dt,
            'XYZ'
        );
        const deltaQuat = new THREE.Quaternion().setFromEuler(deltaRotation);
        this.state.rotation.multiply(deltaQuat);
        this.state.rotation.normalize();
    }

    updateBattery(dt) {
        // Calculate current draw
        let totalCurrent = 0;
        for (let i = 0; i < this.state.motorSpeeds.length; i++) {
            const throttle = this.state.motorSpeeds[i];
            const currentPerMotor = (this.state.batteryVoltage * this.motorKv / 1000) * throttle * 0.5;
            totalCurrent += currentPerMotor;
        }
        this.state.currentDraw = totalCurrent;
        
        // Update battery capacity
        this.batteryUsedAh += (totalCurrent * dt) / 3600; // Convert to Ah
        this.state.batteryPercentage = Math.max(0, 100 * (1 - this.batteryUsedAh / this.batteryCapacityAh));
        
        // Voltage drop under load
        const cellCount = this.config.battery.cells;
        const vFull = cellCount * 4.2;
        const vEmpty = cellCount * 3.5;
        const vDrop = (vFull - vEmpty) * (this.batteryUsedAh / this.batteryCapacityAh);
        const internalResistance = 0.02 * cellCount;
        this.state.batteryVoltage = vFull - vDrop - (totalCurrent * internalResistance);
        
        // Calculate Wh consumed in real-time (after cellCount is defined)
        this.state.energyConsumedWh = this.batteryUsedAh * (cellCount * 3.7);
        
        // Battery cutoff
        if (this.state.batteryPercentage < 10) {
            // Auto-land or disarm
            this.state.isArmed = false;
        }
    }

    getHoverThrottle() {
        // Calculate hover throttle percentage
        // Hover when total thrust = weight (mass * g)
        const weight = this.totalMass * this.gravity;
        const motorCount = this.getMotorCount();
        const hoverThrustPerMotor = weight / motorCount;
        
        // thrust = thrustCoefficient * omega^2
        // omega = throttle * maxOmega
        // thrust = thrustCoefficient * (throttle * maxOmega)^2
        // throttle = sqrt(thrust / (thrustCoefficient * maxOmega^2))
        const hoverThrottle = Math.sqrt(hoverThrustPerMotor / (this.thrustCoefficient * this.maxOmega * this.maxOmega));
        return Math.min(100, Math.max(0, hoverThrottle * 100));
    }

    arm() {
        this.state.isArmed = true;
    }

    disarm() {
        this.state.isArmed = false;
        this.state.motorSpeeds.fill(0);
    }

    reset() {
        this.state.position.copy(this.homePosition);
        this.state.velocity.set(0, 0, 0);
        this.state.rotation.set(0, 0, 0, 1);
        this.state.angularVelocity.set(0, 0, 0);
        this.state.motorSpeeds.fill(0);
        this.batteryUsedAh = 0;
        this.state.batteryPercentage = 100;
        this.state.batteryVoltage = this.config.battery.cells * 4.2;
        this.state.isArmed = false;
    }
}
