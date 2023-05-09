	import * as THREE from 'three';
	import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
	import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { FontLoader } from 'three/addons/loaders/FontLoader.js';
	import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
	import { Reflector } from 'three/addons/objects/Reflector.js';
	import { Sky } from 'three/addons/objects/Sky.js';
	import Stats from 'three/addons/libs/stats.module.js'; // this import needs to be different: https://stackoverflow.com/a/62753240/3174659



	//			
	// IMPORTANT VARIABLES
	//

	// can also retrieve 3D models from dropbox instead of locally (using the dl.dropboxusercontent.com domain bypasses CORS restrictions):
	// let fileLocation = 'https://dl.dropboxusercontent.com/s/6lv8fc5a6hkpoj5/Windmill%20Course%20Animation.glb?dl=0';
	// (beware because this is not fully supported - see https://www.dropboxforum.com/t5/Dropbox-API-Support-Feedback/CORS-Access-Control-Allow-Origin/m-p/336138/highlight/true#M19583)
	
	let VEHICLE_FILEPATHS = [], VEHICLE_INITIAL_POSITION = [], MAX_SPEED = [], ROTATION_SPEED = [], BRAKING_SPEED = [], WALL_HIT_ROTATION = [], VEHICLE_SCALE = [];
	
	VEHICLE_FILEPATHS[0] = 'img/models/skateboard.glb';
	VEHICLE_INITIAL_POSITION[0] = new THREE.Vector3(50, 0.15, 40); 
	MAX_SPEED[0] = 0.25;
	ROTATION_SPEED[0] = 0.03;
	BRAKING_SPEED[0] = 0.002;
	WALL_HIT_ROTATION[0] = 0.1;
	VEHICLE_SCALE[0] = 0.3;

	VEHICLE_FILEPATHS[1] = 'img/models/ac-alfa-romeo-155-v6-ti/source/Alfa_Romeo_155_V6.fbx';
	VEHICLE_INITIAL_POSITION[1] = new THREE.Vector3(50, 0, 40); 
	MAX_SPEED[1] = 0.5;
	ROTATION_SPEED[1] = 0.06;
	BRAKING_SPEED[1] = 0.004;
	WALL_HIT_ROTATION[1] = 0.03;
	VEHICLE_SCALE[1] = 0.015;
				
	let currentVehicle = 1;
	let speed = 0;
	let cameraView = 'fixed';
	let mouseZoom = 200;
	let keysPressed = {left:false, right:false, up:false, down:false}; // used to store multiple keypresses at the same time (e.g. turn and accelerate) - updated below on addEventListener's
	const HUD_FONT = "30px sans-serif";
	const HUD_FONT_COLOR = "red";
	const OBSTACLE_SCALE = 5; // so that obstacle boundingboxes/hitboxes's custom size also increases/decreases with obstacle size










	//			
	// SCENE SETUP
	//

	// Renderer
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth*.9, window.innerHeight*.9 );
	renderer.setPixelRatio(window.devicePixelRatio);
	
	renderer.useLegacyLights = false;
	// renderer.physicallyCorrectLights= true; // pre-r150			

	// new default was making colors washed out, so revert to pre r152 colors - see https://github.com/mrdoob/three.js/pull/25783 (and maybe https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791)
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

	document.querySelector('#three-container').appendChild( renderer.domElement );

	
	// Scene
	const scene = new THREE.Scene();
	scene.background = new THREE.Color('skyblue');
	// scene.fog = new THREE.Fog( 0xcccccc, 30, 50 );
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.015 ); // values between 0.01 and 0.1 are the most realistic
	
	// AxesHelper
	// const axesHelper = new THREE.AxesHelper( 1000 );
	// scene.add(axesHelper);


	// Camera
	const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.x = VEHICLE_INITIAL_POSITION[currentVehicle].x;
	camera.position.y = VEHICLE_INITIAL_POSITION[currentVehicle].y + 3.4;
	camera.position.z = VEHICLE_INITIAL_POSITION[currentVehicle].z + 7;

	// Camera Helper (create a second camera to see all the lines) - for some reason can't move this second camera from 0,0,0
	// const camera2 = new THREE.PerspectiveCamera( 5, window.innerWidth / window.innerHeight, 5, 10 );
	// camera2.position.set(0,20,0);
	// const helper = new THREE.CameraHelper( camera2 );
	// scene.add( helper );

	// OrbitControls
	const controls = new OrbitControls( camera, renderer.domElement );
	controls.enablePan = false; // if pan is enabled, the target object moves with the pan!

	// controls.addEventListener('change', () => {
	// 	// update sliders when the camera is moved with the OrbitControls (basically using the mouse)
	// 	document.querySelector('#fov-slider').value = camera.fov;
	// 	document.querySelector('#camera-x-slider').value = camera.position.x;
	// 	document.querySelector('#camera-y-slider').value = camera.position.y;
	// 	document.querySelector('#camera-z-slider').value = camera.position.z;
	// });

	// controls.enableDamping = true;
	// controls.listenToKeyEvents(window);
	// controls.keyPanSpeed = 40;			


	// Lights
	const directionalLight = new THREE.DirectionalLight('white', 4);
	directionalLight.position.set(100, 100, 100);
	scene.add(directionalLight);
	// const helper = new THREE.DirectionalLightHelper( directionalLight, 5 );
	// scene.add( helper );
	
	// const ambientLight = new THREE.AmbientLight( 0x404040, 40); // soft white light
	// scene.add( ambientLight );

	const hemiLight = new THREE.HemisphereLight(
		'white', // bright sky color
		'lightgrey', // dim ground color
		2, // intensity
	);
	scene.add( hemiLight );
	
	// Sky with sun - https://github.com/mrdoob/three.js/blob/master/examples/webgl_shaders_ocean.html and https://github.com/mrdoob/three.js/blob/master/examples/webgl_shaders_sky.html
	const sky = new Sky();
	sky.scale.setScalar( 10000 );
	sky.material.uniforms[ 'sunPosition' ].value = directionalLight.position;
	sky.material.uniforms[ 'rayleigh' ].value = 1;
	sky.material.uniforms[ 'turbidity' ].value = 5;
	sky.material.uniforms[ 'mieCoefficient' ].value = 0.01;
	sky.material.uniforms[ 'mieDirectionalG' ].value = 0.9;
	// renderer.toneMappingExposure = 0.01;
	scene.add( sky );










	//
	// OBJECTS
	//

	// Floor
	const textureLoader = new THREE.TextureLoader();
	const floorTexture = textureLoader.load( "img/textures/asphalt2.jpg" );
	floorTexture.wrapS = THREE.RepeatWrapping;
	floorTexture.wrapT = THREE.RepeatWrapping;
	floorTexture.repeat.set( 20, 20 );
	const floorMaterial = new THREE.MeshStandardMaterial({map: floorTexture});
	const floorSide = 200;
	const floorGeometry = new THREE.PlaneGeometry( floorSide, floorSide );
	const floor = new THREE.Mesh( floorGeometry, floorMaterial );
	floor.rotation.x = - Math.PI / 2;
	floor.position.y = 0;
	// put top left corner of floor at 0,0 so that it's easier to position objects (all in positive coordinates)
	floor.position.x = floorSide / 2;
	floor.position.z = floorSide / 2;
	scene.add( floor );
	// Ground with helper grid - from https://threejs.org/examples/#webgl_animation_skinning_morph
	// const grid = new THREE.GridHelper( 100, 100, 0x000000, 0x000000 );
	// grid.material.opacity = 0.2;
	// grid.material.transparent = true;
	// grid.position.y = 0;
	// scene.add( grid );

	// Map limit walls
	const wallArray = [];
	const wallOrientation = [];
	const wallTexture = textureLoader.load( "img/textures/bricks2.jpg" );
	wallTexture.wrapS = THREE.RepeatWrapping;
	wallTexture.wrapT = THREE.RepeatWrapping;
	wallTexture.repeat.set( 10, 0.2 );
	// const wallMaterial = new THREE.MeshStandardMaterial( {color: 'maroon'} );
	const wallMaterial = new THREE.MeshStandardMaterial({map: wallTexture});
	const wallGeometry = new THREE.BoxGeometry( 0.5, 3, floorGeometry.parameters.width );
	const wallRight = new THREE.Mesh( wallGeometry, wallMaterial );
	wallRight.position.y = wallGeometry.parameters.height/2;
	const wallLeft = wallRight.clone();
	const wallTop = wallRight.clone();
	const wallBottom = wallRight.clone();
	wallRight.position.x = floorGeometry.parameters.width;
	wallRight.position.z = floorGeometry.parameters.width/2;
	wallLeft.position.x = 0;
	wallLeft.position.z = floorGeometry.parameters.width/2;
	wallTop.rotation.y = Math.PI / 2;
	wallTop.position.z = 0;
	wallTop.position.x = floorGeometry.parameters.width/2;
	wallBottom.rotation.y = Math.PI / 2;
	wallBottom.position.z = floorGeometry.parameters.width;
	wallBottom.position.x = floorGeometry.parameters.width/2;
	wallArray.push(wallRight, wallLeft, wallTop, wallBottom);
	wallOrientation.push('w','e','s','n'); // to detect how vehicle should rotate when it hits each wall
	scene.add(wallRight, wallLeft, wallTop, wallBottom);

	
	// Mirror - view-source:https://threejs.org/examples/webgl_mirror.html
	const mirrorGeometry = new THREE.PlaneGeometry( 10, 3 );
	const verticalMirror = new Reflector( mirrorGeometry, {
		clipBias: 0.003,
		textureWidth: window.innerWidth * window.devicePixelRatio,
		textureHeight: window.innerHeight * window.devicePixelRatio,
		color: 0x889999
	} );
	verticalMirror.position.y = mirrorGeometry.parameters.height/2;
	verticalMirror.position.x = 10;
	verticalMirror.position.z = 2;
	scene.add( verticalMirror );
	// const box = new THREE.BoxHelper( verticalMirror, 0xffff00 );
	// box.material = new THREE.LineBasicMaterial();
	// scene.add( box );

	// Border around the mirror because the BoxHelper around the mirror is too thin
	let mirrorBorderTop = new THREE.Mesh( new THREE.BoxGeometry( mirrorGeometry.parameters.width, .1, .1 ), new THREE.MeshBasicMaterial( { color: "peru" } ) );
	mirrorBorderTop.position.y = mirrorGeometry.parameters.height/2;
	let mirrorBorderRight = new THREE.Mesh( new THREE.BoxGeometry( mirrorGeometry.parameters.height, .1, .1 ), new THREE.MeshBasicMaterial( { color: "peru" } ) );
	mirrorBorderRight.rotation.z = Math.PI / 2;
	mirrorBorderRight.position.x = mirrorGeometry.parameters.width/2;
	let mirrorBorderBottom = new THREE.Mesh( new THREE.BoxGeometry( mirrorGeometry.parameters.width, .1, .1 ), new THREE.MeshBasicMaterial( { color: "peru" } ) );
	mirrorBorderBottom.position.y = -mirrorGeometry.parameters.height/2;
	let mirrorBorderLeft = new THREE.Mesh( new THREE.BoxGeometry( mirrorGeometry.parameters.height, .1, .1 ), new THREE.MeshBasicMaterial( { color: "peru" } ) );
	mirrorBorderLeft.rotation.z = Math.PI / 2;
	mirrorBorderLeft.position.x = -mirrorGeometry.parameters.width/2;
	verticalMirror.add(mirrorBorderTop, mirrorBorderRight, mirrorBorderBottom, mirrorBorderLeft);



	// Generic cube with custom texture
	// const geometry = new THREE.BoxGeometry( 1, 1, 1 );
	// const material = new THREE.MeshStandardMaterial( {
	// 	emissiveIntensity: 0.5,
	// 	map: textureLoader.load('img/textures/harshbricks-Unreal-Engine/harshbricks-albedo.png'),
	// 	aoMap: textureLoader.load('img/textures/harshbricks-Unreal-Engine/harshbricks-ao2.png'),
	// 	metalnessMap: textureLoader.load('img/textures/harshbricks-Unreal-Engine/harshbricks-metalness.png'),
	// 	normalMap: textureLoader.load('img/textures/harshbricks-Unreal-Engine/harshbricks-normal.png'),
	// 	roughnessMap: textureLoader.load('img/textures/harshbricks-Unreal-Engine/harshbricks-roughness.png'),
	// } );
	// const cube = new THREE.Mesh( geometry, material );
	// cube.position.z = 0;
	// scene.add(cube);

	// Generic spheres
	const sphereGeometry = new THREE.SphereGeometry(0.5);
	const sphereMaterial = new THREE.MeshStandardMaterial({color: 'olivedrab'});
	const sphereGroup = [];
	for (let i = 0; i < 10; i++) {
		sphereGroup[i] = new THREE.Mesh(sphereGeometry, sphereMaterial);
		sphereGroup[i].scale.multiplyScalar(Math.random()+0.3);
		sphereGroup[i].position.x = i*1.5;
		sphereGroup[i].position.y = 2;
		scene.add(sphereGroup[i]);
	}


	// Checkpoints, obstacles (3d models loaded later) and finish line
	// = for horizontal checkpoint, | for vertical checkpoint, X for obstacle, _ for skateboard hurdle, and F for finish line
	let trackPositions = [
"                    ",
"    X  |  | X       ",
"    X  XX   X       ",
"    X=X  X =X       ",
"    X X  X  X       ",
"    X X  X  X       ",
"    XXX  X  X       ",
"         X= X       ",
"         X  X       ",
"   XXXXXX   X       ",
"   X        X       ",
"   X    |   X       ",
"   X = XXXXXX       ",
"   X  X             ",
"   X  X             ",
"   X  X             ",
"   X = XXXXXXXXXXXXX",
"   X        |       ",
"   XXXXXXXXXXXXXX   ",
"                 X F",
"                    "];
// trackPositions = [
// "                    ",
// "    X  |  |  X      ",
// "    X  XX  = X      ",
// "    X=X  X  =X      ",
// "    X X  X   X      ",
// "    X X  X = X      ",
// "    XXX  X   X      ",
// "         X = X      ",
// "         X _ X      ",
// "         X F X      ",
// "          XXX       ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    "];
// trackPositions = [
// "                    ",
// "       |     X      ",
// "    X  XX  F        ",
// "    X=X             ",
// "    X X             ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    ",
// "                    "];
	const checkpointArray = [];
	const checkpointGeometry = new THREE.BoxGeometry( 10, 4, 0.5 );
	const checkpointMaterial = new THREE.MeshStandardMaterial( {color: 'limegreen', transparent: true, opacity: 0.2} );
	const finishGeometry = new THREE.BoxGeometry( 15, 8, 0.1 );
	const finishMaterial = new THREE.MeshStandardMaterial( {map: textureLoader.load( "img/textures/checkered.jpg" ), transparent: true, opacity: 0.3} );
	const finish = new THREE.Mesh( finishGeometry, finishMaterial );
	const hurdleGeometry = new THREE.BoxGeometry( 100, 0.25, 0.5 );
	const hurdleTexture = textureLoader.load( "img/textures/bricks2.jpg" );
	hurdleTexture.wrapS = THREE.RepeatWrapping;
	hurdleTexture.wrapT = THREE.RepeatWrapping;
	hurdleTexture.repeat.set( 10, 0.025 );
	const hurdleMaterial = new THREE.MeshStandardMaterial({map: hurdleTexture});
	const hurdle = new THREE.Mesh( hurdleGeometry, hurdleMaterial );
	for (let z = 0; z < trackPositions.length; z += 1) {
		const mapLine = Array.from(trackPositions[z]);
		for (let x = 0; x < mapLine.length; x += 1) {
			if(mapLine[x] == '=' || mapLine[x] == '|') {
				const checkpoint = new THREE.Mesh( checkpointGeometry, checkpointMaterial );
				checkpoint.position.y = checkpointGeometry.parameters.height/2;
				checkpoint.position.x = 10*x;
				checkpoint.position.z = 10*z;
				if(mapLine[x] == '|')
					checkpoint.rotation.y = Math.PI / 2;
				checkpointArray.push(checkpoint);
				scene.add(checkpoint);
			} else if(mapLine[x] == 'F') {
				finish.position.y = finishGeometry.parameters.height/2;
				finish.position.x = 10*x;
				finish.position.z = 10*z;
				scene.add(finish);
			} else if(mapLine[x] == '_') {
				hurdle.position.y = hurdleGeometry.parameters.height/2;
				hurdle.position.x = 10*x;
				hurdle.position.z = 10*z;
				scene.add(hurdle);
			}
		}
	}


	const fontLoader = new FontLoader();
	let textGeometry = {}, textMaterial = {}, textMesh = {};

	// "Checkpoint" label above checkpoints - not really needed...
	// fontLoader.load( 'https://cdn.jsdelivr.net/npm/three@0.152.0/examples/fonts/helvetiker_regular.typeface.json', function ( font ) {
	// 	for (let i = 0; i < checkpointArray.length; i++) {
	// 		// textGeometry = new TextGeometry( (i+1).toString(), {font: font, size: 1.5, height: 0.2, curveSegments: 2} );
	// 		textGeometry = new TextGeometry( 'checkpoint', {font: font, size: 1, height: 0.2, curveSegments: 2} );
	// 		textMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, specular: 0xffffff });
	// 		textMesh = new THREE.Mesh( textGeometry, textMaterial );
	// 		// textMesh.position.y = checkpointArray[i].geometry.parameters.height / 2;
	// 		textMesh.position.y = checkpointArray[i].geometry.parameters.height / 2 + 1;
	// 		textMesh.position.x = -3;
	// 		checkpointArray[i].add( textMesh );
	// 	}
	// });

	// Loading... text
	fontLoader.load( 'https://cdn.jsdelivr.net/npm/three@0.152.0/examples/fonts/helvetiker_regular.typeface.json', function ( font ) {
		textGeometry = new TextGeometry( 'Loading 3D models...', {font: font, size: 0.5, height: 0.2, curveSegments: 2} );
		textMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, specular: 0xffffff });
		textMesh = new THREE.Mesh( textGeometry, textMaterial );
		textMesh.position.y = 1;
		textMesh.position.x = VEHICLE_INITIAL_POSITION[currentVehicle].x-2;
		textMesh.position.z = VEHICLE_INITIAL_POSITION[currentVehicle].z-7;
		scene.add( textMesh );
	});


	
	// Loaders for 3D models and text
	const gltfLoader = new GLTFLoader();
	const fbxLoader = new FBXLoader();
	let miscModels = [];
	let vehicleModel;
	let mixer;
	const clock = new THREE.Clock(); // clock for animation
	const timer = new THREE.Clock(); // level timer
	gltfLoader.load( 'img/models/OlmecHead.glb', function ( gltf ) {
		const obstacleModel = gltf.scene;
		obstacleModel.scale.setScalar(OBSTACLE_SCALE);
		// add animations (when they exist in the source model - view-source:https://threejs.org/examples/webgl_loader_fbx.html
		// mixer = new THREE.AnimationMixer( model );
		// const action = mixer.clipAction( gltf.animations[ 0 ] );
		// action.play();
		for (let z = 0; z < trackPositions.length; z += 1) {
			const mapLine = Array.from(trackPositions[z]);
			for (let x = 0; x < mapLine.length; x += 1) {
				if(mapLine[x] == 'X') {
					const obstacle = obstacleModel.clone();
					obstacle.position.x = 10*x;
					obstacle.position.z = 10*z;
					miscModels.push(obstacle);
					scene.add(obstacle);
				}
			}
		}
		scene.remove( textMesh );
		timer.start();
	});

	

	function spawnVehicle() {
		scene.remove( vehicleModel );
		scene.remove(camera);
		// for initial spawn use default values; if there is already a vehicle in game, it means user pressed V so spawn at current vehicle's position
		let spawnPosition = vehicleModel ? vehicleModel.position : VEHICLE_INITIAL_POSITION[currentVehicle];
		let spawnRotation = vehicleModel ? vehicleModel.rotation.y : Math.PI;

		if(currentVehicle == 0) {
			gltfLoader.load( VEHICLE_FILEPATHS[currentVehicle], function ( gltf ) {
				// console.log(gltf);
				vehicleModel = gltf.scene;
				vehicleModel.scale.setScalar(VEHICLE_SCALE[currentVehicle]);
				vehicleModel.rotation.y = spawnRotation;
				vehicleModel.position.copy(spawnPosition);
				scene.add( vehicleModel );
				scene.add(camera);
				// list parts of the model (e.g. wheels, chassis, ...) - of course, the location in the hierarchy depends on the model
				// for (const modelPart of vehicleModel.children[0].children[0].children) {
				// 	console.log(modelPart.name);
				// }
			});
		} else if(currentVehicle == 1) {
			fbxLoader.load( VEHICLE_FILEPATHS[currentVehicle], function ( fbx ) {
					// console.log(fbx);
					vehicleModel = fbx;
					vehicleModel.scale.setScalar(VEHICLE_SCALE[currentVehicle]);
					vehicleModel.rotation.y = spawnRotation;
					vehicleModel.position.copy(spawnPosition);
					scene.add( vehicleModel );
					scene.add(camera);
				},
				// (xhr) => {
				// 	if(xhr.total != 0)
				// 		console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
				// }
			);
		}
	}

	spawnVehicle();

	
	




	

	//
	// AUDIO	
	// 
	
	// Most code from https://threejs.org/docs/?q=audio#api/en/audio/Audio
	// create an AudioListener and add it to the camera
	const listener = new THREE.AudioListener();
	camera.add( listener );

	// loader for all audio files
	const audioLoader = new THREE.AudioLoader();

	// background sound
	const ambientSound = new THREE.Audio( listener );
	audioLoader.load( 'sounds/ambient/648546__klankbeeld__city-pasture-1235pm-220616_0401.mp3', function( buffer ) {
		ambientSound.setBuffer( buffer );
		ambientSound.setLoop( true );
		ambientSound.setVolume( 1 );
		ambientSound.play();
	});

	// acceleration sound
	const accelerationSound = new THREE.Audio( listener );
	audioLoader.load( 'sounds/acceleration/339703__ffkoenigsegg20012017__audi-v8-acceleration-sound.wav', function( buffer ) {
		accelerationSound.setBuffer( buffer );
		accelerationSound.setLoop( true );
		accelerationSound.setVolume( 0.3 );
	});

	let isAccelerationSoundOn = false; // so we don't start the acceleration sound if it's already playing

	// crash sound
	const crashSound = new THREE.Audio( listener );
	audioLoader.load( 'sounds/crash/420356__eponn__crash.wav', function( buffer ) {
		crashSound.setBuffer( buffer );
		crashSound.setLoop( false );
		crashSound.setVolume( 0.3 );
	});

	// checkpoint sound
	const checkpointSound = new THREE.Audio( listener );
	audioLoader.load( 'sounds/checkpoint/656643__ienba__game-reward.wav', function( buffer ) {
		checkpointSound.setBuffer( buffer );
		checkpointSound.setLoop( false );
		checkpointSound.setVolume( 1 );
	});

	// finish sound
	const finishSound = new THREE.Audio( listener );
	audioLoader.load( 'sounds/finish/546073__emmierose__hooray.wav', function( buffer ) {
		finishSound.setBuffer( buffer );
		finishSound.setLoop( false );
		finishSound.setVolume( 1.5 );
		finishSound.offset = 1;
	});









	//
	// ANIMATIONS
	//

	// ball group
	let movementDirectionZ = new Array(10);
	let movementDirectionY = new Array(10);
	for (let i = 0; i < 10; i++) {
		movementDirectionZ[i] = true;
		movementDirectionY[i] = true;
	}

	// Using threejs built-in animation system to animate one ball -  https://discoverthreejs.com/book/first-steps/animation-system/
	// const times = [0, 1, 2];
	// const values = [0, 0 + sphereGroup[0].geometry.parameters.radius, 0, 0, 2, 0, 0, 0 + sphereGroup[0].geometry.parameters.radius, 0];
	// const positionKF = new THREE.VectorKeyframeTrack(".position", times, values);
	// const tracks = [positionKF];
	// const length = -1; // -1 to automatically calculate the length from the array of tracks
	// const clip = new THREE.AnimationClip("slowmove", length, tracks);
	// const ballMixer = new THREE.AnimationMixer(sphereGroup[0]);
	// const action = ballMixer.clipAction(clip);
	// action.play();

	
	let spotLight, spotLightHelper;
	let boundingBoxesVehicleHelper, boundingBoxesVehicleHelperElement = {};
	const stats = Stats();
	document.body.appendChild(stats.dom);
	let jumping = false;
	let falling = false;
	const canvas = document.querySelector("#hud");
	const ctx = canvas.getContext("2d");
	ctx.font = HUD_FONT;
	ctx.fillStyle = HUD_FONT_COLOR;
	let checkpointsPassed = [];
	let health = 100;
	let currentMaxSpeed = MAX_SPEED[currentVehicle];
	let finished = false;
	let now, elapsed, then = 0;

	function animate() {
		
		requestAnimationFrame( animate );

		// Limit FPS to 60! So on screens with e.g. 120Hz the animation doesn't
		// run too fast. Thanks to https://stackoverflow.com/a/19772220/3174659
		now = Date.now();
		elapsed = now - then;
		
		if (elapsed > 16.7) {
			
			then = now - (elapsed % 16.7);

			const boundingBoxesSpheres = [];
			const boundingBoxesModels = [];
			const boundingBoxesWalls = [];
			const boundingBoxesCheckpoints = [];
			let boundingBoxFinish = {};
			let boundingBoxHurdle = {};
			const boundingBoxesVehicle = [];
			const boundingBoxesSpheresHelpers = [];
			const boundingBoxesModelsHelpers = [];
		
			// cube.rotation.x += 0.01;
			// cube.rotation.y += 0.01;

			// if(miscModels[0])
			// 	miscModels[0].rotation.y += 0.01;
			// if(miscModels[1])
			// 	miscModels[1].rotation.x += 0.01;
			// if(miscModels[2])
			// 	miscModels[2].rotation.z += 0.01;
				
			for (let i = 0; i < 10; i++) {
				if(movementDirectionZ[i])
					sphereGroup[i].position.z += (i%3+3) * 0.007;
				else
					sphereGroup[i].position.z -= (i%3+3) * 0.007;
				if((sphereGroup[i].position.z >= 3) || (sphereGroup[i].position.z <= 0))
					movementDirectionZ[i] = !movementDirectionZ[i];
				if(movementDirectionY[i])
					sphereGroup[i].position.y += (i+1) * 0.007;
				else
					sphereGroup[i].position.y -= (i+1) * 0.007;
				if((sphereGroup[i].position.y >= 4) || (sphereGroup[i].position.y <= (0 + sphereGroup[i].geometry.parameters.radius)))
					movementDirectionY[i] = !movementDirectionY[i];
			}

			const delta = clock.getDelta();
			if ( mixer ) mixer.update( delta );
			// if ( ballMixer ) ballMixer.update( delta );


			// Vehicle-dependent animations
			if(vehicleModel) {

				// Accelerate and turn
				// Idea to do this here from https://stackoverflow.com/a/12273538/3174659 and https://stackoverflow.com/a/14449028/3174659
				// Because if done in the addEventListener it will look jerky because the keydown event fires more often than the animate() loop
				if(keysPressed.left) {
					// turn skateboard left
					if(currentVehicle == 0) {
						vehicleModel.rotation.y += ROTATION_SPEED[currentVehicle];
					// for the car, turn also the wheels and steering wheel
					} else if(currentVehicle == 1) {
						for (const modelPart of vehicleModel.children) {
							if(modelPart.name.includes('WHEEL_RF') || modelPart.name.includes('WHEEL_LF') || modelPart.name.includes('DISC_RF')  || modelPart.name.includes('DISC_LF')
							|| modelPart.name.includes('SUSP_RF')  || modelPart.name.includes('SUSP_LF')) {
								modelPart.rotation.order = 'YXZ'; // https://stackoverflow.com/a/14776900/3174659
								if(modelPart.rotation.y < Math.PI/6)
									modelPart.rotation.y += 0.01;
							}
							if(modelPart.name.includes('COCKPIT')) {
								for (const subModelPart of modelPart.children) {
									if(subModelPart.name.includes('STEER')) {
										if(subModelPart.rotation.z > -Math.PI)
											subModelPart.rotation.z -= 0.06;
										// if the user turned right recently, the steering wheel is still centering, so turn a bit slower
										if(subModelPart.rotation.z > 0)
											vehicleModel.rotation.y += ROTATION_SPEED[currentVehicle] * speed * 1.5 *.5;
										else
											vehicleModel.rotation.y += ROTATION_SPEED[currentVehicle] * speed * 1.5;
									}
								}
							}
						}
					}
					// slow down a bit while turning
					if(speed > currentMaxSpeed*.75)
						speed -= 0.01;
				} else if(keysPressed.right) {
					// turn skateboard right
					if(currentVehicle == 0) {
						vehicleModel.rotation.y -= ROTATION_SPEED[currentVehicle];
					// for the car, turn also the wheels and steering wheel
					} else if(currentVehicle == 1) {
						for (const modelPart of vehicleModel.children) {
							if(modelPart.name.includes('WHEEL_RF') || modelPart.name.includes('WHEEL_LF') || modelPart.name.includes('DISC_RF')  || modelPart.name.includes('DISC_LF')
							|| modelPart.name.includes('SUSP_RF')  || modelPart.name.includes('SUSP_LF')) {
								modelPart.rotation.order = 'YXZ'; // https://stackoverflow.com/a/14776900/3174659
								if(modelPart.rotation.y > -Math.PI/6)
									modelPart.rotation.y -= 0.01;
							}
							if(modelPart.name.includes('COCKPIT')) {
								for (const subModelPart of modelPart.children) {
									if(subModelPart.name.includes('STEER')) {
										if(subModelPart.rotation.z < Math.PI)
											subModelPart.rotation.z += 0.06;
										// if the user turned left recently, the steering wheel is still centering, so turn a bit slower
										if(subModelPart.rotation.z < 0)
											vehicleModel.rotation.y -= ROTATION_SPEED[currentVehicle] * speed * 1.5 *.5;
										else
											vehicleModel.rotation.y -= ROTATION_SPEED[currentVehicle] * speed * 1.5;
									}
								}
							}
						}
					}
					// slow down a bit while turning
					if(speed > currentMaxSpeed*.75)
						speed -= 0.01;
				} else {
					// no left or right pressed so stop turning wheels and get steering wheel slowly back on center (i.e. car keeps turning for a while after user stopped pressing left/right)
					if(currentVehicle == 1) {
						for (const modelPart of vehicleModel.children) {
							if(modelPart.name.includes('WHEEL_RF') || modelPart.name.includes('WHEEL_LF') || modelPart.name.includes('DISC_RF')  || modelPart.name.includes('DISC_LF')
							|| modelPart.name.includes('SUSP_RF')  || modelPart.name.includes('SUSP_LF')) {
								if(modelPart.rotation.y > 0)
									modelPart.rotation.y -= 0.01;
								else if(modelPart.rotation.y < 0)
									modelPart.rotation.y += 0.01;
							}
							if(modelPart.name.includes('COCKPIT')) {
								for (const subModelPart of modelPart.children) {
									if(subModelPart.name.includes('STEER')) {
										if(Math.abs(subModelPart.rotation.z) < 0.1) {
											subModelPart.rotation.z = 0;
										} else if(subModelPart.rotation.z > 0) {
											subModelPart.rotation.z -= 0.06;
											vehicleModel.rotation.y -= ROTATION_SPEED[currentVehicle] * speed/3;
										} else if(subModelPart.rotation.z < 0) {
											subModelPart.rotation.z += 0.06;
											vehicleModel.rotation.y += ROTATION_SPEED[currentVehicle] * speed/3;
										}
									}
								}
							}
						}
					}
				}
				if(keysPressed.up) {
					if(speed <= currentMaxSpeed){
						speed += 0.004;
						if(currentVehicle == 1 && !isAccelerationSoundOn) {
							accelerationSound.play();
							isAccelerationSoundOn = true;
						}
					}
				}
				if(keysPressed.down) {
					if(speed >= -currentMaxSpeed/2)  {
						speed -= BRAKING_SPEED[currentVehicle];
						if(isAccelerationSoundOn) {
							accelerationSound.stop();
							isAccelerationSoundOn = false;
						}
					}
				}

				// If no up or down key is pressed, slow down the vehicle
				if(!keysPressed.up && !keysPressed.down) {
					if(speed < 0)
						speed += 0.002;
					if(speed > 0) 
						speed -= 0.002;
					// speed might not get to zero just by adding/subtracting (e.g. 0.014500000000000006), so when it is close to zero we force it to zero so the vehicle fully stops
					if(Math.abs(speed) < 0.01)
						speed = 0;

					//if the user didn't brake but the car is coming to a stop automatically, stop the sound when the speed is low
					if(speed < currentMaxSpeed/2  && isAccelerationSoundOn) {
						accelerationSound.stop();
						isAccelerationSoundOn = false;
					}
				}
				
				vehicleModel.position.z += speed * Math.cos(vehicleModel.rotation.y);
				vehicleModel.position.x += speed * Math.sin(vehicleModel.rotation.y);

				// rotate wheels of skateboard depending on speed
				if(currentVehicle == 0) {
					for (const modelPart of vehicleModel.children[0].children[0].children) {
						if(modelPart.name.includes('wheel'))
							modelPart.rotation.x += speed*5;
					}
				}
				// rotate wheels of car depending on speed
				if(currentVehicle == 1) {
					for (const modelPart of vehicleModel.children) {
						if(modelPart.name.includes('WHEEL') || modelPart.name.includes('DISC'))
							modelPart.rotation.x += speed;
					}
				}


				// Jump (when user presses spacebar)
				if((currentVehicle == 0) && jumping) {
					vehicleModel.rotation.order = 'YXZ'; // https://stackoverflow.com/a/14776900/3174659
					if(vehicleModel.position.y < 1.5) {
						vehicleModel.position.y += 0.05;
						if(vehicleModel.rotation.x >= -0.3)
							vehicleModel.rotation.x -= 0.02;
					} else {
						jumping = false;
						falling = true;
					}

				}
				if((currentVehicle == 0) && falling) {
					vehicleModel.rotation.order = 'YXZ'; // https://stackoverflow.com/a/14776900/3174659
					if(vehicleModel.position.y <= VEHICLE_INITIAL_POSITION[currentVehicle].y) {
						vehicleModel.position.y = VEHICLE_INITIAL_POSITION[currentVehicle].y;
						falling = false;
					} else {
						vehicleModel.position.y -= 0.05;
						if(vehicleModel.rotation.x <= 0)
							vehicleModel.rotation.x += 0.025;
					}
				}


				// Update camera

				if(cameraView == 'fixed') {
					camera.position.z =  vehicleModel.position.z - (6+mouseZoom*.005)*Math.cos(vehicleModel.rotation.y);
					camera.position.x =  vehicleModel.position.x - (6+mouseZoom*.005)*Math.sin(vehicleModel.rotation.y);
					camera.position.y = 3 + mouseZoom*.002;
					camera.lookAt(vehicleModel.position.x, vehicleModel.position.y+1.5, vehicleModel.position.z);
				} else if(cameraView == 'cockpit') {
					camera.position.z =  vehicleModel.position.z - 0.01*Math.cos(vehicleModel.rotation.y);
					camera.position.x =  vehicleModel.position.x - 0.01*Math.sin(vehicleModel.rotation.y);
					camera.position.y = 1.6 ;
					camera.lookAt(vehicleModel.position.x + 5*Math.sin(vehicleModel.rotation.y), vehicleModel.position.y+1.5, vehicleModel.position.z + 5*Math.cos(vehicleModel.rotation.y));
				} else if(cameraView == 'bonnet') {
					camera.position.z =  vehicleModel.position.z + Math.cos(vehicleModel.rotation.y);
					camera.position.x =  vehicleModel.position.x + Math.sin(vehicleModel.rotation.y);
					camera.position.y = 1.5 ;
					camera.lookAt(vehicleModel.position.x + 5*Math.sin(vehicleModel.rotation.y), vehicleModel.position.y+1.5, vehicleModel.position.z + 5*Math.cos(vehicleModel.rotation.y));
				}
			

				// Move spotlight to where the vehicle is
				// scene.remove(spotLight);
				// spotLight = new THREE.SpotLight('white', 30, 1000, Math.PI / 7);
				// spotLight.position.set(vehicleModel.position.x, vehicleModel.position.y+4, vehicleModel.position.z);
				// spotLight.target.position.set(vehicleModel.position.x, vehicleModel.position.y, vehicleModel.position.z);
				// scene.add(spotLight);
				// scene.remove(spotLightHelper);
				// spotLightHelper = new THREE.SpotLightHelper( spotLight );
				// scene.add( spotLightHelper );















				
				//
				// COLLISION DETECTION - https://stackoverflow.com/a/70403986/3174659
				//

				// 1. Calculate bounding boxes for the spheres and the player-controlled vehicle and also helpers to see where the bbs are
				for (let i = 0; i < wallArray.length ; i++) {
					boundingBoxesWalls.push(new THREE.Box3().setFromObject(wallArray[i]));
				}

				for (let i = 0; i < checkpointArray.length ; i++) {
					boundingBoxesCheckpoints.push(new THREE.Box3().setFromObject(checkpointArray[i]));
				}

				boundingBoxFinish = new THREE.Box3().setFromObject(finish);

				boundingBoxHurdle = new THREE.Box3().setFromObject(hurdle);

				// https://github.com/Mugen87/yuka/blob/master/examples/math/common/js/BVHelper.js
				function createSphereHelper( boundingSphere ) {
					const geometry = new THREE.SphereGeometry( boundingSphere.radius, 16, 16 );
					const material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
					const mesh = new THREE.Mesh( geometry, material );
					mesh.position.copy( boundingSphere.center );
					return mesh;
				}
				for (let i = 0; i < sphereGroup.length ; i++) {
					boundingBoxesSpheres[i] = new THREE.Sphere(new THREE.Vector3(sphereGroup[i].position.x, sphereGroup[i].position.y, sphereGroup[i].position.z), sphereGroup[i].scale.x/2);
					// if(boundingBoxesSpheresHelpers[i])
					// 	scene.remove( boundingBoxesSpheresHelpers[i] );
					// boundingBoxesSpheresHelpers[i] = new createSphereHelper(boundingBoxesSpheres[i])
					// scene.add( boundingBoxesSpheresHelpers[i] );
				}

				for (let i = 0; i < miscModels.length ; i++) {
					const boundingBoxModel = new THREE.Box3().setFromObject(miscModels[i]);

					// if the models rotate, we need to make min and max constant so that the boundingBox doesn't change with rotation of model
					// this is also good to have more control over the boundingbox size even if the models don't rotate (default boundingboxes are too big)
					const centerVec = new THREE.Vector3();
					boundingBoxModel.getCenter(centerVec);
					boundingBoxModel.min.x = centerVec.x - .4 * OBSTACLE_SCALE;
					boundingBoxModel.min.y = centerVec.y - .8 * OBSTACLE_SCALE;
					boundingBoxModel.min.z = centerVec.z - .6 * OBSTACLE_SCALE;
					boundingBoxModel.max.x = centerVec.x + .4 * OBSTACLE_SCALE;
					boundingBoxModel.max.y = centerVec.y + .8 * OBSTACLE_SCALE;
					boundingBoxModel.max.z = centerVec.z + .6 * OBSTACLE_SCALE;

					boundingBoxesModels[i] = boundingBoxModel;

					// if(boundingBoxesModelsHelpers[i])
					// 	scene.remove( boundingBoxesModelsHelpers[i] );
					// boundingBoxesModelsHelpers[i] = new THREE.Box3Helper(boundingBoxesModels[i], 0xffff00 )
					// scene.add( boundingBoxesModelsHelpers[i] );
				}

				if(boundingBoxesVehicleHelper)
					scene.remove( boundingBoxesVehicleHelper );
				// Set bounding box on the entire vehicle (may cause a too large box when the vehicle is rotated)
				// boundingBoxVehicle = new THREE.Box3().setFromObject(vehicleModel);
				// boundingBoxesVehicleHelper = new THREE.Box3Helper(boundingBoxVehicle, 0xffff00 )
				// Alternatively, we can set bounding boxes on only some smaller parts of the vehicle so they don't get as big when the vehicle is rotated
				boundingBoxesVehicleHelper = new THREE.Group();

				if(currentVehicle == 0) {
					for (const modelPart of vehicleModel.children[0].children[0].children) {
						// Put the collision box either at the front or the back of the vehicle, depending on the direction of movement
						if((modelPart.name.includes('Truck_front') && speed > 0) || (modelPart.name.includes('Truck_back') && speed < 0)) {
							const boundingBoxVehicle = new THREE.Box3().setFromObject(modelPart);
							// Adjust the bounding box a little so that rotating the vehicle doesn't distort it as much
							const roundedAngle = Math.abs(Math.cos(vehicleModel.rotation.y));
							boundingBoxVehicle.expandByVector(new THREE.Vector3((1-roundedAngle)*.3, 0, roundedAngle*.3));
							// print debug info only e.g. every 600 frames (i.e. every 5 seconds at 120Hz)
							// if( renderer.info.render.frame % 120 == 0) {
							// 	console.log(Math.abs(Math.cos(vehicleModel.rotation.y)));
							// }
							boundingBoxesVehicle.push(boundingBoxVehicle);
							// boundingBoxesVehicleHelperElement = new THREE.Box3Helper(boundingBoxVehicle, 0xffff00 )
							// boundingBoxesVehicleHelper.add(boundingBoxesVehicleHelperElement);
						}
					}
				} else if(currentVehicle == 1) {
					for (const modelPart of vehicleModel.children) {
						if((modelPart.name.includes('FRONT_BUMPER') && speed > 0) || (modelPart.name.includes('REAR_BUMPER') && speed < 0)) {
							// the first children of the part should be enough for collision detection, but if not use this for:
							// for (const modelSubpart of modelPart.children[0].children) {
							const modelSubpart = modelPart.children[0].children[0]
							const boundingBoxVehicle = new THREE.Box3().setFromObject(modelSubpart, true);
							boundingBoxesVehicle.push(boundingBoxVehicle);
							// boundingBoxesVehicleHelperElement = new THREE.Box3Helper(boundingBoxVehicle, 0xffff00 )
							// boundingBoxesVehicleHelper.add(boundingBoxesVehicleHelperElement);
							
						}
					}
				}
				scene.add( boundingBoxesVehicleHelper );


				// 2. If there is a collision between the vehicle and one of the other objects in the scene, reverse the direction of movement of the vehicle
				
				for (let j = 0; j < boundingBoxesVehicle.length ; j++) {
					
					for (let i = 0; i < boundingBoxesSpheres.length ; i++) {
						if (boundingBoxesSpheres[i].intersectsBox(boundingBoxesVehicle[j])) {
							// console.log('hit ' + i + ' ' +  Date.now());
							vehicleModel.position.z += 0.05 * Math.cos(vehicleModel.rotation.y);
							vehicleModel.position.x += 0.05 * Math.sin(vehicleModel.rotation.y);
							speed = -speed * 0.75;
							movementDirectionY[i] = !movementDirectionY[i];
							movementDirectionZ[i] = !movementDirectionZ[i];
							if(movementDirectionY[i])
								sphereGroup[i].position.y += 0.1;
							else
								sphereGroup[i].position.y -= 0.1;
							if(movementDirectionZ[i])
								sphereGroup[i].position.z += 0.1;
							else
								sphereGroup[i].position.z -= 0.1;
						}
					}
					
					for (let i = 0; i < boundingBoxesModels.length ; i++) {
						if (boundingBoxesModels[i].intersectsBox(boundingBoxesVehicle[j])) {
							accelerationSound.stop();
							isAccelerationSoundOn = false;
							crashSound.stop();
							crashSound.play();
							vehicleModel.position.z -= 0.2 * Math.cos(vehicleModel.rotation.y);
							vehicleModel.position.x -= 0.2 * Math.sin(vehicleModel.rotation.y);
							speed = -speed * 0.5;
							health -= 10;
							currentMaxSpeed = MAX_SPEED[currentVehicle]*health/100;
						}
					}
					
					for (let i = 0; i < boundingBoxesWalls.length ; i++) {
						if (boundingBoxesWalls[i].intersectsBox(boundingBoxesVehicle[j])) {
							accelerationSound.stop();
							isAccelerationSoundOn = false;
							crashSound.stop();
							crashSound.play();
							// if(speed > 0) {
							// 	vehicleModel.position.z -= 0.2 * Math.cos(vehicleModel.rotation.y);
							// 	vehicleModel.position.x -= 0.2 * Math.sin(vehicleModel.rotation.y);
							// } else {
							// 	vehicleModel.position.z += 0.2 * Math.cos(vehicleModel.rotation.y);
							// 	vehicleModel.position.x += 0.2 * Math.sin(vehicleModel.rotation.y);
							// }
							
							// To simulate impact, rotate the vehicle a bit depending on orientation of wall and vehicle
							// if(wallOrientation[i] == 'n') {
							// 	if(Math.sin(vehicleModel.rotation.y) < 0)
							// 		vehicleModel.rotation.y += (speed > 0) ? -WALL_HIT_ROTATION[currentVehicle] : +WALL_HIT_ROTATION[currentVehicle];
							// 	else
							// 		vehicleModel.rotation.y += (speed > 0) ? +WALL_HIT_ROTATION[currentVehicle] : -WALL_HIT_ROTATION[currentVehicle];
							// } else if(wallOrientation[i] == 's') {
							// 	if(Math.sin(vehicleModel.rotation.y) < 0)
							// 		vehicleModel.rotation.y += (speed > 0) ? +WALL_HIT_ROTATION[currentVehicle] : -WALL_HIT_ROTATION[currentVehicle];
							// 	else
							// 		vehicleModel.rotation.y += (speed > 0) ? -WALL_HIT_ROTATION[currentVehicle] : +WALL_HIT_ROTATION[currentVehicle];
							// } else if(wallOrientation[i] == 'e') {
							// 	if(Math.cos(vehicleModel.rotation.y) < 0)
							// 		vehicleModel.rotation.y += (speed > 0) ? -WALL_HIT_ROTATION[currentVehicle] : +WALL_HIT_ROTATION[currentVehicle];
							// 	else
							// 		vehicleModel.rotation.y += (speed > 0) ? +WALL_HIT_ROTATION[currentVehicle] : -WALL_HIT_ROTATION[currentVehicle];
							// } else if(wallOrientation[i] == 'w') {
							// 	if(Math.cos(vehicleModel.rotation.y) < 0)
							// 		vehicleModel.rotation.y += (speed > 0) ? +WALL_HIT_ROTATION[currentVehicle] : -WALL_HIT_ROTATION[currentVehicle];
							// 	else
							// 		vehicleModel.rotation.y += (speed > 0) ? -WALL_HIT_ROTATION[currentVehicle] : +WALL_HIT_ROTATION[currentVehicle];
							// } 

							speed = -speed * 0.5;
							health -= 10;
							currentMaxSpeed = MAX_SPEED[currentVehicle]*health/100;
						}
					}

					for (let i = 0; i < boundingBoxesCheckpoints.length ; i++) {
						if (!checkpointsPassed.includes(i) && boundingBoxesCheckpoints[i].intersectsBox(boundingBoxesVehicle[j])) {
							checkpointSound.stop();
							checkpointSound.play();
							checkpointsPassed.push(i)
							checkpointArray[i].visible = false;
						}
					}

					if (boundingBoxFinish.intersectsBox(boundingBoxesVehicle[j])) {
						if((finish.visible == true) && (checkpointsPassed.length == checkpointArray.length)) {
							finishSound.play();
							finished = true;
							finish.visible = false;
						}
						
					}

					if (boundingBoxHurdle.intersectsBox(boundingBoxesVehicle[j])) {
						vehicleModel.position.z -= 0.2 * Math.cos(vehicleModel.rotation.y);
						vehicleModel.position.x -= 0.2 * Math.sin(vehicleModel.rotation.y);
						speed = -speed * 0.75;
					}
				}


				// Update HUD
				if(!finished) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					if(checkpointsPassed.length == checkpointArray.length)
						ctx.fillText("Checkpoints passed: " + checkpointsPassed.length + "/" + checkpointArray.length + ". Go to the finish line!", 20, 90);
					else
						ctx.fillText("Checkpoints passed: " + checkpointsPassed.length + "/" + checkpointArray.length, 20, 90);
					ctx.fillText("Vehicle condition: " + health + "%", 20, 120);
					ctx.fillText("Time: " + timer.getElapsedTime().toFixed(1) + " s", 20, 150);
					let speedConverted = speed*1000;
					ctx.fillText("Speed: " + speedConverted.toFixed(0) + " km/h", 20, 180);
				} else {
					timer.stop();
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.fillText("Congrats! You finished in " + timer.getElapsedTime().toFixed(1) + " s", 400, 300);
				}


				stats.update();
			} else {
				// if vehicle isn't loaded yet, point camera at where it will be loaded (so it doesn't point at 0,0,0)
				camera.lookAt(VEHICLE_INITIAL_POSITION[currentVehicle].x, VEHICLE_INITIAL_POSITION[currentVehicle].y+1.5, VEHICLE_INITIAL_POSITION[currentVehicle].z);
			}
			
			if(cameraView == 'free')
				controls.update();

			renderer.render( scene, camera );

		}
	};

	animate();




	


	//
	// EVENT LISTENERS
	//

	// Resize scene on window resize - https://discoverthreejs.com/book/first-steps/responsive-design/
	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		if(document.fullscreenElement)
			renderer.setSize(window.innerWidth, window.innerHeight);
		else
			renderer.setSize(window.innerWidth*.9, window.innerHeight*.9);
		renderer.setPixelRatio(window.devicePixelRatio);
	});
	
	// Sliders for user input
	// document.querySelector('#fov-slider').addEventListener('input', function() {
	// 	camera.fov = this.value;
	// 	camera.updateProjectionMatrix();
	// 	controls.update();
	// });
	// document.querySelector('#reset-camera').addEventListener('click', function() {
	// 	controls.reset();
	// });
	// document.querySelector('#auto-rotate').addEventListener('click', function() {
	// 	if(controls.autoRotate == false)
	// 		controls.autoRotate = true;
	// 	else
	// 		controls.autoRotate = false;
	// });
	// document.querySelector('#auto-rotate-speed').addEventListener('input', function() {
	// 	controls.autoRotateSpeed = this.value;
	// });


	// Move the vehicle with the arrow or WASD keys, F to change camera, R to reset and scroll wheel to zoom
	document.addEventListener('keydown', function(event) {
		const key = event.key;
		if(key == "ArrowLeft" || key == "a" || key == "A")
			keysPressed.left = true;
		if(key == "ArrowRight" || key == "d" || key == "D")
			keysPressed.right = true;
		if(key == "ArrowUp" || key == "w" || key == "W")
			keysPressed.up = true;
		if(key == "ArrowDown" || key == "s" || key == "S")
			keysPressed.down = true;

		if(key == "c" || key == "C") {
			if(cameraView == 'fixed')
				cameraView = 'free';
			else if(cameraView == 'free')
				cameraView = 'cockpit';
			else if(cameraView == 'cockpit')
				cameraView = 'bonnet';
			else
				cameraView = 'fixed';
			// if user turned fixed camera off, put it close to the vehicle once and then let user change it at will (we don't change its position in animate())
			if(cameraView == 'free') {
				controls.target = vehicleModel.position; // https://stackoverflow.com/a/68958468/3174659
				camera.position.x = vehicleModel.position.x;
				camera.position.y = vehicleModel.position.y + 4;
				camera.position.z = vehicleModel.position.z + 6;
			}
			mouseZoom = 0;
		}

		if(key == "r" || key == "R") {
			vehicleModel.position.copy(VEHICLE_INITIAL_POSITION[currentVehicle]);
			vehicleModel.rotation.y = Math.PI;
			speed = 0;
			health = 100;
			currentMaxSpeed = MAX_SPEED[currentVehicle];
			for (let i = 0; i < checkpointArray.length ; i++) {
				checkpointArray[i].visible = true;
				checkpointsPassed = [];
			}
			finished = false;
			finish.visible = true;
			timer.start();
		}

		if(key == " ") {
			if(!jumping && !falling)
				jumping = true;
		}

		if(key == "v" || key == "V") {
			currentVehicle = (currentVehicle + 1) % VEHICLE_FILEPATHS.length;
			currentMaxSpeed = MAX_SPEED[currentVehicle];
			speed = 0;
			cameraView = 'fixed';
			spawnVehicle();
		}

		if(key == "f" || key == "F") {
			if (!document.fullscreenElement) {
				document.querySelector("#canvases").requestFullscreen();
			} else {
				document.exitFullscreen();
			}
		}
	});
	document.addEventListener('keyup', function(event) {
		const key = event.key;
		if(key == "ArrowLeft" || key == "a" || key == "A")
			keysPressed.left = false;
		if(key == "ArrowRight" || key == "d" || key == "D")
			keysPressed.right = false;
		if(key == "ArrowUp" || key == "w" || key == "W")
			keysPressed.up = false;
		if(key == "ArrowDown" || key == "s" || key == "S")
			keysPressed.down = false;
	});

	document.addEventListener('wheel', function(event) {
		if(camera && vehicleModel)
			mouseZoom += event.deltaY;
	});
