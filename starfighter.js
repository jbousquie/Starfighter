/// <reference path="/var/www/html/BJS/Babylon.js/dist/preview release/babylon.d.ts" />
"use strict";

// ======================================================
// SCENE


var createScene = function(canvas, engine) {
    // Shortener function for new BABYLON.Vector3
    var V = function(x, y, z) { return new BABYLON.Vector3(+x, +y, +z); }; 

    // Global parameters
    var enemyNb = 5|0;                                          // Max number of enemies
    var enemySpeed = 1.0;                      // enemy max speed
    var sightDistance = 5|0;                                    // sight distance 
    var canLength = 0.4;                                        // cannon length
    var canRadius = 0.04;                                       // cannon radius
    var laserNb = 12|0;                        // number of avalaible lasers in the pool, suitable value around 8 (2 * 4 cannons)
    var laserSpeed = 0.52;                     // laser decrease speed, suitable value = 0.6, the lower, the faster
    var fireHeat = 15|0;                       // nb of frame before a cannon can fire again after a shoot, around 15 
    var starNb = 150|0;                        // star total number in the pool
    var distance = 60.0;                       // star emitter distance from the screen
    var starSpeed = 1.0;                       // star speed on Z axis
    var enemyExplosionVelocity = 1.15;         // Enemy particle max velocity
    var enemyLaserNb = 30|0;                   // enemy laser max number
    var enemyLaserSpeed = 2.0;                 // enemy laser speed
    var enemyShield = 8|0;                     // enemy shield = 6 + random * enemyShield
    var enemyFireFrequency = 0.1;              // between 0 and 1 : each frame for each enemy
    var enemyFireLimit = 3.0 * sightDistance;  // enemy doesn't fire under this z limit
    var cockpitArea = V(1.0, 1.0, 2.5);        // cockpit sensitive area (-x to x, -y to y, fixed z)

    var halfPI = Math.PI / 2.0;                // PI / 2
    var search = true;                         // global boolean for serach in pools
    var l = 0|0;                               // laser index
    var fired = false;                         // global boolean

    // Keyboard and mouse inputs
    var CTRL = 17|0;
    var SHIFT = 16|0;
    var keyboard = [];                                                  // input array
    var pressedPointer = false;
    function updateInput(event, boolVal) {
        if (event.keyCode == CTRL) { keyboard[CTRL] = boolVal; }
        if (event.keyCode == SHIFT) { keyboard[SHIFT] = boolVal; }
    }    
    window.addEventListener('keydown', function(event) { updateInput(event, true); });
    window.addEventListener('keyup', function(event) { updateInput(event, false); });
    window.addEventListener('mousedown', function(e) { pressedPointer = true; });
    window.addEventListener('mouseup', function(e) { pressedPointer = false; });
    var getInputs = function() {
        fired = (keyboard[SHIFT] || pressedPointer) ? true : false;
    };


    // Scene
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color3.Black();
    // Camera : fixed, looking toward +Z
    var camera = new BABYLON.TargetCamera("camera", V(0.0, 0.0, 0.0), scene);
    camera.direction = V(0.0, 1.0, 1.0);
    var cameraFov = Math.tan(camera.fov * 0.5);                             //  camera FOV ratio
    var fovCorrection = cameraFov * sightDistance;              // sight projection ratio from the screen space 
    var aspectRatio = engine.getAspectRatio(camera);                        //  aspect ratio from width/height screen size
    
    var light = new BABYLON.HemisphericLight('light1', V(0.0, 1.0, -0.75), scene);
    var lightInitialIntensity = 0.85
    light.intensity = lightInitialIntensity;

    // Point light used for the lasers
    var pointLight = new BABYLON.PointLight('pointLight', V(0.0, 0.0, 0.0), scene);
    pointLight.diffuse = new BABYLON.Color3(0.0, 0.0, 1.0);
    pointLight.specular = new BABYLON.Color3(0.5, 0.5, 1);
    var plIntensity = 0.6;
    pointLight.intensity = 0.0;

    // Point light used for the explosions
    var explosionLight = new BABYLON.PointLight('explosionLight', V(0.0, 0.0, 0.0), scene);
    explosionLight.diffuse = new BABYLON.Color3(1.0, 1.0, 0.6);
    explosionLight.specular = new BABYLON.Color3(1.0, 1.0, 0.8);
    var explLghtIntensity = 1.0;
    explosionLight.intensity = 0.0;

    // Materials and Textures
        // Cannon and cockpit material
    var canMat = new BABYLON.StandardMaterial("cm", scene);
    var canTexture = new BABYLON.Texture("rusty.jpg", scene);
    canMat.diffuseTexture = canTexture;
        // Enemy material
    var enMat = new BABYLON.StandardMaterial("em", scene);
    enMat.emissiveColor = new BABYLON.Color3(1.0, 1.0, 1.0);
    enMat.diffuseColor = new BABYLON.Color3(0.4, 1.0, 0.8);
    enMat.diffuseTexture = canTexture;
    enMat.specularPower = 1024.0;
    enMat.freeze();
        // Sight material
    var sightMat = new BABYLON.StandardMaterial("sm", scene);
    var sightTexture = new BABYLON.Texture("viseur.png", scene);
    sightTexture.hasAlpha = true;
    sightMat.emissiveTexture = sightTexture;
    sightMat.diffuseTexture = sightTexture;
    sightMat.useAlphaFromDiffuseTexture = true;
        // Laser material
    var laserMat = new BABYLON.StandardMaterial("lm", scene);
    laserMat.emissiveColor = BABYLON.Color3.White();
    laserMat.freeze();
        // Star, laser lights, laser impact and explosion material
    var starTexture = new BABYLON.Texture("flarealpha.png", scene);
    starTexture.hasAlpha = true;
    var starMat = new BABYLON.StandardMaterial("sm", scene);
    starMat.emissiveColor = BABYLON.Color3.White();
    starMat.diffuseColor = BABYLON.Color3.White();
    starMat.diffuseTexture = starTexture;
    starMat.useAlphaFromDiffuseTexture = true;
    starMat.freeze();

    // Enemies
    var enemies = new Array(enemyNb);           // Pool of enemy objects 
    var EnemyCorrection = 0.0;                  // tmp var for Enemy FOV correction
    var eX = 0.0;                               // tmp var for current Enemy x coordinate in the screen space
    var eY = 0.0;                               // tmp var for current Enemy y coordinate in the screen space
    var bbox;                                   // tmp var for current Enemy mesh bounding box
    var boxSizeX = 0.0;                         // tmp var for current Enemy x half size in the screen space
    var boxSizeY = 0.0;                         // tmp var for current Enemy y half size in the screen space
        // Enemy object
    var Enemy = function(sps) {
        this.sps = sps;                         // Enemy SPS
        this.mesh = sps.mesh;                   // Enemy SPS mesh
        this.maxShield = 6|0 + (Math.random() * enemyShield)|0;                  // Enemy resistance
        this.speed = enemySpeed * Math.random();                                 // speed
        this.shield = this.maxShield;                               // current shield value
        this.explosion = false;                                     // if the Enemy is exploding
        this.mustRebuild = false;                                   // if the sps must be rebuilt
        this.randAng = V(Math.random(), Math.random(), Math.random());  // random correction for enemy particle rotations and velocities
        this.initialParticlePositions = [];     // initial SPS particle positions computed with digest()
        var initPos = this.initialParticlePositions;
        var acc = this.accuracy;
        this.rebuild = function() {
            for (var ip = 0|0; ip < sps.nbParticles; ip++) {
                sps.particles[ip].position.copyFrom(initPos[ip]);
                sps.particles[ip].color.a = 1.0;
                sps.particles[ip].rotation.x = 0.0;
                sps.particles[ip].rotation.y = 0.0;
                sps.particles[ip].rotation.z = 0.0;
                sps.particles[ip].velocity.copyFrom(sps.particles[ip].position);
                sps.particles[ip].velocity.scaleInPlace(Math.random() * enemyExplosionVelocity);
            }
        };
        this.shoot = function() {
            search = true;
            l = enemyLaserIndex;
            // search an avalaible enemy laser in the pool
            while (l < stars.nbParticles && search) {
                if (!stars.particles[l].alive) {
                    for (var il = 0|0; il < 2|0; il++) {
                        stars.particles[l + il].alive = true;
                        stars.particles[l + il].isVisible = true;
                        stars.particles[l + il].position.copyFrom(sps.mesh.position);
                        sps.mesh.position.scaleToRef(-1.0, stars.particles[l + il].velocity);
                        stars.particles[l + il].velocity.normalize();
                        stars.particles[l + il].velocity.scaleInPlace(enemyLaserSpeed);
                        stars.particles[l + il].color.copyFrom(enemyLaserInitialColor);
                        stars.particles[l + il].rotation.z = halfPI * il;
                        search = false;
                    }
                } else {
                    l += 2|0;
                }
            }
        };
    };
        // Enemy mesh
    var disc1 = BABYLON.MeshBuilder.CreateCylinder('', { height: 0.1, tessellation: 16|0, diameter: 3.2 }, scene);    
    var disc2 = BABYLON.MeshBuilder.CreateCylinder('', { height: 0.1, tessellation: 16|0, diameter: 3.2 }, scene);
    var cyl = BABYLON.MeshBuilder.CreateCylinder('', { diameter: 0.5, height: 4.0, subdivisions: 2|0 }, scene);
    var sph = BABYLON.MeshBuilder.CreateSphere('', { diameter: 2.0, segments: 4|0}, scene);
    cyl.rotation.z = halfPI;
    disc1.rotation.z = halfPI;      
    disc2.rotation.z = -halfPI;
    disc1.position.x = 2.0;
    disc2.position.x = -2.0;
    
    var EnemyModel = BABYLON.Mesh.MergeMeshes([cyl, sph, disc1, disc2], true, true);
    var e = 0|0;
    for (e = 0|0; e < enemyNb; e++) {
        var EnemySPS = new BABYLON.SolidParticleSystem('es'+e, scene);              // create a SPS per enemy
        EnemySPS.digest(EnemyModel, {facetNb: 1|0, delta: 6|0});                                                // digest the enemy model
        EnemySPS.buildMesh();
        EnemySPS.mesh.hasVertexAlpha = true;
        EnemySPS.mesh.material = enMat;
        enemies[e] = new Enemy(EnemySPS);
        for (var ep = 0|0; ep < EnemySPS.nbParticles; ep++) {                       // initialize the enemy SPS particles
            var curPart = EnemySPS.particles[ep];
            enemies[e].initialParticlePositions.push(curPart.position.clone());
            curPart.velocity.copyFrom(curPart.position);
            curPart.velocity.multiplyInPlace(enemies[e].randAng);
            curPart.velocity.scaleInPlace(enemyExplosionVelocity);
            curPart.uvs.z = 0.20;                                               // let's do a different render with the same texture as the cockpit one
            curPart.uvs.w = 0.08;
        }
        EnemySPS.setParticles();                                                    // set the particle once at their computed positions
        EnemySPS.refreshVisibleSize();                                              // compute the bounding boxes
        // enemy explosion
        EnemySPS.updateParticle = function(p) {
            if (enemies[e].explosion) {
                p.position.addInPlace(p.velocity);
                p.rotation.x += p.velocity.z * enemies[e].randAng.x;
                p.rotation.y += p.velocity.x * enemies[e].randAng.y;
                p.rotation.z += p.velocity.y * enemies[e].randAng.z;
                p.color.a -= 0.01;
                explosionLight.intensity -= 0.001;
                if (explosionLight.intensity < 0.001) { explosionLight.intensity = 0.0; }
                if (p.color.a < 0.01) {
                    enemies[e].mustRebuild = true;
                }
            }
        };
        // set enemy initial positions in space
        EnemySPS.mesh.position.z = 50.0 + Math.random() * 10.0;
        EnemySPS.mesh.position.y = -2.0 + Math.random() * 2.0;
        EnemySPS.mesh.position.x = -24.0 + 12.0 * e;
        EnemySPS.mesh.rotation.z = Math.random() * e;
    }
    EnemyModel.dispose();


    // Cockpit : two tubes and one ribbon merged together
    var path1 = [V(-1.5, 0.8, 0.0), V(-0.5, -0.8, 3.0)];
    var path2 = [V(1.5, 0.8, 0.0), V(0.5, -0.8, 3.0)];
    var tube1 = BABYLON.MeshBuilder.CreateTube('t1', {path: path1, radius: 0.03}, scene); 
    var tube2 = BABYLON.MeshBuilder.CreateTube('t2', {path: path2, radius: 0.03}, scene);
    var rpath1 = [];
    var rpath2 = [];
    for (var r = 0; r <= 10; r ++) {
        var t = r / 10; 
        rpath1.push( V(-0.5 + t, -0.05 * Math.cos(r * Math.PI / 5) - 0.75, 3.1) );
        rpath2.push( V(-0.5 + t, -1.0, 0.0 ) );
    }
    var rib = BABYLON.MeshBuilder.CreateRibbon('rb', { pathArray: [rpath1, rpath2] }, scene);
    var cockpit = BABYLON.Mesh.MergeMeshes([tube1, tube2, rib], true, true);
    cockpit.alwaysSelectAsActiveMesh = true;                            // the cockpit is always in the frustum
    cockpit.freezeWorldMatrix();                                        // and never moves
    rib = tube1 = tube2 = null;

    // Cannons : 4 tube instances
    var canPos = new BABYLON.Vector3(-1.5, -1, 2.2);
    var canPath = [V(0.0, 0.0, 0.0), V(0.0, 0.0, canLength * .80), V(0.0, 0.0, canLength * .80), V(0.0, 0.0, canLength)];
    var radiusFunction = function(i, dist) {
        var rad = canRadius;
        if (i == 2) { rad *= 1.25; }
        if (i == 3) { rad *= 0.8; }
        return rad;
    };
    var cannon0 = BABYLON.MeshBuilder.CreateTube("c0", {path: canPath, radiusFunction: radiusFunction }, scene);
    
    cannon0.material = canMat;
    cannon0.position = canPos;
    cockpit.material = canMat;
    
    var cannon1 = cannon0.createInstance("c1", scene);
    cannon1.position.x = -cannon0.position.x;
    var cannon2 = cannon0.createInstance("c2", scene);
    cannon2.position.y = -cannon0.position.y;
    var cannon3 = cannon0.createInstance("c3", scene);
    cannon3.position.y = cannon2.position.y;
    cannon3.position.x = cannon1.position.x;

    // all the cannons are always in the frustum
    cannon0.alwaysSelectAsActiveMesh = true;
    cannon1.alwaysSelectAsActiveMesh = true;
    cannon2.alwaysSelectAsActiveMesh = true;
    cannon3.alwaysSelectAsActiveMesh = true;

    // cannon pools : cannons, cannon directions, cannon heats
    var cannons = [cannon0, cannon1, cannon2, cannon3];
    var cannonDirections = [V(0.0, 0.0, 0.0), V(0.0, 0.0, 0.0), V(0.0, 0.0, 0.0), V(0.0, 0.0, 0.0)]; 
    var cannonHeats = [0|0, 0|0, 0|0, 0|0];

    // Sight
    var sightPos = V(0.0, 0.0, sightDistance);
    var sight = BABYLON.MeshBuilder.CreatePlane("sight", {size: 0.2}, scene);
    sight.position = sightPos;
    sight.material = sightMat;
    light.excludedMeshes = [sight];

    // Lasers
        // laser model
    var positions = [-canRadius * 2, -1.0, 0.0, canRadius * 2, -1.0, 0.0, 0.0, 0.0, 0.0];
    var indices = [0|0, 1|0, 2|0];
    var normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    var colors = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0];
    var vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.colors = colors;
    var laserModel = new BABYLON.Mesh("l", scene);
    vertexData.applyToMesh(laserModel);

        // laser ball model
    var tess = 24|0;
    var ballModel = BABYLON.MeshBuilder.CreateDisc('lb', {radius: 1, tessellation: tess, updatable: true}, scene);
    var ballColors = new Float32Array(4|0 * (tess + 3|0)); // a closed circle has tess + 3 vertices
    ballColors[0] = 0.5;            // disc center
    ballColors[1] = 0.5;
    ballColors[2] = 1.0;
    ballColors[3] = 0.8;
    for (var c = 1|0; c <= tess + 2; c++) {
        ballColors[c * 4|0] = 0.5;
        ballColors[c * 4|0 + 1|0] = 0.5;
        ballColors[c * 4|0 + 2|0] = 1.0;
        ballColors[c * 4|0 + 3|0] = 0.7;
    }
    ballModel.setVerticesData(BABYLON.VertexBuffer.ColorKind, ballColors);

        // laser SPS : laser triangles and balls in the same system 
    var laserMesh = new BABYLON.SolidParticleSystem("lsps", scene);
    laserMesh.addShape(laserModel, laserNb);
    laserMesh.addShape(ballModel, laserNb);
    laserMesh.buildMesh();
    laserModel.dispose();
    ballModel.dispose();
    laserMesh.isAlwaysVisible = true;
    laserMesh.computeParticleColor = false;
    laserMesh.computeParticleTexture = false;
    laserMesh.mesh.hasVertexAlpha = true;
    laserMesh.mesh.material = laserMat;
    light.excludedMeshes.push(laserMesh.mesh);    

        // laser logical objects
    var Laser = function(i) {
        this.mesh = laserMesh.particles[i];             // reference to the laser sps i-th particle
        this.target = V(0.0, 0.0, 0.0);                 // world target coordinates, in the sight plane
        this.direction = V(0.0, 0.0, 0.0);              // vector : laser cannon - target
        this.fired = false;                             // laser fired ?
        this.cannon = 0;                                // index of the fired cannon in the array "cannons"
        this.scale = 0.0;                               // current scale
        this.screenTarget = BABYLON.Vector2.Zero();     // target coordinates in the screen space
    };

    var lasers = [];        // laser pool
    var laser;              // current laser object reference : a laser or a laser ball
    var ball;               // current laser ball object reference 
    var impact;             // current laser impact object reference
    // lasers[] is populated with laserNb lasers and laserNb laser balls
    for (l = 0|0; l < laserNb * 2|0; l++) {
        laser = new Laser(l);
        laser.mesh.alive = false;
        laser.mesh.scale.y = 0.0;
        laser.mesh.scale.x = 0.0;
        laser.mesh.position.z = sightDistance;
        lasers.push(laser);
    }


    // Stars ... laser lights, laser impacts and explosions because they are exactly the same particle
    var starEmitterSize = distance / 1.2                                // size width of the particle emitter square surface
    var rotMatrix = BABYLON.Matrix.Zero();                              // rotation matrix
    var angY = 0.0;                                                     // rotation angle around Y
    var angX = 0.0;                                                     // rotation angle around X
    var moderation = 6.0;                                               // moderator for max angle computation : +/- PI/2 / moderation 
    var pointerDistanceX = 0.0;                                         // pointer x distance to the canvas center
    var pointerDistanceY = 0.0;                                         // pointer x distance to the canvas center
    var speedVector = V(0.0, 0.0, - starSpeed);                         // star initial velocity vector
    var tmpSpeed = V(0.0, 0.0, 0.0);                              	    // particle computed velocity vector
    var starZLimit = sightDistance;                                     // z limit for particle recycling
    var angShift = Math.atan(cannon0.position.y / distance);            // initial angle shift due to cannon y position       
    var lightDistance = distance * 0.66;                                // distance from where the laser lights are emitted
    var ballFovCorrection = cameraFov * lightDistance; // FOV correction for the balls in the distance
    var impactInitialColor = new BABYLON.Color4(0.6, 0.6, 1.0, 0.85);   // as their names suggest it
    var explosionInitialColor = new BABYLON.Color4(1.0, 1.0, 0.0, 0.98);
    var laserLightInitialColor = new BABYLON.Color4(0.4, 0.4, 1.0, 0.8);
    var enemyLaserInitialColor = new BABYLON.Color4(0.8, 0.0, 0.0, 0.5);
    var laserLightIndex = starNb;                                       // starting index of the laser lights in the sps "particles" array
    var impactIndex = starNb + laserNb;                                 // starting index of the laser impacts in the sps "particles" array
    var enemyLaserIndex = impactIndex + enemyLaserNb;                   // starting index of the enemy lasers in the sps "particles" array

        
        // Star SPS
    var stars = new BABYLON.SolidParticleSystem("stars", scene);
    var model = BABYLON.MeshBuilder.CreatePlane("p", {size: 0.2}, scene);
    stars.addShape(model, starNb + laserNb + laserNb + enemyLaserNb * 2|0);   // starNb stars + laserNb lights + laserNb impacts + enemyLaserNb
    model.dispose();
    stars.buildMesh();
    stars.mesh.hasVertexAlpha = true;
    stars.mesh.material = starMat;
    light.excludedMeshes.push(stars.mesh);
    var explosions = [];                                            // is an laser impact an explosion
    var exploded = [];                                              // what enemy was shot by the i-th laser
    var ex = 0|0;
    for (ex = 0|0; ex < laserNb; ex++) {
        explosions[ex] = false;
    }

        // Star SPS initialization
    stars.initParticles = function() {
        var p = stars.particles;
        for (var i = 0|0; i < stars.nbParticles; i++) {
            // stars
            if (i < laserLightIndex) {           
                p[i].position.x = starEmitterSize * (Math.random() - 0.5);
                p[i].position.y = starEmitterSize * (Math.random() - 0.5);
                p[i].position.z = distance * Math.random();  
                p[i].velocity.z = 1.1 - Math.random() * 0.2;
            } 
            // laser lights
            else if (i < impactIndex) {    
                p[i].alive = false;                
                p[i].isVisible = false;
                p[i].position.z = lightDistance;
                p[i].velocity.z = 0.5;
                p[i].color.copyFrom(laserLightInitialColor);
                p[i].scale.x = distance / lightDistance * 1.2;
                p[i].scale.y = p[i].scale.x;
            }  
            // enemy impact or explosion
            else if (i < enemyLaserIndex) {                           
                p[i].alive = false;
                p[i].isVisible = false;
                p[i].color.copyFrom(impactInitialColor);
                p[i].position.z = sightDistance;
            } 
            // enemy laser
            else {
                p[i].alive = false;
                p[i].isVisible = false;
                p[i].color.copyFrom(enemyLaserInitialColor);
            }
        }
    };

   

   // Angle values for all particles : called once per call to stars.setParticles()
   stars.beforeUpdateParticles = function() {  
       // update pointerX and pointerY : coordinates of the pointer in the screen space
       // update also angX and angY, X and Y rotation angles, atan(pointerS)  
       if (scene.pointerX) {
           pointerDistanceX = 2.0 * scene.pointerX / canvas.width - 1;
            angY = Math.atan(pointerDistanceX);
       }
       if (scene.pointerY) {
           pointerDistanceY =  1.0 - 2.0 * scene.pointerY / canvas.height;
           angX = Math.atan(pointerDistanceY); 
       }
       // Speed vector rotation
       BABYLON.Matrix.RotationYawPitchRollToRef(angY / moderation, angX / moderation, 0.0, rotMatrix);
       BABYLON.Vector3.TransformCoordinatesToRef(speedVector, rotMatrix, tmpSpeed);  
   };
     

   // Star behavior
   stars.updateParticle = function(p) {   
       // star
       if (p.idx < laserLightIndex) {   
            // move
            p.position.addInPlace(tmpSpeed);
            p.position.x -= pointerDistanceX * p.position.z * p.velocity.z / distance;
            p.position.y -= pointerDistanceY * p.position.z * p.velocity.z / distance;
            // recycle
            if (p.position.z < starZLimit) {
                p.position.z = distance * (1.0 - Math.random() / 4.0);
                p.position.x = starEmitterSize * (Math.random() - 0.5) + distance * pointerDistanceX / 2.0;
                p.position.y = starEmitterSize * (Math.random() - 0.5) + distance * pointerDistanceY / 2.0;
                p.scale.x = 1.1 - Math.random() * 0.2;
                p.scale.y = p.scale.x;
                p.velocity.z = 1.1 - Math.random() * 0.2;
            }
       }
       // laser light 
       else if (p.idx < impactIndex) {               
            if (p.alive) {
                // move
                p.position.z += p.velocity.z;
                p.position.x -= pointerDistanceX * p.position.z * p.velocity.z / distance;
                p.position.y -= pointerDistanceY * p.position.z * p.velocity.z / distance;
                // recycle laser light
                if (p.position.z > distance) {
                    p.alive = false;
                    p.isVisible = false;
                }
            }
        } 
        // enemy impact or explosion
        else if (p.idx < enemyLaserIndex) {                                        
            if (p.alive) {
                p.position.x -= pointerDistanceX * p.position.z / distance;
                p.position.y -= pointerDistanceY * p.position.z / distance; 
                // explosion
                if (explosions[p.idx - impactIndex]) {     
                    p.position.copyFrom(exploded[p.idx - impactIndex].position);
                    p.scale.x *= (1.0 + 0.5 * Math.random());
                    p.scale.y = p.scale.x / (1.1 + Math.random());
                    p.color.r = explosionInitialColor.r - Math.random() * 0.1;
                    p.color.g = explosionInitialColor.g - Math.random() * 0.1;
                    p.color.b = explosionInitialColor.b;
                    p.color.a -= 0.05;
                    // recycle explosion
                    if (p.scale.x > 250.0) {         
                        p.isVisible = false;
                        p.alive = false;
                        p.position.z = sightDistance;
                        p.color.copyFrom(impactInitialColor);
                        explosions[p.idx - impactIndex] = false;
                    }
                } 
                // impact
                else {                                        
                    p.color.a -= 0.01;
                    p.scale.x -= 0.1;
                    p.scale.y = p.scale.x;
                    // recycle impact
                    if (p.scale.x < 0.01) {         
                        p.alive = false;
                        p.isVisible = false;
                        p.color.copyFrom(impactInitialColor);
                    } 
                }            
            }
        } 
        // enemy laser
        else { 
            if (p.alive) {
                p.position.addInPlace(p.velocity);
                p.position.x += pointerDistanceX * p.position.z * p.velocity.z / distance;
                p.position.y += pointerDistanceY * p.position.z * p.velocity.z / distance;
                p.rotation.z += 0.66;
                p.scale.x = 2.0 + cockpitArea.z / p.position.z * 4.0;
                p.scale.y = 4.0 * p.scale.x;
                p.color.a += 0.005;
                p.color.r += 0.01;
                p.color.g += 0.01;
                if (p.color.a > 0.9) { p.color.a = 0.9; }
                if (p.color.r > 1.0) { p.color.r = 1.0; }
                if (p.color.g < 0.0) { p.color.g = 0.0; }
                // recycle
                if (p.position.z < cockpitArea.z) {
                    p.alive = false;
                    p.isVisible = false;
                    // check laser hits cockpit
                    if (p.position.x < cockpitArea.x && p.position.x > -cockpitArea.x && p.position.y < cockpitArea.y && p.position.y > -cockpitArea.y ) {
                        // shake camera
                        ouchX = true;
                        ouchY = true;
                        ouchZ = true;
                        camToLeft = false;
                        returnCamX = false;
                        returnCamY = false;
                        returnCamZ = false;
                        tmpCam.copyFromFloats((Math.random() - 0.5) * 0.3, Math.random() * 0.1, -Math.random() * 0.1) ;
                        if (tmpCam.x < 0.0) { camToLeft = true; }
                        light.diffuse.b = 0.0;
                        light.diffuse.g = 0.5;
                        light.intensity = 1.0;
                    }
                }
            }
            
        }
   }
   
    // star initialization
    stars.initParticles();
    stars.isAlwaysVisible = true;
    //stars.computeParticleRotation = false;
    stars.computeParticleTexture = false;
    stars.setParticles();
    stars.mesh.freezeWorldMatrix();
    stars.mesh.freezeNormals();


    // Sight and cannon position according to the mouse pointer
    var setSightAndCannons = function() {
        // sight position
        sight.position.x = pointerDistanceX * fovCorrection * aspectRatio;
        sight.position.y = pointerDistanceY * fovCorrection;
        // cannon rotation and direction
        for(var i = 0|0; i < cannons.length; i++) {
            sight.position.subtractToRef(cannons[i].position, cannonDirections[i]);
            cannons[i].rotation.y = Math.atan2(cannonDirections[i].x, cannonDirections[i].z);
            cannons[i].rotation.x =  -Math.atan2(cannonDirections[i].y  * Math.cos(cannons[i].rotation.y), cannonDirections[i].z);
            if (cannonHeats[i] > 0|0) { cannonHeats[i]--; }   // cannon cooling
        }
    };
    
    // Lasers position and animation
    var targetAxis = V(0.0, 0.0, 0.0);              // tmp cross vector target/camera
    var axis3 = V(0.0, 0.0, 0.0);                   // tmp cross vector laser/targetAxis
    var ballPos = V(0.0, 0.0, 0.0);                 // tmp ball position to be added to its cannon
    var ballRadius = canRadius * 8.0;               // ball initial radius
    var can = 0|0;                                  // fired cannon index
    var lg = 0|0;                                   // laser light in the star SPS particle array
    var bboxpc = 0.75;                              // percentage of the bbox to check the target against

    var setLasers = function() {
        l = 0|0;
        search = true;
        can = (Math.random() * 4|0)|0;
        pointLight.intensity -= 0.1;
        if (pointLight.intensity < 0.0) { pointLight.intensity = 0.0; }
        if (fired && cannonHeats[can] == 0|0) {
            cannonHeats[can] = fireHeat;
            while (l < laserNb && search) {
                laser = lasers[l];                  // current laser
                ball = lasers[l + laserNb];         // current laser ball
                if (!laser.fired) { 
                    lg = starNb + l;                // related light index in the star SPS particle array
                    laser.fired = true;             // activate the laser object
                    laser.mesh.alive = true;        // activate the related laser mesh 
                    ball.mesh.alive = true;         // activate the related laser ball
                    laser.cannon = can;             // store the laser fired cannon
                    ball.cannon = can;              // store the ball fired cannon
                    laser.screenTarget.copyFromFloats(pointerDistanceX, pointerDistanceY);
                    laser.target.copyFrom(sight.position);              // store the laser target position
                    laser.direction.copyFrom(cannonDirections[can]);    // store the laser direction from its cannon
                    laser.scale = laser.direction.length();             // store the laser scale
                    laser.direction.normalize();
                    laser.mesh.position.copyFrom(laser.target);                     // set the laser mesh position
                    laser.target.subtractToRef(camera.position, targetAxis);        // compute a cross vector from the direction and cam axis 
                    BABYLON.Vector3.CrossToRef(laser.direction, targetAxis, axis3);
                    BABYLON.Vector3.RotationFromAxisToRef(axis3, null, targetAxis, laser.mesh.rotation);    // rotate the laser mesh
                    laser.mesh.scale.y = laser.scale * fovCorrection / laserSpeed;                          // scale the laser mesh triangle
                    laser.mesh.scale.x = 1.0;
                    ball.mesh.scale.x = ballRadius * (1.2 - Math.random() * 0.8);                           // scale the laser ball
                    ball.mesh.scale.y = ball.mesh.scale.x;
                    laser.direction.scaleToRef(canLength + Math.random() * 0.05, ballPos);                  // set the ball position from the cannon and the laser direction
                    ball.mesh.position.copyFrom(ballPos.addInPlace(cannons[can].position));
                    stars.particles[lg].alive = true;                                                                       // activate the related laser light in the star sps
                    stars.particles[lg].position.x = pointerDistanceX * ballFovCorrection * aspectRatio;                    // set the laser light position in the distance with a correction
                    stars.particles[lg].position.y = pointerDistanceY * ballFovCorrection;
                    stars.particles[lg].position.z = lightDistance;
                    stars.particles[lg].isVisible = true;                                                                   // make the laser light visible
                    pointLight.position.copyFrom(ball.mesh.position);
                    pointLight.intensity = plIntensity;
                    search = false;                                 // a free laser is just got from the pool, don't search further
                } else {
                    l++;
                }
            }
        }
        laserMesh.setParticles();   
    }

    laserMesh.updateParticle = function(p) {
        // process done once for the laser and its ball in the same call
        if (p.alive && p.idx < laserNb) {
            // move or scale lasers and balls
            laser = lasers[p.idx];                  // current laser
            ball = lasers[p.idx + laserNb];         // current related laser ball
            p.scale.y *= laserSpeed;                // scale laser
            p.scale.x *= laserSpeed;
            ball.mesh.scale.x *= laserSpeed;        // scale ball
            if (ball.mesh.scale.x < 0.02) {         
                ball.mesh.scale.x = 0.0; 
            } else {                                // move ball on laser direction
                laser.direction.scaleToRef(canLength + 0.03 * (1.0 - Math.random() * 0.5) / p.scale.x, ballPos);
                ball.mesh.position.copyFrom(ballPos.addInPlace(cannons[laser.cannon].position));     
            }
            ball.mesh.scale.y = ball.mesh.scale.x;  
            if (p.scale.y <= 0.01) {                // target "reached" by laser
                // recycle laser
                p.scale.y = 0.0;
                laser.fired = false;
                ball.fired = false;
                p.alive = false;
                // check Enemy hit
                for (e = 0|0; e < enemyNb; e++) {
                    // compute the enemy 2D coordinates in the screen space
                    EnemyCorrection = enemies[e].mesh.position.z * cameraFov;
                    eX = enemies[e].mesh.position.x / (EnemyCorrection * aspectRatio);
                    eY = enemies[e].mesh.position.y / EnemyCorrection;
                    // enemy bbox in the screen space
                    bbox = enemies[e].mesh.getBoundingInfo().boundingBox;
                    boxSizeX = (bbox.maximumWorld.x - bbox.minimumWorld.x) * bboxpc / 2.0 / (EnemyCorrection * aspectRatio);
                    boxSizeY = (bbox.maximumWorld.y - bbox.minimumWorld.y) * bboxpc / 2.0 / EnemyCorrection;
                    // check if the target is in some percentage if the AABB
                    if (laser.screenTarget.x >= eX - boxSizeX && laser.screenTarget.x <= eX + boxSizeX && laser.screenTarget.y >= eY - boxSizeY && laser.screenTarget.y <= eY + boxSizeY ) {
                        enemies[e].shield--;
                        impact = stars.particles[starNb + laserNb + p.idx];     // get the related impact
                        impact.isVisible = true;                                // activate the impact particle
                        impact.alive = true;
                        impact.position.x = laser.target.x;                     // set the impact at the target position
                        impact.position.y = laser.target.y;
                        impact.scale.x = distance / enemies[e].mesh.position.z * 1.2;
                        impact.scale.y = impact.scale.x;
                        // enemy exploses
                        if (enemies[e].shield === 0|0) {
                            enemies[e].explosion = true;
                            explosions[p.idx] = true;
                            exploded[p.idx] = enemies[e].mesh;
                            impact.scale.x = 60.0;
                            explosionLight.position.copyFrom(enemies[e].mesh.position);
                            explosionLight.intensity = explLghtIntensity;
                        } 
                    }
                }
            } 
        }
    };

    // Enemy behavior
    var EnemyLimitX = 0.0;
    var EnemyLimitY = 0.0;
    var k = 0.0;
    var sign = 1.0;
    var setEnemies = function() {
        var en = enemies[0|0];
        for (e = 0|0; e < enemyNb; e++) {
            en = enemies[e];
            if (en.explosion) {             // if currently exploding
                if (en.mustRebuild) {       // if explosion just finished, then rebuild and reset the Enemy
                    en.rebuild();
                    en.mustRebuild = false;
                    en.explosion = false;
                    en.randAng.multiplyByFloats(Math.random(), Math.random(), Math.random());
                    en.shield = en.maxShield;
                }
                en.sps.setParticles();
            } else {
                // Ennnemy flying around, tmp behavior : sinusoidal trajectory
                sign = (e % 2 === 0) ? 1.0 : -1.0;
                k = Date.now() / 10000.0 * sign * en.speed;
                en.mesh.rotation.z += Math.sin(k) / (10.0 + e * 5.0) * en.speed;
                en.mesh.rotation.y += (Math.sin(k) / (10.0 + e * 5.0)) / 8.0;
                en.mesh.position.z = sightDistance + distance * (1.0 + Math.sin(k + e));
                en.mesh.position.x += Math.cos(k - e) / 2.0;
                en.mesh.position.y += Math.sin(k + e / 2.0) / 3.0;
            }
            en.mesh.position.x -= pointerDistanceX * en.mesh.position.z  / distance;
            en.mesh.position.y -= pointerDistanceY * en.mesh.position.z  / distance;
            // keep the Enemy around the frustum
            EnemyLimitY = en.mesh.position.z * cameraFov * 2.0;
            EnemyLimitX = EnemyLimitY * aspectRatio;
            if (en.mesh.position.x < -EnemyLimitX) { en.mesh.position.x = -EnemyLimitX; }
            if (en.mesh.position.x > EnemyLimitX)  { en.mesh.position.x = EnemyLimitX; }
            if (en.mesh.position.y < -EnemyLimitY) { en.mesh.position.y = -EnemyLimitY; }
            if (en.mesh.position.y > EnemyLimitY)  { en.mesh.position.y = EnemyLimitY; }

            // shooting
            if (Math.random() < enemyFireFrequency && en.mesh.position.z > enemyFireLimit && !en.explosion) {
                en.shoot();
            }
        }
    };


    // camera behavior
    var ouchX = false;                  // camera shifted on X
    var ouchY = false;                  // camera shifted on Y
    var ouchZ = false;                  // camera shifted on Z
    var camToLeft = false;
    var tmpCam = V(0.0, 0.0, 0.0);
    var camShakeSpeed = 0.01;
    var camRestoreSpeed = 0.008;
    var returnCamX = false;
    var returnCamY = false;
    var returnCamZ = false;
    var setCamera = function() {
        aspectRatio = engine.getAspectRatio(camera);
        light.diffuse.b += 0.1;
        light.diffuse.g += 0.1;
        light.intensity -= 0.01;
        if (light.diffuse.b > 1.0) { light.diffuse.b = 1.0; }
        if (light.diffuse.g > 1.0) { light.diffuse.g = 1.0; }
        if (light.intensity < lightInitialIntensity) { light.intensity = lightInitialIntensity; }
        
        if (ouchY) { 
            if (camera.position.y < tmpCam.y && !returnCamY) {
                camera.position.y += camShakeSpeed;
            } else {
                camera.position.y -= camRestoreSpeed; 
                returnCamY = true;
                if ( camera.position.y <= 0.0 ) { 
                    camera.position.y = 0.0; 
                    ouchY = false; 
                    returnCamY = false;
                }
            }
        }
        
        
        if (ouchZ) { 
            if (camera.position.z > tmpCam.z && !returnCamZ) {
                camera.position.z -= camShakeSpeed;
            } else {
                camera.position.z += camRestoreSpeed;
                returnCamZ = true;
                if ( camera.position.z >= 0.0 ) { 
                    camera.position.z = 0.0; 
                    ouchZ = false; 
                    returnCamZ = false;
                }
            } 
        } 
         
        if (ouchX) {  
            if (camToLeft) {
                if (camera.position.x > tmpCam.x && !returnCamX) {
                    camera.position.x -= camShakeSpeed;
                } else {
                    camera.position.x += camRestoreSpeed;
                    returnCamX = true;
                }
            } else {
                if (camera.position.x < tmpCam.x && !returnCamX) {
                    camera.position.x += camShakeSpeed;
                } else {
                    camera.position.x -= camRestoreSpeed;
                    returnCamX = true;
                }             
            }
            if (Math.abs(camera.position.x) < camRestoreSpeed && returnCamX) {
                camera.position.x = 0.0;
                ouchX = false;
                returnCamX = false;
            }

        }           
    }

    //scene.debugLayer.show();
    scene.registerBeforeRender(function() {
        setCamera();
        getInputs();
        stars.setParticles();
        setSightAndCannons();
        setLasers();
        setEnemies();
    });
    
    return scene;
};


var init = function() {
  var canvas = document.querySelector('#renderCanvas');
  var engine = new BABYLON.Engine(canvas, true);
  var scene = createScene(canvas, engine);
  window.addEventListener("resize", function() {
    engine.resize();
  });

  engine.runRenderLoop(function(){
    scene.render();
  });
};
