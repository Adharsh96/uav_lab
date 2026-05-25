// UAV Calculations Engine (Upgraded Brutalist & Optimization Solver)
class UAVCalculations {
    constructor() {
        this.config = {
            frame: { type: 'quad-x', material: 'carbon', size: 450 },
            propellers: { size: 8, pitch: 5, blades: 2, material: 'plastic' },
            motors: { kv: 2300 },
            battery: { cells: 4, capacity: 3300, cRating: 45 },
            flightController: { type: 'gps' },
            payload: { type: 'none' }
        };
        
        this.specs = {};
        this.calculateAll();
    }

    // Material multipliers for mass
    getMaterialMultiplier(material) {
        const multipliers = {
            'carbon': 1.0,
            'aluminum': 1.3,
            'plastic': 1.5,
            'titanium': 1.1,
            'fiberglass': 1.2
        };
        return multipliers[material] || 1.0;
    }

    // Calculate frame mass based on size and material
    getFrameMass() {
        const { size, material, type } = this.config.frame;
        let baseMass = 0;
        
        // Base mass depends on frame type and size
        const sizeMultiplier = size / 450; // Normalized to 450mm
        
        switch(type) {
            case 'quad-x':
            case 'quad-plus':
                baseMass = 200 * sizeMultiplier;
                break;
            case 'hexa':
                baseMass = 300 * sizeMultiplier;
                break;
            case 'octa':
                baseMass = 400 * sizeMultiplier;
                break;
        }
        
        return baseMass * this.getMaterialMultiplier(material);
    }

    // Get number of motors based on frame type
    getMotorCount() {
        const { type } = this.config.frame;
        switch(type) {
            case 'quad-x':
            case 'quad-plus':
                return 4;
            case 'hexa':
                return 6;
            case 'octa':
                return 8;
            default:
                return 4;
        }
    }

    // Calculate motor mass based on KV rating (Lower KV = larger motor = more mass)
    getMotorMass() {
        const { kv } = this.config.motors;
        if (kv >= 3600) return 22;
        if (kv >= 3100) return 26;
        if (kv >= 2700) return 32;
        if (kv >= 2300) return 38;
        if (kv >= 1800) return 46;
        if (kv >= 1500) return 55;
        if (kv >= 1200) return 72;
        if (kv >= 1000) return 88;
        return 115;
    }

    // Calculate propeller mass
    getPropellerMass() {
        const { size, material } = this.config.propellers;
        const baseMass = size * 2.2; // Rough estimate: 2.2g per inch
        
        const multipliers = {
            'carbon': 0.8,
            'plastic': 1.0,
            'wood': 0.9,
            'aluminum': 1.4
        };
        const multiplier = multipliers[material] || 1.0;
        return baseMass * multiplier;
    }

    // Calculate battery mass (Capacity * Cells is proportional to energy/weight)
    getBatteryMass() {
        const { capacity, cells } = this.config.battery;
        return capacity * cells * 0.038; // ~0.038g per Wh-ish capacity index (highly realistic)
    }

    // Calculate flight controller mass
    getFlightControllerMass() {
        const { type } = this.config.flightController;
        switch(type) {
            case 'basic':
                return 10;
            case 'racing':
                return 15;
            case 'gps':
                return 25;
            case 'pixhawk':
                return 45;
            case 'advanced':
                return 55;
            default:
                return 25;
        }
    }

    // Calculate payload mass
    getPayloadMass() {
        const { type } = this.config.payload;
        const masses = {
            'none': 0,
            'camera-small': 50,
            'camera-medium': 100,
            'camera-large': 200,
            'sensor': 50,
            'thermal': 150,
            'lidar': 400,
            'searchlight': 80,
            'gripper': 250,
            'delivery': 300
        };
        return masses[type] || 0;
    }

