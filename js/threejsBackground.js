
import { getGPUTier } from 'detect-gpu';

var scene, renderer, animationFrame;

// defaults for most machines - only draw 3d background on initial page load on good (tier 3) GPUs - see call to getGPUTier() below
var threeDBackgroundOn = false;
$("#desktop").css("background","#CCC");

// code from https://www.npmjs.com/package/detect-gpu
(async () => {
    const gpuTier = await getGPUTier();
  
    // Example output:
    // {
    //   "tier": 1,
    //   "isMobile": false,
    //   "type": "BENCHMARK",
    //   "fps": 21,
    //   "gpu": "intel iris graphics 6100"
    // }

    // alert(JSON.stringify(gpuTier));

    if(gpuTier.tier == 3)
        toggle()
    else {
        $("#bgColorChanger").show();
    }

})();


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
        // scene.background = new THREE.TextureLoader().load('img/clouds2.jpg');
        
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.z = 26;

        renderer = new THREE.WebGLRenderer({canvas: document.querySelector('#bg')});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);

        const controls = new THREE.OrbitControls( camera, renderer.domElement );

        // const axesHelper = new THREE.AxesHelper( 100 );
        // scene.add(axesHelper);
        

        // LIGHTS AND SKY
        // const ambientLight = new THREE.AmbientLight( 0x404040, 4); // soft white light
        // scene.add( ambientLight );
        
        // const directionalLight = new THREE.DirectionalLight('white', 3);
        // directionalLight.position.set(0, 30, 100);
        // scene.add(directionalLight);
        
        const spotLight = new THREE.SpotLight('white', 5, 400, Math.PI / 2.4);
        spotLight.position.set(2, 8, 10);
        spotLight.target.position.set(2, -10, 0);
        scene.add(spotLight);
        const spotLightHelper = new THREE.SpotLightHelper( spotLight );
        spotLightHelper.visible = false; // have to hide it this way because if I remove the code for the spotLightHelper, then I can't move the spotlight...
        scene.add( spotLightHelper );
        
        const sky = new THREE.Sky();
        sky.scale.setScalar( 10000 );
        sky.material.uniforms[ 'sunPosition' ].value.set(0,3,10);
        sky.material.uniforms[ 'rayleigh' ].value = 1;
        sky.material.uniforms[ 'turbidity' ].value = 5;
        sky.material.uniforms[ 'mieCoefficient' ].value = 0.01;
        sky.material.uniforms[ 'mieDirectionalG' ].value = 0.9;
        scene.add( sky );

        // Skybox to use instead of THREE.Sky() - https://r105.threejsfundamentals.org/threejs/lessons/threejs-backgrounds.html
        // const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        // const textureLoader = new THREE.TextureLoader();
        // const material = new THREE.MeshStandardMaterial( {map: textureLoader.load('img/sky_seamless2.jpg')} );
        // material.side = THREE.BackSide;
        // const cube = new THREE.Mesh( geometry, material );
        // cube.scale.setScalar(1500);
        // scene.add(cube);


        // OBJECTS
        const gltfLoader = new THREE.GLTFLoader();
        const colladaLoader = new THREE.ColladaLoader();
        let model, model2;
        //
        // TO use FBXLoader, we need to also include "three/examples/js/libs/fflate.min.js"
        // BUT even with that extra lib, the GLTFLoader (.gltf/.glb) and the ColladaLoader (.dae) seem to work better.
        // 
        // HOWEVER, for .glb models that throw the error "THREE.GLTFLoader: Unknown extension "KHR_materials_pbrSpecularGlossiness"."
        // we need to remove that extension from the model by importing and then exporting the model at https://gltf.report/
        // For details about three.js's deprecation of this extension see https://github.com/mrdoob/three.js/pull/24950
        // and see also the tool author's explanation at https://www.donmccurdy.com/2022/11/28/converting-gltf-pbr-materials-from-specgloss-to-metalrough/
        // 
        // ALSO, for .dae files we EITHER need to remove white lines with:
        // "model2.children[0].children.forEach(child => { if(child.type == "LineSegments")child.visible = false; });"
        // OR use a tool like https://imagetostl.com/convert/file/dae/to/glb to convert .dae to .glb and import with GLTFLoader
        //
        gltfLoader.load( 'img/mount_rough.glb', function ( file ) {
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
            scene.add(model, model2);
        });
        // gltfLoader.load( 'img/win2.glb', function ( file ) {
        // 	// console.log(file);
        // 	model2 = file.scene;
        // 	model2.position.x = 7;
        // 	model2.position.y = 2.5;
        // 	model2.position.z = 15;
        // 	model2.scale.setScalar(0.5);
        // 	model2.rotation.y = -0.15;
        // 	scene.add(model2);
        // });
        // colladaLoader.load( 'img/hill.dae', function ( file ) {
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



export default toggle;