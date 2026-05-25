// Terrain Generator for UAV Simulator (Optimized & High-Density Low-Poly Geometry Cache)
class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.terrain = null;
        this.terrainType = 'flat';

        // Preallocate and cache standard low-poly geometries to avoid GC stutter!
        this.geometries = {
            trunk: new THREE.CylinderGeometry(0.2, 0.3, 3, 5), // Super low-poly 5 segments!
            foliage: new THREE.ConeGeometry(1.6, 3.5, 5),
            rock: new THREE.DodecahedronGeometry(0.7, 0), // Flat faceted rock faces!
            unitBox: new THREE.BoxGeometry(1, 1, 1), // Unified building geometry to scale!
            cactusBody: new THREE.CylinderGeometry(0.12, 0.12, 2.0, 5),
            cactusArm: new THREE.CylinderGeometry(0.08, 0.08, 0.6, 5)
        };

        // Cache reusable standard materials
        this.materials = {
            trunk: new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9, flatShading: true }),
            foliage: new THREE.MeshStandardMaterial({ color: 0x1B5E20, roughness: 0.9, flatShading: true }),
            rock: new THREE.MeshStandardMaterial({ color: 0x6E6E6E, roughness: 0.9, flatShading: true }),
            cactus: new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.9, flatShading: true }),
            asphalt: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 }),
            streetLine: new THREE.MeshBasicMaterial({ color: 0xFFD700 }), // Bright yellow lines
            desertSand: new THREE.MeshStandardMaterial({ color: 0xE5C298, roughness: 0.95, flatShading: true }),
            buildingMats: []
        };

        // Pre-create some randomized brutalist building colored materials
        for (let i = 0; i < 5; i++) {
            this.materials.buildingMats.push(new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0, 0, 0.2 + i * 0.12),
                roughness: 0.6,
                metalness: 0.4
            }));
        }
    }

    generate(type) {
        if (this.terrain) {
            this.scene.remove(this.terrain);
            // Dispose logic can be handled or left for ThreeJS standard collector
        }

        this.terrainType = type;
        const terrainGroup = new THREE.Group();

        switch(type) {
            case 'flat':
                this.generateFlatTerrain(terrainGroup);
                break;
            case 'hilly':
                this.generateHillyTerrain(terrainGroup);
                break;
            case 'urban':
                this.generateUrbanTerrain(terrainGroup);
                break;
            case 'desert':
                this.generateDesertTerrain(terrainGroup);
                break;
            default:
                this.generateFlatTerrain(terrainGroup);
        }

        this.terrain = terrainGroup;
        this.scene.add(terrainGroup);
        return this.terrain;
    }

    generateFlatTerrain(group) {
        // Ground plane (Low poly mesh)
        const groundGeometry = new THREE.PlaneGeometry(600, 600, 20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x9CCC65,
            roughness: 0.9,
            flatShading: true
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        group.add(ground);

        // High-density low-poly trees (120 trees!)
        for (let i = 0; i < 120; i++) {
            const tree = this.createTree();
            tree.position.x = (Math.random() - 0.5) * 500;
            tree.position.z = (Math.random() - 0.5) * 500;
            tree.position.y = 0;
            group.add(tree);
        }

        // High-density low-poly rocks (70 rocks!)
        for (let i = 0; i < 70; i++) {
            const rock = this.createRock();
            rock.position.x = (Math.random() - 0.5) * 500;
            rock.position.z = (Math.random() - 0.5) * 500;
            rock.position.y = 0;
            group.add(rock);
        }
    }

    generateHillyTerrain(group) {
        // Hilly ground with Perlin noise
        const geometry = new THREE.PlaneGeometry(600, 600, 60, 60);
        const vertices = geometry.attributes.position.array;

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            
            // Hilly procedural waves
            const elevation = perlin.octaveNoise2D(x / 60, y / 60, 4, 0.5) * 22 +
                             perlin.octaveNoise2D(x / 25, y / 25, 2, 0.3) * 6;
            
            vertices[i + 2] = elevation;
        }
        geometry.computeVertexNormals();

        const ground = new THREE.Mesh(geometry, this.materials.foliage);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        group.add(ground);

        // High-density trees on hillsides (160 trees!)
        for (let i = 0; i < 160; i++) {
            const tree = this.createTree();
            const x = (Math.random() - 0.5) * 450;
            const z = (Math.random() - 0.5) * 450;
            const y = perlin.octaveNoise2D(x / 60, z / 60, 4, 0.5) * 22 +
                      perlin.octaveNoise2D(x / 25, z / 25, 2, 0.3) * 6;
            
            tree.position.set(x, y, z);
            group.add(tree);
        }

        // Add some rocks on hills (60 rocks)
        for (let i = 0; i < 60; i++) {
            const rock = this.createRock();
            const x = (Math.random() - 0.5) * 450;
            const z = (Math.random() - 0.5) * 450;
            const y = perlin.octaveNoise2D(x / 60, z / 60, 4, 0.5) * 22 +
                      perlin.octaveNoise2D(x / 25, z / 25, 2, 0.3) * 6;
            
            rock.position.set(x, y, z);
            group.add(rock);
        }
    }

    generateUrbanTerrain(group) {
        // Ground plane (asphalt)
        const groundGeometry = new THREE.PlaneGeometry(600, 600);
        const ground = new THREE.Mesh(groundGeometry, this.materials.asphalt);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        group.add(ground);

        // Street grid layout
        const streetWidth = 4;
        const streetLineGeo = new THREE.PlaneGeometry(600, 0.1);
        
        for (let x = -280; x <= 280; x += 40) {
            // Horizontal street stripes
            const streetLine = new THREE.Mesh(streetLineGeo, this.materials.streetLine);
            streetLine.rotation.x = -Math.PI / 2;
            streetLine.position.set(0, 0.02, x);
            group.add(streetLine);

            const vertLine = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 600), this.materials.streetLine);
            vertLine.rotation.x = -Math.PI / 2;
            vertLine.position.set(x, 0.02, 0);
            group.add(vertLine);
        }

        // Dense brutalist buildings (180 buildings!)
        for (let x = -260; x < 260; x += 40) {
            for (let z = -260; z < 260; z += 40) {
                // Ensure clearance for road lanes
                if (Math.abs(x) < 15 && Math.abs(z) < 15) continue; // Keep center home base clear!
                if (Math.random() > 0.85) continue; // Random empty blocks/parks

                const building = this.createBuilding();
                building.position.set(x + (Math.random() - 0.5) * 10, 0, z + (Math.random() - 0.5) * 10);
                group.add(building);
            }
        }
    }

    generateDesertTerrain(group) {
        // Desert dunes with Perlin noise
        const geometry = new THREE.PlaneGeometry(600, 600, 40, 40);
        const vertices = geometry.attributes.position.array;

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            
            const elevation = Math.abs(perlin.octaveNoise2D(x / 90, y / 90, 3, 0.5)) * 20 +
                            Math.abs(perlin.octaveNoise2D(x / 40, y / 40, 2, 0.3)) * 5;
            
            vertices[i + 2] = elevation;
        }
        geometry.computeVertexNormals();

        const terrain = new THREE.Mesh(geometry, this.materials.desertSand);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        group.add(terrain);

        // Add 35 low-poly rock formations
        for (let i = 0; i < 35; i++) {
            const rock = this.createRock();
            rock.scale.multiplyScalar(2.5 + Math.random() * 3);
            const x = (Math.random() - 0.5) * 450;
            const z = (Math.random() - 0.5) * 450;
            const y = Math.abs(perlin.octaveNoise2D(x / 90, z / 90, 3, 0.5)) * 20;
            
            rock.position.set(x, y - 0.5, z);
            group.add(rock);
        }

        // Add desert cacti (50 cacti!)
        for (let i = 0; i < 55; i++) {
            const cactus = this.createCactus();
            const x = (Math.random() - 0.5) * 450;
            const z = (Math.random() - 0.5) * 450;
            const y = Math.abs(perlin.octaveNoise2D(x / 90, z / 90, 3, 0.5)) * 20;
            
            cactus.position.set(x, y, z);
            group.add(cactus);
        }
    }

    createTree() {
        const tree = new THREE.Group();
        
        // Cache-instanced trunk mesh
        const trunk = new THREE.Mesh(this.geometries.trunk, this.materials.trunk);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        tree.add(trunk);

        // Cache-instanced foliage mesh
        const foliage = new THREE.Mesh(this.geometries.foliage, this.materials.foliage);
        foliage.position.y = 3.6;
        foliage.castShadow = true;
        tree.add(foliage);

        // Randomly scale trees slightly for organic variety
        const scale = 0.75 + Math.random() * 0.6;
        tree.scale.set(scale, scale, scale);

        return tree;
    }

    createRock() {
        const rock = new THREE.Mesh(this.geometries.rock, this.materials.rock);
        rock.castShadow = true;
        
        const scale = 0.5 + Math.random() * 1.5;
        rock.scale.set(scale, scale, scale);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        
        return rock;
    }

    createCactus() {
        const cactus = new THREE.Group();
        
        // Main trunk
        const main = new THREE.Mesh(this.geometries.cactusBody, this.materials.cactus);
        main.position.y = 1.0;
        main.castShadow = true;
        cactus.add(main);

        // Left arm
        const leftArm = new THREE.Group();
        const armH1 = new THREE.Mesh(this.geometries.cactusArm, this.materials.cactus);
        armH1.rotation.z = Math.PI / 2;
        armH1.position.x = -0.3;
        leftArm.add(armH1);

        const armV1 = new THREE.Mesh(this.geometries.cactusArm, this.materials.cactus);
        armV1.position.x = -0.6;
        armV1.position.y = 0.3;
        leftArm.add(armV1);
        leftArm.position.y = 1.0;
        cactus.add(leftArm);

        // Right arm
        const rightArm = new THREE.Group();
        const armH2 = new THREE.Mesh(this.geometries.cactusArm, this.materials.cactus);
        armH2.rotation.z = Math.PI / 2;
        armH2.position.x = 0.3;
        rightArm.add(armH2);

        const armV2 = new THREE.Mesh(this.geometries.cactusArm, this.materials.cactus);
        armV2.position.x = 0.6;
        armV2.position.y = 0.4;
        rightArm.add(armV2);
        rightArm.position.y = 1.3;
        cactus.add(rightArm);

        const scale = 0.8 + Math.random() * 0.5;
        cactus.scale.set(scale, scale, scale);
        
        return cactus;
    }

    createBuilding() {
        const height = 15 + Math.random() * 75;
        const width = 12 + Math.random() * 8;
        const depth = 12 + Math.random() * 8;

        const mat = this.materials.buildingMats[Math.floor(Math.random() * this.materials.buildingMats.length)];
        
        // Use single cached unitBox geometry and scale the mesh! Very high performance.
        const buildingMesh = new THREE.Mesh(this.geometries.unitBox, mat);
        buildingMesh.scale.set(width, height, depth);
        buildingMesh.position.y = height / 2;
        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;

        return buildingMesh;
    }

    getTerrainHeight(x, z) {
        if (!this.terrain) return 0;

        const raycaster = new THREE.Raycaster();
        raycaster.set(
            new THREE.Vector3(x, 1000, z),
            new THREE.Vector3(0, -1, 0)
        );

        const intersects = raycaster.intersectObjects(this.terrain.children, true);
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }

        return 0;
    }
}