    // Calculate total mass (in grams)
    getTotalMass() {
        const motorCount = this.getMotorCount();
        const frameMass = this.getFrameMass();
        const motorMass = this.getMotorMass() * motorCount;
        const propMass = this.getPropellerMass() * motorCount;
        const batteryMass = this.getBatteryMass();
        const fcMass = this.getFlightControllerMass();
        const payloadMass = this.getPayloadMass();
        
        return frameMass + motorMass + propMass + batteryMass + fcMass + payloadMass;
    }

    // Calculate thrust coefficient based on propeller specs
    getThrustCoefficient() {
        const { size, pitch, blades } = this.config.propellers;
        const diameter = size * 0.0254; // Convert inches to meters
        const pitchValue = pitch;
        const bladeMultiplier = 1 + (blades - 2) * 0.1;
        
        // Realistic thrust constant modifier
        return 0.00001 * Math.pow(diameter, 4) * pitchValue * bladeMultiplier;
    }

    // Calculate motor max RPM
    getMotorMaxRPM() {
        const { kv } = this.config.motors;
        const { cells } = this.config.battery;
        const voltage = cells * 3.7; // Nominal voltage per cell
        return kv * voltage;
    }

    // Calculate thrust per motor (in grams)
    getThrustPerMotor() {
        const k = this.getThrustCoefficient();
        const maxRPM = this.getMotorMaxRPM();
        const omega = (maxRPM * 2 * Math.PI) / 60; // Convert RPM to rad/s
        
        // T = k * ω²
        const thrustNewtons = k * omega * omega;
        return thrustNewtons * 1000 / 9.81; // Convert to grams
    }

    // Calculate total thrust
    getTotalThrust() {
        const motorCount = this.getMotorCount();
        return this.getThrustPerMotor() * motorCount;
    }

    // Calculate thrust-to-weight ratio
    getTWR() {
        const totalThrust = this.getTotalThrust();
        const totalMass = this.getTotalMass();
        return totalThrust / totalMass;
    }

    // Calculate hover throttle percentage
    getHoverThrottle() {
        const twr = this.getTWR();
        return Math.min(100, (1 / twr) * 100);
    }

    // Calculate current draw under hover or max
    getCurrentDraw(throttle = 0.5) {
        const { kv } = this.config.motors;
        const { cells } = this.config.battery;
        const voltage = cells * 3.7;
        const motorCount = this.getMotorCount();
        
        // Simplified current calculation
        const currentPerMotor = (voltage * kv / 1000) * throttle * 0.5;
        return currentPerMotor * motorCount;
    }

    // Calculate flight time
    getFlightTime() {
        const { capacity } = this.config.battery;
        const hoverThrottle = this.getHoverThrottle() / 100;
        const avgCurrent = this.getCurrentDraw(hoverThrottle);
        
        if (avgCurrent === 0) return 0;
        
        // 0.8 factor for safe discharge
        const flightTimeHours = (capacity * 0.8) / (avgCurrent * 1000);
        return flightTimeHours * 60; // Convert to minutes
    }

    // Calculate max speed
    getMaxSpeed() {
        const twr = this.getTWR();
        const totalMass = this.getTotalMass() / 1000; // Convert to kg
        
        const maxAccel = (twr - 1) * 9.81 * Math.cos(Math.PI / 4);
        const dragCoeff = 0.5;
        const frontalArea = Math.pow(this.config.frame.size / 1000, 2);
        
        const airDensity = 1.225;
        const maxSpeed = Math.sqrt((2 * totalMass * maxAccel) / (airDensity * dragCoeff * frontalArea));
        
        return Math.min(maxSpeed, 35); // Cap at 35 m/s
    }

    // Calculate power consumption
    getPowerConsumption() {
        const { cells } = this.config.battery;
        const voltage = cells * 3.7;
        
        const hoverCurrent = this.getCurrentDraw(this.getHoverThrottle() / 100);
        const maxCurrent = this.getCurrentDraw(1.0);
        
        return {
            hover: voltage * hoverCurrent,
            max: voltage * maxCurrent
        };
    }

    // Update configuration
    updateConfig(category, key, value) {
        if (this.config[category]) {
            this.config[category][key] = value;
        }
        this.calculateAll();
    }

