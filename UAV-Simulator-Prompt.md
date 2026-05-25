# Complete Prompt for Building UAV Virtual Lab Simulator Web Application

## Project Overview
Build a comprehensive web-based UAV (Unmanned Aerial Vehicle) virtual laboratory simulator that allows students to design, customize, and simulate drones in realistic 3D environments. The application should run entirely in the browser using modern web technologies.

---

## Technical Stack Requirements

### Core Technologies
- **3D Graphics**: Three.js (WebGL-based 3D library)
- **Physics Engine**: Cannon.js or Oimo.js (for realistic physics simulation)
- **UI Framework**: Pure HTML5, CSS3, and JavaScript (no external UI frameworks required)
- **Math Library**: Three.js built-in math or gl-matrix for vector/matrix operations
- **Data Visualization**: Chart.js or similar for real-time graph plotting

### Browser Compatibility
- Modern browsers supporting WebGL 2.0
- Responsive design for desktop (1920x1080 minimum)

---

## Application Architecture

### Two Main Sections
1. **Design Lab** - UAV configuration and customization interface
2. **Simulator** - Real-time flight simulation environment

---

## SECTION 1: DESIGN LAB

### 1.1 Layout Structure
The Design Lab should be divided into four main panels:

#### Panel A: 3D Preview Window (60% screen width, full height)
- **3D Viewport Features**:
  - Real-time 3D rendering of the UAV being designed
  - Interactive controls: Mouse drag to rotate, Mouse wheel to zoom, Right-click drag to pan
  - Grid floor for reference (10x10 meter grid)
  - Axis helper (X=Red, Y=Green, Z=Blue)
  - Lighting: Hemisphere light + Directional light with shadows
  - Background: Gradient sky (light blue to white)

#### Panel B: Component Selection Menu (20% screen width, left sidebar)
Organize components in collapsible categories:

**1. Frame/Body**
- Quad-rotor (X or + configuration)
- Hexa-rotor (6 motors)
- Octa-rotor (8 motors)
- Each with sub-options for material:
  - Carbon Fiber (lightweight, strong - mass multiplier: 1.0)
  - Aluminum (medium weight - mass multiplier: 1.3)
  - Plastic (heavy, cheap - mass multiplier: 1.5)
- Frame size: 250mm, 450mm, 650mm, 850mm diagonal wheelbase

**2. Propellers**
- Size: 5", 6", 7", 8", 10", 12"
- Pitch: 4.5", 5", 5.5", 6"
- Number of blades: 2, 3, 4
- Material: Plastic, Carbon Fiber
- Auto-calculate thrust coefficient based on size and pitch

**3. Motors**
- KV rating: 1000KV, 1500KV, 2300KV, 2700KV, 3600KV
- Max current: Auto-calculated from KV
- Weight: 25g to 150g based on size
- Display motor specifications in tooltip

**4. Battery**
- Type: LiPo (3.7V per cell)
- Cell count (S): 3S, 4S, 6S (determines voltage: 11.1V, 14.8V, 22.2V)
- Capacity (mAh): 1300, 2200, 3300, 5000, 8000, 10000
- C-rating: 25C, 45C, 65C, 90C (discharge rate)
- Auto-calculate weight: ~0.15g per mAh

**5. Flight Controller**
- Types: Basic Stabilization, GPS-enabled, Advanced (with obstacle avoidance)
- Weight: 10g - 50g
- Features displayed in description

**6. Payload (Optional)**
- Camera: 50g - 200g
- Sensors: 20g - 100g
- Delivery box: 100g - 500g
- Custom weight input

#### Panel C: Environment Settings (20% screen width, right sidebar)

**Weather Conditions**:
- **Wind Speed**: Slider 0-30 m/s
  - Display: Current value with indicator (Calm, Light Breeze, Strong Wind, Storm)
  - Direction: 0-360° compass selector
- **Visibility**: Slider 100m - 10km
  - Affects fog density in simulator
- **Temperature**: -20°C to 45°C
  - Affects battery performance and air density

**Terrain Selection**:
- **Flat Terrain**
  - Characteristics: Grass texture, completely flat
  - Size: 500m x 500m
  - Features: Few scattered objects (trees, rocks)
  
- **Hilly Terrain**
  - Characteristics: Rolling hills generated with Perlin noise
  - Elevation range: 0-100m
  - Grass/dirt textures
  - Procedural trees on hillsides
  
