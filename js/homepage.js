
import { getGPUTier } from 'detect-gpu';

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
		


/*
 * Toggle threejs background scene
 */		
$("#bg3d").on('click', function(event) {
    toggle();
});


/*
 * Show Clippy
 */
clippy.load('Clippy', function(agent) {
    agent.show();
    // run a random animation every 60 secs
    setInterval(function() {
        agent.animate()
    }, 60 * 1000); //
});


/*
 * Show little "OK" text where a click happens - https://stackoverflow.com/a/60837378/3174659
 */
function showOkText(event) {
    // get mouse (event) location
    var x = event.clientX;
    var y = event.clientY;
    
    // create element to add, but first remove it if it exists already from a previous click
    if($("#okText").length > 0)
        $("#okText")[0].remove();
    var newthing = document.createElement("div");
    newthing.id = "okText";
    newthing.style.position = "fixed";
    newthing.style.left = x - 20 + "px";
    newthing.style.top = y + 20 + "px";
    newthing.innerText = "OK!";
    $("#desktop")[0].appendChild(newthing);
    
    // remove "ok" text after a while so it doesn't stay there forever - https://stackoverflow.com/a/820954/3174659
    clearTimeout(timeoutID); // reset timeout from previous click
    timeoutID = setTimeout(function() {
        $('#okText').fadeOut('fast');
    }, 1000);
}


/*
 * Change background color on user click
 */
var timeoutID = undefined;
$("#bgColorChanger").on('click', function(event) {

    showOkText(event)
    
    // change color (from Kirupa Chinnathambi - Creating Web Animations (2017))
    var zeros = "0000000";
    var color = "#" + Math.floor(Math.random() * 0xFFFFFF).toString(16);
    var colorLength = color.length;
    if (colorLength < 7) {
        color += zeros.substring(0, zeros.length - colorLength);
    }
    $("#desktop")[0].style.backgroundColor = color;

    $("#bgColorChanger").hide();
    $("#bgColorReset").show();
});

 
/*
 * Reset color on user click
 */
$("#bgColorReset").on('click', function(event) {

    showOkText(event)

    $("#desktop")[0].style.backgroundColor = "#CCC";

    $("#bgColorChanger").show();
    $("#bgColorReset").hide();
});






/*
 * Draw ThreeJS background
 */
var scene, renderer, animationFrame;

// defaults for most machines - only draw 3d background on initial page load on good (tier 3) GPUs - see call to getGPUTier() below
var threeDBackgroundOn = false;
$("#desktop").css("background","#CCC");

// code from https://www.npmjs.com/package/detect-gpu
// but grab benchmarks from jsdelivr instead of unpkg (default in detect-gpu source code) because the latter has been intermittent
(async () => {
    const gpuTier = await getGPUTier({benchmarksURL: 'https://cdn.jsdelivr.net/npm/detect-gpu@5.0.22/dist/benchmarks'});
  
    // Example output:
    // {
    //   "tier": 1,
    //   "isMobile": false,
    //   "type": "BENCHMARK",
    //   "fps": 21,
    //   "gpu": "intel iris graphics 6100"
    // }

    // alert(JSON.stringify(gpuTier));

    if(gpuTier.tier == 3 && !gpuTier.isMobile)
        toggle()
    else {
        $("#bgColorChanger").show();
    }

})();