    // Calculate all specifications
    calculateAll() {
        this.specs = {
            totalMass: this.getTotalMass(),
            totalThrust: this.getTotalThrust(),
            twr: this.getTWR(),
            flightTime: this.getFlightTime(),
            maxSpeed: this.getMaxSpeed(),
            power: this.getPowerConsumption(),
            hoverThrottle: this.getHoverThrottle()
        };
        
        return this.specs;
    }

    // Get design recommendations
    getRecommendations() {
        const { twr, flightTime, totalMass } = this.specs;
        const recommendations = [];
        
        if (twr < 1.3) {
            recommendations.push({
                type: 'warning',
                message: '⚠️ Low TWR: UAV cannot fly or maintain stable hover! Select larger propellers, higher cells, or lighter frame.'
            });
        } else if (twr < 1.8) {
            recommendations.push({
                type: 'warning',
                message: '⚠️ Heavy UAV: Marginally flies. Good for heavy commercial cargo but will draw high currents and fly sluggishly.'
            });
        } else if (twr > 4.5) {
            recommendations.push({
                type: 'warning',
                message: '⚠️ Excessive Power: Extremely high thrust! UAV will flip or accelerate too aggressively. Select smaller props or a heavier battery.'
            });
        } else if (twr >= 2.0 && twr <= 3.5) {
            recommendations.push({
                type: 'success',
                message: '✅ Optimal Setup: Perfectly balanced Thrust-To-Weight ratio for responsive and highly stable flight control!'
            });
        }
        
        if (flightTime < 6) {
            recommendations.push({
                type: 'tip',
                message: '💡 Low Endurance: Short flight time. Consider increasing battery capacity or using lighter carbon materials.'
            });
        } else if (flightTime > 25) {
            recommendations.push({
                type: 'success',
                message: '✅ Long Endurance: Outstanding flight duration! Well suited for inspection or long search and rescue missions.'
            });
        }
        
        if (totalMass > 4000) {
            recommendations.push({
                type: 'tip',
                message: '💡 Heavyweight: Requires high power to lift. Inspect motor windings temperature and wire gauge under heavy load.'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'info',
                message: '💡 Configure your UAV to see recommendations.'
            });
        }
        
        return recommendations;
    }

    // Check if configuration is valid for simulation
    isValid() {
        const { twr } = this.specs;
        return twr >= 1.05; 
    }