- **Urban Environment**
  - Characteristics: City with procedurally generated buildings
  - Building heights: 10m - 100m
  - Street grid pattern
  - Concrete/asphalt textures
  
- **Desert Terrain**
  - Characteristics: Sand dunes using Perlin noise
  - Elevation range: 0-50m
  - Sand texture with normal maps
  - Minimal vegetation, some rock formations

#### Panel D: Summary & Launch Section (Bottom panel, full width, 20% height)

**UAV Specifications Summary**:
Display calculated values in a clean dashboard:
- **Total Mass**: Sum of all components (in grams)
- **Total Thrust**: Calculated from motors, propellers, voltage
- **Thrust-to-Weight Ratio**: Total thrust / Total weight (display with color coding: Red <1.5, Yellow 1.5-2.5, Green >2.5)
- **Estimated Flight Time**: Battery capacity / Average current draw (minutes)
- **Max Speed**: Estimated from thrust and drag
- **Power Consumption**: Watts at hover, Watts at full throttle

**Design Tips Section**:
Provide intelligent feedback based on configuration:
- If TWR < 1.5: "⚠️ Warning: Low thrust-to-weight ratio. Aircraft may struggle to lift off. Consider lighter frame or more powerful motors."
- If TWR > 4.0: "⚠️ Warning: Very high thrust. Aircraft will be very responsive but battery life will be short."
- If battery too small: "💡 Tip: Increase battery capacity for longer flight time."
- If too heavy: "💡 Tip: Consider lighter materials or smaller battery."
- Good configuration: "✅ Great design! Balanced performance and flight time."

**Launch Button**:
- Large, prominent button: "LAUNCH SIMULATOR"
- Button disabled until minimum requirements met (frame, motors, battery selected)
- Smooth transition animation to simulator view

---

## SECTION 2: SIMULATOR

### 2.1 Main Simulation Window (Full Screen)

#### Rendering Setup
- **Canvas**: Full viewport coverage
- **Renderer**: WebGL with antialiasing
- **Camera**: Perspective camera (FOV: 75°)
- **Frame Rate**: Target 60 FPS
- **Physics Update Rate**: 120 Hz (independent of render rate)

### 2.2 Camera View System (Top UI Bar)

Implement multiple camera views with smooth transitions:

**1. Chase Camera (Default)**
- Position: 5-10m behind and 2-3m above UAV
- Behavior: Follows UAV with slight lag (smoothing factor: 0.1)
- Rotation: Follows UAV orientation
- Auto-adjust distance based on speed

**2. First Person View (FPV)**
- Position: Mounted on UAV center
- Rotation: Locked to UAV orientation
- Provides pilot's perspective
- Slight camera shake based on throttle (realistic vibration)

**3. Free Camera**
- User-controlled position and rotation
- WASD keys to move, Mouse to look
- Can orbit around UAV or explore terrain
- Speed adjustable with +/- keys

**4. Top-Down View**
- Position: Directly above UAV at 50m
- Rotation: Fixed downward (-90° pitch)
- Useful for navigation and position awareness

**5. Side View**
- Position: 20m to the side of UAV
- Fixed height, follows UAV horizontally
- Useful for observing altitude changes

**Camera Controls**:
- Dropdown menu or Tab key to cycle through views
- Smooth camera interpolation (0.5s transition time)
- "Reset Camera" button for each view

### 2.3 RC Controller Interface (Bottom Right, 300x400px)

#### Visual RC Controller Design
Create a realistic RC transmitter interface:

**Left Stick (Throttle/Yaw)**:
- Vertical axis: Throttle (0-100%)
- Horizontal axis: Yaw (-100° to +100° per second)
- Visual: Circular boundary with draggable stick
- Spring return: Only for yaw (throttle stays at position)
- Color: Throttle=Green, Yaw=Blue indicators

**Right Stick (Pitch/Roll)**:
- Vertical axis: Pitch (-45° to +45°)
- Horizontal axis: Roll (-45° to +45°)
- Visual: Circular boundary with draggable stick
- Spring return: Both axes return to center when released
- Color: Pitch=Red, Roll=Yellow indicators

**Control Methods**:
1. **Mouse Control**:
   - Click and drag sticks
   - Visual feedback on stick position
   