// draw or remove threejs scene based on previous state
function toggle() {

    if(threeDBackgroundOn == false) {
        
        // clear the background color so we can start drawing
        $("#desktop").css("background","");
        $("#bgColorChanger").hide();
        $("#bgColorReset").hide();
    
        threeDBackgroundOn = true;






        /*
         * Three.js background - https://www.youtube.com/watch?v=Q7AOvWpIVHU
         * basically I just took the idea of using a three.js scene covering the whole background (using position: fixed) and not all the other animations
         */

        // SETUP
        scene = new THREE.Scene();
        // scene.background = new THREE.Color( 'dodgerblue' );
        // scene.background = new THREE.TextureLoader().load('img/textures/clouds2.jpg');
        

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.z = 26;


        renderer = new THREE.WebGLRenderer({canvas: document.querySelector('#bg')});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);

        renderer.useLegacyLights = false;
		// renderer.physicallyCorrectLights= true; // pre r150

        renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // revert to pre r152 colors - https://github.com/mrdoob/three.js/pull/25783

        
        const controls = new OrbitControls( camera, renderer.domElement );

        
        // const axesHelper = new THREE.AxesHelper( 100 );
        // scene.add(axesHelper);
        






        // LIGHTS AND SKY
        const ambientLight = new THREE.AmbientLight( 0x404040, 50); // soft white light
        scene.add( ambientLight );
        
        // light the front
        const directionalLight = new THREE.DirectionalLight('white', 15);
        directionalLight.position.set(0, 30, 100);
        scene.add(directionalLight);
        // light the back (if no ambient light is present)
        // const directionalLightBack = new THREE.DirectionalLight('white', 5);
        // directionalLightBack.position.set(0, 30, -500);
        // scene.add(directionalLightBack);
        
        // const spotLight = new THREE.SpotLight('white', 500, 400, Math.PI / 2.4);
        // spotLight.position.set(2, 8, 10);
        // spotLight.target.position.set(2, -10, 0);
        // scene.add(spotLight);
        // const spotLightHelper = new THREE.SpotLightHelper( spotLight );
        // spotLightHelper.visible = false; // have to hide it this way because if I remove the code for the spotLightHelper, then I can't move the spotlight...
        // scene.add( spotLightHelper );
        
        const sky = new Sky();
        sky.scale.setScalar( 10000 );
        sky.material.uniforms[ 'sunPosition' ].value.set(0,3,10);
        sky.material.uniforms[ 'rayleigh' ].value = 1;
        sky.material.uniforms[ 'turbidity' ].value = 5;
        sky.material.uniforms[ 'mieCoefficient' ].value = 0.01;
        sky.material.uniforms[ 'mieDirectionalG' ].value = 0.9;
        scene.add( sky );

        // Skybox to use instead of Sky() - https://r105.threejsfundamentals.org/threejs/lessons/threejs-backgrounds.html
        // const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        // const textureLoader = new THREE.TextureLoader();
        // const material = new THREE.MeshStandardMaterial( {map: textureLoader.load('img/textures/sky_seamless2.jpg')} );
        // material.side = THREE.BackSide;
        // const cube = new THREE.Mesh( geometry, material );
        // cube.scale.setScalar(1500);
        // scene.add(cube);







        // OBJECTS
        
        // Floor
        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load( "img/textures/grassDarker.jpg" ); // default grass texture with my lighting setup made grass too bright, so darkened it thanks to https://pinetools.com/darken-image
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set( 100, 100 );
        const floorMaterial = new THREE.MeshStandardMaterial({map: floorTexture});
        floorMaterial.side = THREE.DoubleSide;
        const floorSide = 500;
        const floorGeometry = new THREE.PlaneGeometry( floorSide, floorSide );
        const floor = new THREE.Mesh( floorGeometry, floorMaterial );
        floor.rotation.x = - Math.PI / 2;
        floor.position.y = -4;
        scene.add( floor );


        const gltfLoader = new GLTFLoader();
        const colladaLoader = new ColladaLoader();
        let model, model2;
        //
        // TO use FBXLoader, we need to also include "three/examples/js/libs/fflate.min.js"
        // BUT even with that extra lib, the GLTFLoader (.gltf/.glb) and the ColladaLoader (.dae) seem to work better.
        // 
        // HOWEVER, for .glb models that throw the error "GLTFLoader: Unknown extension "KHR_materials_pbrSpecularGlossiness"."
        // we need to remove that extension from the model by importing and then exporting the model at https://gltf.report/
        // For details about three.js's deprecation of this extension see https://github.com/mrdoob/three.js/pull/24950
        // and see also the tool author's explanation at https://www.donmccurdy.com/2022/11/28/converting-gltf-pbr-materials-from-specgloss-to-metalrough/
        // 
        // ALSO, for .dae files we EITHER need to remove white lines with:
        // "model2.children[0].children.forEach(child => { if(child.type == "LineSegments")child.visible = false; });"
        // OR use a tool like https://imagetostl.com/convert/file/dae/to/glb to convert .dae to .glb and import with GLTFLoader
        //
        gltfLoader.load( 'img/models/mount_rough.glb', function ( file ) {
            // console.log(file);
            model = file.scene;
            model2 = model.clone();
            model.scale.set(0.2,0.075,0.1);
            model.position.x = 0;
            model.position.y = -5;
            model2.scale.set(0.2,0.12,0.2);
            model2.position.x = 55;
            model2.position.y = -10;
            model2.position.z = -50;
            // edit each material for this mesh - doesn't seem to have any effect...
            // model.children[0].children[0].children[0].children[0].children.forEach(element => {
            //     element.material.specularIntensity = 0.5;
            // });
            // console.log(model.children[0].children[0].children[0].children[0].children)
            scene.add(model, model2);
        });
        // gltfLoader.load( 'img/models/win2.glb', function ( file ) {
        // 	// console.log(file);
        // 	model2 = file.scene;
        // 	model2.position.x = 7;
        // 	model2.position.y = 2.5;
        // 	model2.position.z = 15;
        // 	model2.scale.setScalar(0.5);
        // 	model2.rotation.y = -0.15;
        // 	scene.add(model2);
        // });
        // colladaLoader.load( 'img/models/hill.dae', function ( file ) {
        // 	console.log(file);
        // 	model2 = file.scene;
        // 	model2.children[0].children.forEach(child => {
        // 		if(child.type == "LineSegments")
        // 			child.visible = false;
        // 	});
        // 	model2.position.y = 10;
        // 	model2.scale.setScalar( 0.01 );
        // 	scene.add( model2 );
        // });
        






        // ANIMATIONS AND UPDATES
        function animate() {
            animationFrame = requestAnimationFrame(animate);
            // if(model2)model2.rotation.y = Math.sin(Date.now() * 0.003) * Math.PI * 0.02; // https://stackoverflow.com/a/40971141/3174659
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Resize scene on window resize - https://discoverthreejs.com/book/first-steps/responsive-design/
        window.addEventListener("resize", () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // do not stretch background image when resizing window - https://stackoverflow.com/a/60842693/3174659
            // const targetAspect = window.innerWidth / window.innerHeight;
            // const imageAspect = 1920 / 1277;
            // const factor = imageAspect / targetAspect;
            // // When factor larger than 1, that means texture 'wilder' than target. We should scale texture height to target height and then 'map' the center of texture to target，and vice versa.
            // scene.background.offset.x = factor > 1 ? (1 - 1 / factor) / 2 : 0;
            // scene.background.repeat.x = factor > 1 ? 1 / factor : 1;
            // scene.background.offset.y = factor > 1 ? 0 : (1 - factor) / 2;
            // scene.background.repeat.y = factor > 1 ? 1 : factor;
        });
    
        
    } else {

        // Detach all objects from the scene to free up memory
        // https://stackoverflow.com/a/30360368/3174659
        while(scene.children.length > 0){ 
            // console.log(scene.children[0]);
            scene.children[0].geometry?.dispose();
            scene.children[0].material?.dispose();
            scene.children[0].dispose?.();
            scene.remove(scene.children[0]); 
        }
        renderer.dispose();

        // This call to cancelAnimationFrame() is what actually allows GPU usage to drop to 0% - https://stackoverflow.com/a/14466255/3174659
        // Thanks also to this post - https://discourse.threejs.org/t/performance-profiling-tools-cpu-gpu/17469 - for suggesting ChromeDevTools
        // which let me see that calls to animate() were being made by threejs even after disposing of all the scene children and renderer. (Firefox also 
        // allows to see this, but the interface is a bit less friendly) After discovering the pending animate() calls I googled on how to cancel the
        // animate() callback and found the SO link above.
        // The calls above of dispose() and remove() probably only clear the objects from RAM, not the GPU (but if the objects aren't in memory what
        // exactly is animate() doing? Just a general animation with n objects?)
        cancelAnimationFrame(animationFrame);

        threeDBackgroundOn = false;
        $("#desktop").css("background","#CCC");
        $("#bgColorChanger").show();

    }
    
}

