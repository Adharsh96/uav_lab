// Telemetry Display and Flight Data Graphs
class TelemetryDisplay {
    constructor() {
        this.chart = null;
        this.chartData = {
            labels: [],
            datasets: []
        };
        this.maxDataPoints = 300; // 30 seconds at 10Hz
        this.isPaused = false;
        
        this.initializeChart();
        this.setupControls();
    }

    initializeChart() {
        const ctx = document.getElementById('flight-graph').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Throttle (%)',
                        data: [],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4
                    },
                    {
                        label: 'Altitude (m)',
                        data: [],
                        borderColor: '#00BCD4',
                        backgroundColor: 'rgba(0, 188, 212, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4
                    },
                    {
                        label: 'Battery (%)',
                        data: [],
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4
                    },
                    {
                        label: 'Speed (m/s)',
                        data: [],
                        borderColor: '#E91E63',
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(76, 175, 80, 0.1)'
                        },
                        ticks: {
                            color: '#b0c4de'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#b0c4de',
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }

    setupControls() {
        document.getElementById('pause-graph').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            const button = document.getElementById('pause-graph');
            button.textContent = this.isPaused ? '▶' : '⏸';
        });

        document.getElementById('clear-graph').addEventListener('click', () => {
            this.clearData();
        });
    }

    update(physicsState, controls) {
        // Update telemetry displays
        this.updateTelemetryValues(physicsState, controls);
        
        // Update graphs
        if (!this.isPaused) {
            this.updateGraph(physicsState, controls);
        }
        
        // Update artificial horizon
        this.updateArtificialHorizon(physicsState);
    }

    updateTelemetryValues(state, controls) {
        // Position and velocity
        document.getElementById('telem-altitude').textContent = `${state.position.y.toFixed(1)} m`;
        
        const verticalSpeed = state.velocity.y;
        const vspeedElement = document.getElementById('telem-vspeed');
        vspeedElement.textContent = `${verticalSpeed >= 0 ? '↑' : '↓'}${Math.abs(verticalSpeed).toFixed(1)} m/s`;
        
        const horizontalSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
        document.getElementById('telem-speed').textContent = `${horizontalSpeed.toFixed(1)} m/s`;
        
        // Heading
        const euler = new THREE.Euler().setFromQuaternion(state.rotation);
        const heading = ((euler.y * 180 / Math.PI) + 360) % 360;
        document.getElementById('telem-heading').textContent = `${heading.toFixed(0)}°`;
        
        // Distance from home
        const distance = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
        document.getElementById('telem-distance').textContent = `${distance.toFixed(1)} m`;
        
        // Armed status
        const armedElement = document.getElementById('armed-status');
        if (state.isArmed) {
            armedElement.textContent = 'ARMED';
            armedElement.classList.add('armed');
        } else {
            armedElement.textContent = 'DISARMED';
            armedElement.classList.remove('armed');
        }
        
        // Battery
        document.getElementById('telem-battery').textContent = `${state.batteryPercentage.toFixed(0)}%`;
        document.getElementById('telem-voltage').textContent = `${state.batteryVoltage.toFixed(1)}V`;
        document.getElementById('telem-current').textContent = `${state.currentDraw.toFixed(1)}A`;
        
        // Battery bar
        const batteryFill = document.getElementById('battery-fill');
        batteryFill.style.width = `${state.batteryPercentage}%`;
        batteryFill.classList.remove('warning', 'critical');
        if (state.batteryPercentage < 30) {
            batteryFill.classList.add('warning');
        }
        if (state.batteryPercentage < 10) {
            batteryFill.classList.add('critical');
        }
        
        // Orientation
        const pitch = euler.z * 180 / Math.PI;
        const roll = euler.x * 180 / Math.PI;
        const yaw = euler.y * 180 / Math.PI;
        
        document.getElementById('telem-pitch').textContent = `${pitch.toFixed(1)}°`;
        document.getElementById('telem-roll').textContent = `${roll.toFixed(1)}°`;
        document.getElementById('telem-yaw').textContent = `${yaw.toFixed(1)}°`;

        // Scientific updates
        const thrust = state.thrustForce || 0;
        const telemThrust = document.getElementById('telem-thrust-force');
        if (telemThrust) telemThrust.textContent = `${thrust.toFixed(2)} N`;

        const drag = state.dragForce || 0;
        const telemDrag = document.getElementById('telem-drag-force');
        if (telemDrag) telemDrag.textContent = `${drag.toFixed(2)} N`;

        const energy = state.energyConsumedWh || 0;
        const telemEnergy = document.getElementById('telem-energy');
        if (telemEnergy) telemEnergy.textContent = `${energy.toFixed(3)} Wh`;

        const ax = state.acceleration.x || 0;
        const ay = state.acceleration.y || 0;
        const az = state.acceleration.z || 0;
        const telemAccel = document.getElementById('telem-accel');
        if (telemAccel) telemAccel.textContent = `${ax.toFixed(1)}, ${ay.toFixed(1)}, ${az.toFixed(1)} m/s²`;

        const gx = (state.angularVelocity.x || 0) * 180 / Math.PI;
        const gy = (state.angularVelocity.y || 0) * 180 / Math.PI;
        const gz = (state.angularVelocity.z || 0) * 180 / Math.PI;
        const telemGyro = document.getElementById('telem-gyro');
        if (telemGyro) telemGyro.textContent = `${gx.toFixed(0)}, ${gy.toFixed(0)}, ${gz.toFixed(0)} °/s`;
    }

    updateGraph(state, controls) {
        const time = state.timestamp.toFixed(1);
        
        // Add new data point
        this.chart.data.labels.push(time);
        this.chart.data.datasets[0].data.push(controls.throttle * 100);
        this.chart.data.datasets[1].data.push(state.position.y);
        this.chart.data.datasets[2].data.push(state.batteryPercentage);
        
        const horizontalSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
        this.chart.data.datasets[3].data.push(horizontalSpeed);
        
        // Remove old data points
        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }
        
        this.chart.update('none'); // Update without animation
    }

    updateArtificialHorizon(state) {
        const euler = new THREE.Euler().setFromQuaternion(state.rotation);
        const pitch = euler.z * 180 / Math.PI;
        const roll = euler.x * 180 / Math.PI;
        
        const horizonLine = document.querySelector('.horizon-line');
        const horizon = document.getElementById('artificial-horizon');
        
        // Apply pitch (vertical movement) and roll (rotation)
        if (horizonLine && horizon) {
            const pitchOffset = pitch * 2; // Scale for visibility
            horizonLine.style.transform = `translateY(calc(-50% + ${-pitchOffset}px)) rotate(${roll}deg)`;
        }
    }

    clearData() {
        this.chart.data.labels = [];
        this.chart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        this.chart.update();
    }

    reset() {
        this.clearData();
        this.isPaused = false;
        document.getElementById('pause-graph').textContent = '⏸';
    }
}