2. **Keyboard Control**:
   - W/S: Throttle up/down
   - A/D: Yaw left/right
   - Arrow Up/Down: Pitch forward/backward
   - Arrow Left/Right: Roll left/right
   - Space: Emergency stop (cut all motors)
   
3. **Gamepad Support** (if connected):
   - Left stick: Throttle/Yaw
   - Right stick: Pitch/Roll
   - Auto-detect gamepad

**Special Buttons**:
- **RTH (Return to Home)**: Auto-pilot to starting position
- **EMERGENCY STOP**: Immediate motor cut-off (UAV falls)
- **ARM/DISARM**: Safety toggle (motors won't spin when disarmed)

### 2.4 Telemetry Display (Top Right, 250x300px)

#### Real-time Data Dashboard
Display flight data in clean, readable format:

**Primary Flight Data**:
- **Altitude**: 0.0m (AGL - Above Ground Level)
- **Vertical Speed**: ±0.0 m/s (with up/down arrows)
- **Ground Speed**: 0.0 m/s
- **Heading**: 0° (with compass rose visualization)
- **Distance from Home**: 0.0m

**System Status**:
- **Armed Status**: ARMED / DISARMED (color coded: Red/Green)
- **Battery Voltage**: 14.8V / 14.8V (current / starting)
- **Battery Percentage**: 100% (with progress bar)
- **Current Draw**: 0.0A
- **Motor Temperatures**: 25°C (average)

**Orientation Data**:
- **Pitch**: 0.0° (with horizon line indicator)
- **Roll**: 0.0° (with level indicator)
- **Yaw**: 0.0° (compass)

**Visual Indicators**:
- Artificial Horizon (attitude indicator)
- Battery indicator bar (Green >70%, Yellow 30-70%, Red <30%)
- Warning lights for: Low battery, High current, Connection loss

### 2.5 Flight Data Graphs (Bottom Left, 600x250px)

#### Multi-Channel Real-Time Graphs
Use scrolling time-series charts:

**Graph Configuration**:
- Update rate: 10 Hz (smooth visualization)
- Time window: Last 30 seconds
- Auto-scaling Y-axis
- Grid lines and labels

**Channels to Display** (as separate line graphs or multi-line):

1. **Throttle** (0-100%) - Green line
2. **Pitch** (-45° to +45°) - Red line
3. **Roll** (-45° to +45°) - Yellow line
4. **Yaw Rate** (-100°/s to +100°/s) - Blue line
5. **Altitude** (0-100m) - Cyan line
6. **Battery Voltage** (Full to Empty) - Orange line
7. **Current Draw** (0-100A) - Purple line

**Graph Features**:
- Legend with color coding
- Pause/Resume button
- Clear data button
- Export data as CSV option

---

## PHYSICS IMPLEMENTATION

### 3.1 Flight Dynamics Model

Implement realistic quadcopter physics based on Newton-Euler equations:

#### Forces Acting on UAV

**1. Thrust Force**
```javascript
// For each motor i:
T_i = k * ω_i² // k = thrust coefficient, ω = angular velocity (rad/s)
// k depends on propeller size, pitch, air density

// Total thrust (body frame):
T_body = [0, 0, Σ(T_i)] // All thrust in +Z direction (up)

// Transform to world frame:
T_world = rotationMatrix * T_body
```

**2. Gravity Force**
```javascript
F_gravity = [0, -m * g, 0] // g = 9.81 m/s²
// Always points down in world frame
```

**3. Drag Force**
```javascript
// Air resistance (opposite to velocity)
F_drag = -0.5 * ρ * C_d * A * |v|² * v_normalized
// ρ = air density (1.225 kg/m³ at sea level, adjust for temperature)
// C_d = drag coefficient (~0.5 for quadcopter)
// A = frontal area (estimate from frame size)
// v = velocity vector
```

**4. Wind Force**
```javascript
// Constant wind + turbulence
v_relative = v_drone - v_wind
F_wind = -0.5 * ρ * C_d * A * |v_relative|² * v_relative_normalized
// Add Perlin noise for turbulence
```

#### Torques for Rotation

**1. Motor Torques**
```javascript
// Roll torque (rolling moment from thrust difference)
τ_roll = L * (T_right - T_left) // L = arm length

// Pitch torque
τ_pitch = L * (T_front - T_back)

// Yaw torque (from motor drag)
τ_yaw = k_m * (ω_1² - ω_2² + ω_3² - ω_4²)
// k_m = motor drag coefficient
// Motors 1,3 spin CW; Motors 2,4 spin CCW (for stability)
```

**2. Aerodynamic Damping**
```javascript
// Damping torque opposing rotation
τ_damping = -k_damping * angular_velocity
// k_damping based on frame size and drag
```

#### PID Controllers

Implement cascaded PID controllers for stability:

**Attitude Controller** (Inner loop - fast, 500Hz):
```javascript
// For Roll:
error_roll = desired_roll - current_roll
P_roll = Kp_roll * error_roll
I_roll += Ki_roll * error_roll * dt
D_roll = Kd_roll * (error_roll - prev_error_roll) / dt
output_roll = P_roll + I_roll + D_roll

// Similar for Pitch and Yaw
// Output controls motor speed differential
```

**Position/Altitude Controller** (Outer loop - slow, 50Hz):
```javascript
// Altitude hold:
error_alt = desired_alt - current_alt
throttle_correction = Kp_alt * error_alt + Kd_alt * vertical_velocity

// Position hold (when using GPS):
error_pos = desired_pos - current_pos
desired_pitch = Kp_pos * error_pos.x
desired_roll = Kp_pos * error_pos.y
```

**Suggested PID Gains** (tune for stability):
- Roll/Pitch: Kp=4.0, Ki=0.05, Kd=1.2
- Yaw: Kp=3.0, Ki=0.01, Kd=0.5
- Altitude: Kp=2.0, Ki=0.0, Kd=1.5

### 3.2 Battery Discharge Model

Implement realistic battery behavior:

```javascript
// Voltage drop under load (Shepherd model)
V_current = V_full - (V_full - V_empty) * (Q_used / Q_total) - I * R_internal

// Where:
// V_full = cells * 4.2V (fully charged LiPo)
// V_empty = cells * 3.5V (safe cutoff)
// Q_used = discharged capacity (Ah)
// Q_total = total battery capacity (Ah)
// I = current draw (A)
// R_internal = internal resistance (~0.02Ω per cell)

// Current draw calculation:
P_motors = Σ(V_battery * I_motor_i)
I_motor = (ω / Kv) // Simplified motor current
// Kv = motor velocity constant
```

**Battery Cutoff Logic**:
- Warning at 30% (3.7V per cell)
- Critical at 10% (3.5V per cell)
- Auto land or RTH triggered

### 3.3 Motor Dynamics

Model motor response and limits:

```javascript
// Motor speed limited by voltage and Kv
ω_max = Kv * V_battery * (1 - I/I_max) // Speed drops under load

// Motor acceleration (not instant)
ω_current += (ω_target - ω_current) * motor_response_rate * dt
// motor_response_rate ~= 20-50 rad/s² depending on motor

// ESC update rate: 400Hz - 2000Hz (simulate delay)
```

### 3.4 Environmental Effects

**Air Density**:
```javascript
// Temperature affects air density
ρ = ρ_0 * (T_0 / T_current) // ρ_0 = 1.225 kg/m³ at 15°C
// Lower density = less thrust and lift
```

**Wind Gusts**:
```javascript
// Perlin noise for realistic turbulence
wind_gust = Perlin3D(position / scale, time) * wind_intensity
v_wind_total = v_wind_constant + wind_gust
```

**Ground Effect**:
```javascript
// Increased thrust efficiency near ground (within 1x rotor diameter)
if (altitude < rotor_diameter) {
  thrust_multiplier = 1 + 0.1 * (1 - altitude / rotor_diameter)
}
```

---

## 3D TERRAIN GENERATION

### 4.1 Procedural Terrain Requirements

All terrains must be generated using code (no external 3D models):

#### Flat Terrain
```javascript
// Simple flat plane with texture
geometry = new THREE.PlaneGeometry(500, 500, 50, 50)
material = new THREE.MeshStandardMaterial({
  map: grassTexture,
  roughness: 0.8
})
// Add random trees, rocks using instanced meshes
```

#### Hilly Terrain
```javascript
// Use Perlin noise for elevation
for (let i = 0; i < vertices.length; i++) {
  let x = vertices[i].x
  let y = vertices[i].y
  vertices[i].z = Perlin2D(x/50, y/50) * 30 + 
                  Perlin2D(x/20, y/20) * 10
}
geometry.computeVertexNormals()
// Apply grass/rock texture based on slope
```

#### Urban Environment
```javascript
// Procedural building generation
for (let x = -250; x < 250; x += 30) {
  for (let y = -250; y < 250; y += 30) {
    if (isRoad(x, y)) continue // Grid streets
    
    height = random(10, 100)
    width = random(10, 20)
    building = new THREE.BoxGeometry(width, height, width)
    // Add windows texture procedurally
    addWindows(building, height)
  }
}
```

#### Desert Terrain
```javascript
// Sand dunes with Perlin noise
for (let i = 0; i < vertices.length; i++) {
  let x = vertices[i].x
  let y = vertices[i].y
  vertices[i].z = abs(Perlin2D(x/80, y/80)) * 25 +
                  abs(Perlin2D(x/30, y/30)) * 8
}
// Smooth sand texture with normal maps
```

### 4.2 Collision Detection

Implement collision with terrain:

```javascript
// Raycast from UAV to ground
raycaster.set(uav_position, down_vector)
intersects = raycaster.intersectObject(terrain_mesh)

if (intersects.length > 0) {
  ground_altitude = intersects[0].point.y
  altitude_AGL = uav_position.y - ground_altitude
  
  // Collision response
  if (altitude_AGL < 0.1) {
    // Crash or bounce
    applyGroundCollision()
  }
}
```

---

## USER INTERFACE REQUIREMENTS

### 5.1 Design Lab UI

**Styling**:
- Modern, clean interface
- Dark theme with accent colors (blues and greens)
- Smooth transitions and animations
- Responsive hover effects
- Clear typography (Sans-serif, 14-16px)

**Components**:
- Custom sliders with value displays
- Radio buttons for single-choice options
- Dropdowns for long lists
- Tooltips on hover for explanations
- Progress bars for loading

### 5.2 Simulator UI

**HUD Style**:
- Semi-transparent dark panels
- Monospace font for numerical data
- Color-coded warnings (green/yellow/red)
- Minimalist, non-intrusive

**Responsive Design**:
- UI scales with window size
- Minimum resolution: 1280x720
- Elements reposition for smaller screens

---

## DATA FLOW & STATE MANAGEMENT

### 6.1 Application State
```javascript
const appState = {
  currentSection: 'design-lab', // or 'simulator'
  
  designConfig: {
    frame: { type, material, size, mass },
    motors: { kv, count, mass, maxCurrent },
    propellers: { size, pitch, blades, material },
    battery: { cells, capacity, cRating, voltage, mass },
    flightController: { type, mass },
    payload: { type, mass },
    environment: {
      wind: { speed, direction },
      visibility,
      temperature,
      terrain: 'flat' // or 'hilly', 'urban', 'desert'
    }
  },
  
  simulationState: {
    position: Vector3,
    velocity: Vector3,
    acceleration: Vector3,
    rotation: Quaternion,
    angularVelocity: Vector3,
    
    batteryVoltage: float,
    batteryPercentage: float,
    currentDraw: float,
    
    motorSpeeds: [ω1, ω2, ω3, ω4, ...],
    
    isArmed: boolean,
    timestamp: float
  },
  
  controls: {
    throttle: 0-1,
    pitch: -1 to 1,
    roll: -1 to 1,
    yaw: -1 to 1,
    cameraMode: 'chase' // or 'fpv', 'free', 'top', 'side'
  }
}
```

### 6.2 Update Loop Structure

```javascript
// Main loop
function animate(timestamp) {
  requestAnimationFrame(animate)
  
  const deltaTime = (timestamp - lastTimestamp) / 1000
  lastTimestamp = timestamp
  
  // Fixed timestep physics (120 Hz)
  accumulator += deltaTime
  while (accumulator >= physicsTimestep) {
    updatePhysics(physicsTimestep)
    accumulator -= physicsTimestep
  }
  
  // Render at display framerate
  updateControls()
  updateCamera()
  updateTelemetry()
  updateGraphs()
  renderer.render(scene, camera)
}

function updatePhysics(dt) {
  // 1. Get control inputs
  // 2. Run PID controllers
  // 3. Calculate motor speeds
  // 4. Compute forces and torques
  // 5. Integrate accelerations -> velocities -> positions
  // 6. Update orientations
  // 7. Check collisions
  // 8. Update battery
}
```

---

## PERFORMANCE OPTIMIZATION

### 7.1 Rendering Optimizations
- Use instanced meshes for repeated objects (trees, buildings)
- Frustum culling for terrain chunks
- Level of Detail (LOD) for distant objects
- Texture atlases to reduce draw calls
- Shadow map resolution: 2048x2048 max

### 7.2 Physics Optimizations
- Spatial partitioning for collision detection
- Sleep inactive physics bodies
- Simplified collision shapes (boxes, spheres)
- Physics in Web Worker (if possible)

---

## IMPLEMENTATION NOTES

### 8.1 Code Structure
```
project/
├── index.html
├── css/
│   ├── main.css
│   ├── design-lab.css
│   └── simulator.css
├── js/
│   ├── main.js
│   ├── design-lab/
│   │   ├── ui-handler.js
│   │   ├── component-builder.js
│   │   ├── preview-renderer.js
│   │   └── calculations.js
│   ├── simulator/
│   │   ├── physics-engine.js
│   │   ├── flight-controller.js
│   │   ├── uav-model.js
│   │   ├── camera-controller.js
│   │   ├── telemetry.js
│   │   └── terrain-generator.js
│   ├── utils/
│   │   ├── perlin-noise.js
│   │   ├── pid-controller.js
│   │   └── vector-math.js
│   └── lib/
│       ├── three.min.js
│       ├── cannon.min.js (or oimo.min.js)
│       └── chart.min.js
└── assets/
    └── textures/
        ├── grass.jpg
        ├── sand.jpg
        ├── concrete.jpg
        └── sky.jpg
```

### 8.2 Development Priorities
1. Set up Three.js scene with basic UAV model
2. Implement Design Lab UI and component selection
3. Build calculation engine for UAV specs
4. Create terrain generation systems
5. Implement physics engine with basic forces
6. Add PID controllers for stability
7. Build control input system (keyboard, mouse, gamepad)
8. Create camera system with multiple views
9. Implement telemetry display
10. Add flight data graphs
11. Integrate battery discharge model
12. Add environmental effects (wind, temperature)
13. Polish UI/UX
14. Optimize performance
15. Test and debug

### 8.3 Testing Scenarios
- Hover stability test (should maintain altitude with no input)
- Response to wind gusts (should recover automatically)
- Battery drain accuracy (compare to calculated flight time)
- Collision detection (should detect ground/building impacts)
- Camera transitions (smooth, no clipping)
- UI responsiveness (all controls functional)
- Different UAV configurations (quad, hexa, octa)
- All terrain types render correctly

---

## REFERENCE IMPLEMENTATIONS

Study these for inspiration:
- FPVSIM (https://fpvsim.com/sim) - Flight feel and physics
- Drone Simulator Three.js examples - 3D rendering
- Real Drone Simulator - Physics accuracy
- Flight control PID tuning guides - Controller parameters

---

## ADDITIONAL FEATURES (Optional Enhancements)

### Phase 2 Features:
- Save/Load designs (localStorage or JSON export)
- Flight missions and waypoints
- Multiplayer (race against others)
- Video recording of flights
- Advanced weather (rain, fog effects)
- First-person acrobatic mode (flips, rolls)
- Damage model (crash = broken parts)
- Leaderboards (longest flight time, fastest lap)

---

## FINAL NOTES

**Critical Success Factors**:
1. **Realistic Physics**: UAV must behave like real quadcopter (stable hover, responsive to inputs)
2. **Performance**: Must run smoothly at 60 FPS on mid-range hardware
3. **Educational Value**: Clear feedback helps students understand design tradeoffs
4. **Usability**: Intuitive controls, clear UI, helpful tooltips
5. **Visual Quality**: Professional-looking 3D graphics and terrain

**Physics Accuracy Priority**:
- Focus on getting thrust-to-weight calculations accurate
- PID tuning is critical for stable flight
- Battery discharge should match real-world behavior
- Wind effects should feel realistic

**Start Simple**:
- Build basic quad-rotor first
- Get flat terrain working before procedural generation
- Implement chase camera before other views
- Basic keyboard controls before gamepad support

This prompt provides complete specifications for a professional-grade educational UAV simulator. The implementation should follow modern web development practices, with clean code, comments, and modular architecture.