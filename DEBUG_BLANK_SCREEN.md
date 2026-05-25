# Debug Blank Screen Issue

## Changes Made

I've added comprehensive logging to help identify the blank screen issue.

### Files Modified:
1. `js/main.js` - Added logging to initialize() and animate()
2. `js/simulator/flight-controller.js` - Added toggleArm() method with logging

## How to Debug

### Step 1: Open Browser Console
1. **Refresh the page** with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Open Developer Console**: Press `F12` or right-click → "Inspect"
3. **Go to Console tab**

### Step 2: Launch Simulator
1. Click "LAUNCH SIMULATOR" button
2. Check console for these messages:
   ```
   Initializing simulator...
   Removing old renderer (if exists)
   Setting up scene...
   Scene setup complete. Renderer: true Scene: true Camera: true
   Terrain generated
   UAV model created
   Physics initialized
   Flight controller initialized
   Camera controller initialized
   Telemetry initialized
   Starting animation loop...
   ```

### Step 3: Click ARM Button
1. Click the "ARM" button
2. Check console for:
   ```
   Toggle ARM clicked
   Current armed state: false
   Simulator isRunning: true
   Arming...
   New armed state: true
   ```

### Step 4: Check for Errors
Look for any of these errors in console:
- "Renderer, scene, or camera is null"
- "Render error:"
- "Animation stopped - isRunning is false"
- "UAV Simulator or physics not available"

## Common Issues & Solutions

### Issue 1: "isRunning is false"
**Cause**: Animation loop stopped
**Solution**: Check exitSimulator() method

### Issue 2: "Renderer, scene, or camera is null"
**Cause**: setupScene() failed
**Solution**: Check Three.js is loaded properly

### Issue 3: Canvas not visible
**Cause**: CSS issue or canvas not added to DOM
**Solution**: Check #simulator-canvas-container element

### Issue 4: Black screen but console shows no errors
**Cause**: Lights not working or camera position
**Solution**: Check camera position and lighting setup

## What to Look For

### In Console (F12):
1. ✅ All initialization messages appear
2. ✅ No red error messages
3. ✅ "Starting animation loop..." appears
4. ✅ When ARM clicked, see "Arming..." message
5. ✅ "Simulator isRunning: true"

### In Visual Display:
1. ✅ Sky (light blue) visible
2. ✅ Terrain/ground visible
3. ✅ UAV model visible
4. ✅ Shadows rendering

## Testing Steps

### Test 1: Basic Launch
```
1. Refresh page (Ctrl+Shift+R)
2. Open console (F12)
3. Click "LAUNCH SIMULATOR"
4. Look at console logs
5. Is scene visible? YES / NO
```

### Test 2: ARM Button
```
1. After launching simulator
2. Check console for "Starting animation loop..."
3. Click "ARM" button
4. Check console for "Toggle ARM clicked"
5. Does screen stay visible? YES / NO
```

### Test 3: Multiple ARM/DISARM
```
1. Click ARM
2. Screen visible? ___
3. Click DISARM  
4. Screen visible? ___
5. Click ARM again
6. Screen visible? ___
```

## Send This Information

If the problem persists, send me:

1. **Console logs** from Step 2 & 3 above
2. **Any error messages** in red
3. **Screenshot** of blank screen
4. **Results** from Test 1, 2, and 3

## Quick Fix to Try

If you see "Renderer, scene, or camera is null" error:

1. Check if Three.js is loaded:
   - Console: `typeof THREE`
   - Should show: "object"

2. Check if OrbitControls is loaded:
   - Console: `typeof THREE.OrbitControls`
   - Should show: "function"

3. Check container exists:
   - Console: `document.getElementById('simulator-canvas-container')`
   - Should show: `<div id="simulator-canvas-container">...</div>`

## Emergency Fix

If nothing works, try this in console:
```javascript
// Force restart simulator
window.uavSimulator.isRunning = true;
window.uavSimulator.animate();
```

---

**Please refresh the browser and follow the debug steps above. Share the console logs with me!**
