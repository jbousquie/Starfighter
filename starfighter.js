/// <reference path="/var/www/html/BJS/Babylon.js/dist/preview release/babylon.d.ts" />
"use strict";

// ======================================================
// SCENE


var createScene = function(canvas, engine) {

    // keyboard inputs
    var CTRL = 17;
    var SHIFT = 16;
    var keyboard = [];
    function updateInput(event, boolVal) {
        if (event.keyCode == CTRL) { keyboard[CTRL] = boolVal; }
        if (event.keyCode == SHIFT) { keyboard[SHIFT] = boolVal; }
    }    
    window.addEventListener('keydown', function(event) { updateInput(event, true); });
    window.addEventListener('keyup', function(event) { updateInput(event, false); });
    var V = function(x, y, z) { return new BABYLON.Vector3(+x, +y, +z); };              // shortener function
    
    // Scene
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color3.Black();
    //var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, BABYLON.Vector3.Zero(), scene);
    var camera = new BABYLON.TargetCamera("camera", V(0.0, 0.0, 0.0), scene);
    //camera.attachControl(canvas, true);  
    camera.direction = V(0.0, 1.0, 1.0);
    var cameraFov = Math.tan(camera.fov * 0.5);
    var aspectRatio = engine.getAspectRatio(camera);
    
    var light = new BABYLON.HemisphericLight('light1', V(0.0, 0.0, -1.0), scene);
    light.intensity = 0.7;
    var pointLight = new BABYLON.PointLight('pointLight', V(0.0, 0.0, 0.0), scene);
    pointLight.diffuse = new BABYLON.Color3(0, 0, 1);
    pointLight.specular = new BABYLON.Color3(0.5, 0.5, 1);
    pointLight.intensity = 0.0;
    var plIntensity = 0.8;

    // Ennemies
    var ennemyNb = 5;                           // Max number of ennemies
    var ennemies = new Array(ennemyNb);
    var ennemyCorrection = 0.0;                 // tmp var for ennemy FOV correction
    var eX = 0.0;                               // tmp var for current ennemy x coordinate in the screen space
    var eY = 0.0;                               // tmp var for current ennemy y coordinate in the screen space
    var bbox;                                   // tmp var for current ennemy mesh bounding box
    var boxSizeX = 0.0;                         // tmp var for current ennemy x half size in the screen space
    var boxSizeY = 0.0;                         // tmp var for current ennemy y half size in the screen space
        // Ennemy object
    var Ennemy = function(sps) {
        this.sps = sps;                         // ennemy SPS
        this.mesh = sps.mesh;                   // ennemy SPS mesh
        this.hit = false;                       // ennemy hit
    };
        // Ennemy mesh
    var ennemyModel= BABYLON.MeshBuilder.CreatePolyhedron('emod', {type: 1, size: 0.5, sizeX: 1.5, sizeZ: 2.5}, scene);
    var e = 0|0;
    for (e = 0|0; e < ennemyNb; e++) {
        var ennemySPS = new BABYLON.SolidParticleSystem('es'+e, scene);
        ennemySPS.digest(ennemyModel);
        ennemySPS.buildMesh();
        ennemySPS.setParticles();
        ennemySPS.refreshVisibleSize();
        ennemies[e] = new Ennemy(ennemySPS);
        ennemySPS.mesh.position.z = 30;
        ennemySPS.mesh.position.y = -2;
        ennemySPS.mesh.position.x = -24 + 12 * e;
        ennemySPS.mesh.rotation.y = e / 10;
    }
    ennemyModel.dispose();


    // Cockpit
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
    cockpit.alwaysSelectAsActiveMesh = true;
    cockpit.freezeWorldMatrix();
    rib = tube1 = tube2 = null;

    

    
    // Cannons
    var halfPI = Math.PI / 2.0;
    var canMat = new BABYLON.StandardMaterial("cm", scene);
    var canPos = new BABYLON.Vector3(-1.5, -1, 2.2);
    var canLength = 0.4;
    var canRadius = 0.04;
    var canPath = [V(0.0, 0.0, 0.0), V(0.0, 0.0, canLength * .80), V(0.0, 0.0, canLength * .80), V(0.0, 0.0, canLength)];
    var radiusFunction = function(i, dist) {
        var rad = canRadius;
        if (i == 2) { rad *= 1.25; }
        if (i == 3) { rad *= 0.8; }
        return rad;
    };
    var cannon0 = BABYLON.MeshBuilder.CreateTube("c0", {path: canPath, radiusFunction: radiusFunction }, scene);
    
    var canTexture = new BABYLON.Texture("rusty.jpg", scene);
    //canTexture.uScale = 0.1;
    canMat.diffuseTexture = canTexture;
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

    cannon0.alwaysSelectAsActiveMesh = true;
    cannon1.alwaysSelectAsActiveMesh = true;
    cannon2.alwaysSelectAsActiveMesh = true;
    cannon3.alwaysSelectAsActiveMesh = true;

    var cannons = [cannon0, cannon1, cannon2, cannon3];
    var cannonDirections = [V(0.0, 0.0, 0.0), V(0.0, 0.0, 0.0), V(0.0, 0.0, 0.0), V(0.0, 0.0, 0.0)]; 
    var cannonHeats = [0|0, 0|0, 0|0, 0|0];

   
    // Sight
    var sightDistance = 5;
    var sightPos = V(0.0, 0.0, sightDistance);
    var fovCorrection = cameraFov * sightDistance;             // sight projection ratio from the screen space 
    var sight = BABYLON.MeshBuilder.CreatePlane("sight", {size: 0.2}, scene);
    sight.position = sightPos;
    var sightMat = new BABYLON.StandardMaterial("sm", scene);
    sight.material = sightMat;
    var sightTexture = new BABYLON.Texture("viseur.png", scene);
    sightTexture.hasAlpha = true;
    sightMat.emissiveTexture = sightTexture;
    sightMat.diffuseTexture = sightTexture;
    sightMat.useAlphaFromDiffuseTexture = true;
    light.excludedMeshes = [sight];

    // Lasers
    var laserNb = 12|0;                        // number of avalaible lasers in the pool, suitable value around 8 (2 * 4 cannons)
    var laserSpeed = 0.52;                     // laser decrease speed, suitable value = 0.6, the lower, the faster
    var fireHeat = 15|0;                       // nb of frame before a cannon can fire again after a shoot, around 15 
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
    var laserMat = new BABYLON.StandardMaterial("lm", scene);
    laserMat.emissiveColor = BABYLON.Color3.White();
    laserMat.freeze();
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
    var l = 0|0;            // laser index
    // lasers[] is populated with laserNb lasers and laserNb laser balls
    for (l = 0|0; l < laserNb * 2|0; l++) {
        laser = new Laser(l);
        laser.mesh.alive = false;
        laser.mesh.scale.y = 0.0;
        laser.mesh.scale.x = 0.0;
        laser.mesh.position.z = sightDistance;
        lasers.push(laser);
    }


    // Stars ... and laser lights because they are exactly the same particle
    var starNb = 300|0;                                                 // star total number in the pool
    var starEmitterSize = 50.0;                                         // size width of the particle emitter square surface

    var distance = starEmitterSize * 1.2;                               // star emitter distance
    var starSpeed = 0.8;                                                // star speed
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

        
        // Star SPS
    var starTexture = new BABYLON.Texture("flarealpha.png", scene);
    starTexture.hasAlpha = true;
    var stars = new BABYLON.SolidParticleSystem("stars", scene);
    var model = BABYLON.MeshBuilder.CreatePlane("p", {size: 0.2}, scene);
    stars.addShape(model, starNb + laserNb);
    model.dispose();
    stars.buildMesh();
    var starMat = new BABYLON.StandardMaterial("sm", scene);
    starMat.emissiveColor = BABYLON.Color3.White();
    starMat.diffuseColor = BABYLON.Color3.White();
    starMat.diffuseTexture = starTexture;
    starMat.useAlphaFromDiffuseTexture = true;
    stars.mesh.material = starMat;
    starMat.freeze();
    stars.mesh.hasVertexAlpha = true;
    light.excludedMeshes.push(stars.mesh);

        // Star SPS initialization
    stars.initParticles = function() {
        var p = stars.particles;
        for (var i = 0|0; i < stars.nbParticles; i++) {
            if (i < starNb) {           // stars
                p[i].position.x = starEmitterSize * (Math.random() - 0.5);
                p[i].position.y = starEmitterSize * (Math.random() - 0.5);
                p[i].position.z = distance * Math.random();  
                p[i].velocity.z = 1.1 - Math.random() * 0.2;
            } else {    
                p[i].alive = false;                // laser lights
                p[i].isVisible = false;
                p[i].position.z = lightDistance;
                p[i].velocity.z = 0.5;
                p[i].color.r = 0.4;
                p[i].color.g = 0.4;
                p[i].color.b = 1.0;
                p[i].color.a = 0.8;
                p[i].scale.x = distance / lightDistance * 1.2;
                p[i].scale.y = p[i].scale.x;
            }
        }
    }
   

   // Angle values for all particles : called once per call to setParticles()
   stars.beforeUpdateParticles = function() {    
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
        if (p.idx < starNb) {   // star
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
       } else {                 // laser light
           if (p.alive) {
               // move
               p.position.z += p.velocity.z;
               p.position.x -= pointerDistanceX * p.position.z * p.velocity.z / distance;
               p.position.y -= pointerDistanceY * p.position.z * p.velocity.z / distance;
               // recycle
               if (p.position.z > distance) {
                   p.alive = false;
                   p.isVisible = false;
               }
           }

       }
   }
   
    // star initialization
    stars.initParticles();
    stars.isAlwaysVisible = true;
    stars.computeParticleRotation = false;
    stars.computeParticleTexture = false;
    stars.setParticles();
    stars.computeParticleColor = false;
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
    var search = true;                              // free laser found in the pool
    var can = 0|0;                                  // fired cannon index
    var lg = 0|0;                                   // laser light in the star SPS particle array

    var setLasers = function() {
        l = 0|0;
        search = true;
        can = (Math.random() * 4)|0;
        pointLight.intensity -= 0.1;
        if (pointLight.intensity < 0.0) { pointLight.intensity = 0.0; }
        if (keyboard[SHIFT] && cannonHeats[can] == 0) {
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
                    stars.particles[lg].position.x = pointerDistanceX * ballFovCorrection * aspectRatio;  // set the laser light position in the distance with a correction
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
                laser.direction.scaleToRef(canLength + 0.03 * (1 - Math.random() * 0.5) / p.scale.x, ballPos);
                ball.mesh.position.copyFrom(ballPos.addInPlace(cannons[laser.cannon].position));     
            }
            ball.mesh.scale.y = ball.mesh.scale.x;  
            if (p.scale.y <= 0.01) {                // target "reached" by laser
                // recycle laser
                p.scale.y = 0.0;
                laser.fired = false;
                ball.fired = false;
                p.alive = false;
                // check ennemy hit
                for (e = 0|0; e < ennemyNb; e++) {
                    ennemyCorrection = ennemies[e].mesh.position.z * cameraFov;
                    eX = ennemies[e].mesh.position.x / (ennemyCorrection * aspectRatio);
                    eY = ennemies[e].mesh.position.y / ennemyCorrection;
                    bbox = ennemies[e].mesh.getBoundingInfo().boundingBox;
                    boxSizeX = (bbox.maximumWorld.x - bbox.minimumWorld.x) / 2.0 / (ennemyCorrection * aspectRatio);
                    boxSizeY = (bbox.maximumWorld.y - bbox.minimumWorld.y) / 2.0 / ennemyCorrection;

                    if (laser.screenTarget.x >= eX- boxSizeX && laser.screenTarget.x <= eX + boxSizeX && laser.screenTarget.y >= eY - boxSizeY && laser.screenTarget.y <= eY + boxSizeY ) {
                        ennemies[e].hit = true;
                    }

                }

            } 
        }
    };

    // Ennemy behavior
    var setEnnemies = function() {
        for (e = 0|0; e < ennemyNb; e++) {
            ennemies[e].mesh.rotation.y += 0.01;
            ennemies[e].mesh.position.z = 40 + 5 * Math.sin(ennemies[e].mesh.rotation.y + e);
            ennemies[e].mesh.position.y += Math.sin(ennemies[e].mesh.rotation.y + e / 2) / 10;
            ennemies[e].mesh.position.x += Math.cos(ennemies[e].mesh.rotation.y - e) / 20;
        }
    };


    //scene.debugLayer.show();
    scene.registerBeforeRender(function() {
        aspectRatio = engine.getAspectRatio(camera);
        stars.setParticles();
        setSightAndCannons();
        setLasers();
        setEnnemies();
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
