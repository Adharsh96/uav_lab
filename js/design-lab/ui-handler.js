// Design Lab UI Handler (Upgraded Brutalist & Target TWR Optimizer)
class DesignLabUI {
    constructor(calculator) {
        this.calculator = calculator;
        this.initializeEventListeners();
        this.initializeCustomCursor();
        this.syncDropdownsFromConfig();
        this.updateUI();
    }

    initializeEventListeners() {
        // Category toggles
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => this.toggleCategory(header));
        });

        // Frame options
        document.getElementById('frame-type').addEventListener('change', (e) => {
            this.calculator.updateConfig('frame', 'type', e.target.value);
            this.updateUI();
        });
        document.getElementById('frame-material').addEventListener('change', (e) => {
            this.calculator.updateConfig('frame', 'material', e.target.value);
            this.updateUI();
        });
        document.getElementById('frame-size').addEventListener('change', (e) => {
            this.calculator.updateConfig('frame', 'size', parseInt(e.target.value));
            this.updateUI();
        });

        // Propeller options
        document.getElementById('prop-size').addEventListener('change', (e) => {
            this.calculator.updateConfig('propellers', 'size', parseFloat(e.target.value));
            this.updateUI();
        });
        document.getElementById('prop-pitch').addEventListener('change', (e) => {
            this.calculator.updateConfig('propellers', 'pitch', parseFloat(e.target.value));
            this.updateUI();
        });
        document.getElementById('prop-blades').addEventListener('change', (e) => {
            this.calculator.updateConfig('propellers', 'blades', parseInt(e.target.value));
            this.updateUI();
        });
        document.getElementById('prop-material').addEventListener('change', (e) => {
            this.calculator.updateConfig('propellers', 'material', e.target.value);
            this.updateUI();
        });

        // Motor options
        document.getElementById('motor-kv').addEventListener('change', (e) => {
            this.calculator.updateConfig('motors', 'kv', parseInt(e.target.value));
            this.updateUI();
        });

        // Battery options
        document.getElementById('battery-cells').addEventListener('change', (e) => {
            this.calculator.updateConfig('battery', 'cells', parseInt(e.target.value));
            this.updateUI();
        });
        document.getElementById('battery-capacity').addEventListener('change', (e) => {
            this.calculator.updateConfig('battery', 'capacity', parseInt(e.target.value));
            this.updateUI();
        });
        document.getElementById('battery-c-rating').addEventListener('change', (e) => {
            this.calculator.updateConfig('battery', 'cRating', parseInt(e.target.value));
            this.updateUI();
        });

        // Flight controller options
        document.getElementById('fc-type').addEventListener('change', (e) => {
            this.calculator.updateConfig('flightController', 'type', e.target.value);
            this.updateUI();
        });

        // Payload options
        document.getElementById('payload-type').addEventListener('change', (e) => {
            this.calculator.updateConfig('payload', 'type', e.target.value);
            this.updateUI();
        });

        // Environment settings
        document.getElementById('wind-speed').addEventListener('input', (e) => {
            document.getElementById('wind-speed-value').textContent = e.target.value;
            this.updateWindIndicator(parseFloat(e.target.value));
        });
        document.getElementById('wind-direction').addEventListener('input', (e) => {
            document.getElementById('wind-direction-value').textContent = e.target.value;
        });
        document.getElementById('visibility').addEventListener('input', (e) => {
            document.getElementById('visibility-value').textContent = e.target.value;
        });
        document.getElementById('temperature').addEventListener('input', (e) => {
            document.getElementById('temperature-value').textContent = e.target.value;
        });

        // Terrain selection
        document.querySelectorAll('.terrain-option').forEach(option => {
            option.addEventListener('click', () => this.selectTerrain(option));
        });

        // Auto-Optimizer trigger (Addition 1)
        document.getElementById('optimize-button').addEventListener('click', () => {
            this.runAutoOptimizer();
        });

        // Launch button
        document.getElementById('launch-simulator').addEventListener('click', () => {
            this.launchSimulator();
        });
    }

    toggleCategory(header) {
        const content = header.nextElementSibling;
        header.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
    }

    updateWindIndicator(speed) {
        const indicator = document.getElementById('wind-indicator');
        if (speed < 2) {
            indicator.textContent = 'Calm';
            indicator.style.background = 'rgba(76, 175, 80, 0.1)';
        } else if (speed < 8) {
            indicator.textContent = 'Light Breeze';
            indicator.style.background = 'rgba(33, 150, 243, 0.1)';
        } else if (speed < 15) {
            indicator.textContent = 'Moderate Wind';
            indicator.style.background = 'rgba(255, 193, 7, 0.1)';
        } else if (speed < 25) {
            indicator.textContent = 'Strong Wind';
            indicator.style.background = 'rgba(255, 152, 0, 0.1)';
        } else {
            indicator.textContent = 'Storm';
            indicator.style.background = 'rgba(244, 67, 54, 0.1)';
        }
    }

    selectTerrain(option) {
        document.querySelectorAll('.terrain-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
    }

    updateUI() {
        const specs = this.calculator.specs;

        // Update specifications
        document.getElementById('total-mass').textContent = `${specs.totalMass.toFixed(0)} g`;
        document.getElementById('total-thrust').textContent = `${specs.totalThrust.toFixed(0)} g`;
        
        // Update TWR with color coding
        const twrElement = document.getElementById('twr');
        twrElement.textContent = specs.twr.toFixed(2);
        const twrParent = twrElement.parentElement;
        twrParent.classList.remove('highlight');
        
        if (specs.twr < 1.3) {
            twrElement.style.color = '#C62828'; // Crimson Red
        } else if (specs.twr < 1.9) {
            twrElement.style.color = '#E65100'; // Dark Orange
        } else if (specs.twr > 4.5) {
            twrElement.style.color = '#F57F17'; // Yellow-Orange
        } else {
            twrElement.style.color = '#2E7D32'; // Forest Green
            twrParent.classList.add('highlight');
        }

        document.getElementById('flight-time').textContent = `${specs.flightTime.toFixed(1)} min`;
        document.getElementById('max-speed').textContent = `${specs.maxSpeed.toFixed(1)} m/s`;
        document.getElementById('power').textContent = 
            `${specs.power.hover.toFixed(0)}W / ${specs.power.max.toFixed(0)}W`;

        // Update recommendations
        const recommendations = this.calculator.getRecommendations();
        const tipsContainer = document.getElementById('design-tips');
        tipsContainer.innerHTML = '';
        
        recommendations.forEach(rec => {
            const tipDiv = document.createElement('div');
            tipDiv.className = 'tip';
            tipDiv.textContent = rec.message;
            tipsContainer.appendChild(tipDiv);
        });

        // Update 3D preview
        if (window.previewRenderer) {
            window.previewRenderer.updateUAV(this.calculator.config);
        }
    }

    syncDropdownsFromConfig() {
        const config = this.calculator.config;
        
        // Frame
        document.getElementById('frame-type').value = config.frame.type;
        document.getElementById('frame-material').value = config.frame.material;
        document.getElementById('frame-size').value = config.frame.size;
        
        // Propellers
        document.getElementById('prop-size').value = config.propellers.size;
        
        // Pitch values should match the string formatting of dropdown options
        const pitchValStr = config.propellers.pitch.toFixed(1);
        document.getElementById('prop-pitch').value = pitchValStr;
        
        document.getElementById('prop-blades').value = config.propellers.blades;
        document.getElementById('prop-material').value = config.propellers.material;
        
        // Motors
        document.getElementById('motor-kv').value = config.motors.kv;
        
        // Battery
        document.getElementById('battery-cells').value = config.battery.cells;
        document.getElementById('battery-capacity').value = config.battery.capacity;
        document.getElementById('battery-c-rating').value = config.battery.cRating;
        
        // Flight Controller
        document.getElementById('fc-type').value = config.flightController.type;
        
        // Payload
        document.getElementById('payload-type').value = config.payload.type;
    }

    runAutoOptimizer() {
        const targetTWR = parseFloat(document.getElementById('target-twr').value);
        
        // Display loading spinner visually on optimize button
        const btn = document.getElementById('optimize-button');
        const origText = btn.textContent;
        btn.textContent = '⏱...';
        btn.disabled = true;
        
        setTimeout(() => {
            const success = this.calculator.optimize(targetTWR);
            if (success) {
                this.syncDropdownsFromConfig();
                this.updateUI();
            }
            btn.textContent = origText;
            btn.disabled = false;
        }, 100);
    }

    initializeCustomCursor() {
        const dot = document.getElementById('cursorDot');
        const ring = document.getElementById('cursorRing');
        if (!dot || !ring) return;
        
        document.addEventListener('mousemove', (e) => {
            dot.style.left = `${e.clientX}px`;
            dot.style.top = `${e.clientY}px`;
            
            // Smooth trailing motion for the ring cursor!
            ring.animate({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`
            }, { duration: 150, fill: 'forwards' });
        });
        
        // Scale and animate cursors on clicking
        document.addEventListener('mousedown', () => {
            dot.classList.add('clicking');
            ring.classList.add('clicking');
        });
        
        document.addEventListener('mouseup', () => {
            dot.classList.remove('clicking');
            ring.classList.remove('clicking');
        });
        
        // Hover states on all interactive elements
        const hoverables = 'a, button, select, input[type="range"], input[type="checkbox"], label, .category-header, .terrain-option';
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches(hoverables) || e.target.closest(hoverables)) {
                dot.classList.add('hovering');
                ring.classList.add('hovering');
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            if (e.target.matches(hoverables) || e.target.closest(hoverables)) {
                dot.classList.remove('hovering');
                ring.classList.remove('hovering');
            }
        });
    }

    launchSimulator() {
        // Hide design lab, show simulator
        document.getElementById('design-lab').classList.remove('active');
        document.getElementById('simulator').classList.add('active');

        // Initialize simulator with current configuration
        if (window.uavSimulator) {
            window.uavSimulator.initialize(this.calculator.config, this.getEnvironmentConfig());
        }
    }

    getEnvironmentConfig() {
        return {
            windSpeed: parseFloat(document.getElementById('wind-speed').value),
            windDirection: parseFloat(document.getElementById('wind-direction').value),
            visibility: parseFloat(document.getElementById('visibility').value),
            temperature: parseFloat(document.getElementById('temperature').value),
            terrain: document.querySelector('.terrain-option.selected').dataset.terrain
        };
    }
}