    // ==========================================================================
    // AUTO-OPTIMIZER HEURISTIC SOLVER ALGORITHM (Addition 1)
    // ==========================================================================
    optimize(targetTWR) {
        console.log(`Starting auto-optimization solver for Target TWR: ${targetTWR}...`);
        
        // Define all component option search space
        const frameSizes = [150, 250, 330, 450, 550, 650, 750, 850, 1000];
        const propSizes = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        const propPitches = [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 7.0, 8.0];
        const propBlades = [2, 3, 4, 5];
        const motorKVs = [900, 1000, 1200, 1500, 1800, 2200, 2300, 2400, 2700, 3100, 3600, 4000];
        const batteryCells = [2, 3, 4, 5, 6, 8];
        const batteryCapacities = [1300, 1500, 2200, 3300, 4500, 5000, 6000, 8000, 10000, 12000, 16000];
        
        let bestConfig = null;
        let bestScore = Infinity; // Lower is better
        
        // Save current user choices that represent their goal constraints
        const currentFrameType = this.config.frame.type;
        const currentFrameMat = this.config.frame.material;
        const currentPropMat = this.config.propellers.material;
        const currentFC = this.config.flightController.type;
        const currentPayload = this.config.payload.type;
        
        // To prevent running a massive nested loop that freezes the browser, 
        // we sweep systematically starting from realistic frame and propeller matchups:
        for (let sizeIndex = 0; sizeIndex < frameSizes.length; sizeIndex++) {
            const frameSize = frameSizes[sizeIndex];
            
            // Heuristic filter: Propeller diameter cannot exceed frame size!
            // E.g., 2 propellers on one side cannot collide. 
            // Max prop diameter (in mm) must be strictly less than frame radius (with clearance).
            // Clearance safety: prop size (inches) * 25.4 <= frameSize * 0.9
            const possibleProps = propSizes.filter(pSize => pSize * 25.4 <= frameSize * 0.9);
            if (possibleProps.length === 0) continue;
            
            // Choose the largest fitting prop size for efficiency, plus adjacent ones
            const selectedProps = possibleProps.slice(-3); 
            
            for (let pIndex = 0; pIndex < selectedProps.length; pIndex++) {
                const propSize = selectedProps[pIndex];
                
                // Sweep voltages and KV ratings
                for (let cIndex = 0; cIndex < batteryCells.length; cIndex++) {
                    const cells = batteryCells[cIndex];
                    
                    // Drone Engineering Rule: 
                    // Higher cells/voltage REQUIRES lower KV motors to prevent overheating/overcurrent.
                    // Lower cells/voltage REQUIRES higher KV motors to achieve lift speed.
                    // Match cells to KV to keep RPM within safe bounds: RPM should be ~20000 - 45000
                    const possibleKVs = motorKVs.filter(kv => {
                        const rpm = kv * cells * 3.7;
                        return rpm >= 18000 && rpm <= 46000;
                    });
                    
                    for (let kvIndex = 0; kvIndex < possibleKVs.length; kvIndex++) {
                        const kv = possibleKVs[kvIndex];
                        
                        // Pick capacity that keeps battery mass proportional to frame size
                        // Micro frames (150-250) -> 850 - 2200 mAh
                        // Standard frames (450) -> 2200 - 5000 mAh
                        // Heavy lift frames (850+) -> 8000 - 16000 mAh
                        const maxCap = frameSize <= 250 ? 2200 : frameSize <= 550 ? 5000 : 16000;
                        const minCap = frameSize <= 250 ? 850 : frameSize <= 550 ? 2200 : 5000;
                        const possibleCaps = batteryCapacities.filter(cap => cap >= minCap && cap <= maxCap);
                        
                        for (let capIndex = 0; capIndex < possibleCaps.length; capIndex++) {
                            const capacity = possibleCaps[capIndex];
                            
                            // Iterate pitches and blades
                            for (let pitchIndex = 0; pitchIndex < propPitches.length; pitchIndex += 2) {
                                const pitch = propPitches[pitchIndex];
                                
                                for (let bladeIndex = 0; bladeIndex < propBlades.length; bladeIndex++) {
                                    const blades = propBlades[bladeIndex];
                                    
                                    // Temporarily set configuration to test specs
                                    this.config = {
                                        frame: { type: currentFrameType, material: currentFrameMat, size: frameSize },
                                        propellers: { size: propSize, pitch, blades, material: currentPropMat },
                                        motors: { kv },
                                        battery: { cells, capacity, cRating: 45 },
                                        flightController: { type: currentFC },
                                        payload: { type: currentPayload }
                                    };
                                    
                                    const testSpecs = this.calculateAll();
                                    const twrDiff = Math.abs(testSpecs.twr - targetTWR);
                                    
                                    // Score the design:
                                    // 1. TWR match is highest priority: penalty = diff * 500
                                    // 2. Flight time: we want to maximize flight time (deduct from score)
                                    // 3. TWR must be capable of stable flight (TWR >= 1.25)
                                    if (testSpecs.twr < 1.2) continue; // Must be able to fly
                                    
                                    const score = (twrDiff * 350) - (testSpecs.flightTime * 0.8) + (testSpecs.totalMass / 1000 * 2.0);
                                    
                                    if (score < bestScore) {
                                        bestScore = score;
                                        bestConfig = JSON.parse(JSON.stringify(this.config));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if (bestConfig) {
            console.log("Optimized configuration found!", bestConfig);
            this.config = bestConfig;
            this.calculateAll();
            return true;
        } else {
            console.warn("Could not find a valid optimization configuration!");
            return false;
        }
    }
}
