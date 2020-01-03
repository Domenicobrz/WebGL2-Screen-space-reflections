import { createCamera } from "./dependencies/camera_v1.05";
import { mat4, vec3, vec4 } from "./dependencies/gl-matrix-min";
import { initSceneProgram, drawScene } from "./sceneProgram";
import { initSSRProgram, drawSSR } from "./SSRProgram";
import { initComposerProgram, drawComposer } from "./composerProgram";
import { initCubeMapProgram, drawCubeMap } from "./cubeMapProgram";
import { getTexture } from "./dependencies/getTexture";
import { getTextureCube } from "./dependencies/getTextureCube";
import * as dat from 'dat.gui';


window.addEventListener("load", init);


var gl;
var canvas;
var camera;

var matrices = [];
var perspective;
var invPerspective;
var invView;
var model;
var view;

var itemsToDownload = 9;
var downloadedItems = 0;
var ready           = false;

var mesh;
var sceneTextures = { };

var envmap1;
var envmap2;

var worldExtent = {
    x: 0,
    y: 0,
    z: 0
};


function init() {
    canvas = document.getElementById("canvas");
	canvas.width  = innerWidth;
	canvas.height = innerHeight;

    gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, alpha: true });

    if(gl === null)
        alert("could not initialize WebGL");

    if (!gl.getExtension("EXT_color_buffer_float")) {
        console.error("FLOAT color buffer not available");
        document.body.innerHTML = "This example requires EXT_color_buffer_float which is unavailable on this system.";
    }
    if (!gl.getExtension("OES_texture_float_linear")) {
        console.error("FLOAT color buffer not available");
        document.body.innerHTML = "This example requires EXT_color_buffer_float which is unavailable on this system.";
    }


    initGUI();
    downloadModel();
    downloadTextures();

    draw();
}

function afterDownload() {
    initCamera();

    initCubeMapProgram();
    initSceneProgram();
    initSSRProgram();
    initComposerProgram();
}

function incrementDownloadCount() {
    var loadingModal = document.querySelector(".loading-modal > p");

    downloadedItems++;
    loadingModal.textContent = "loading textures ... " + downloadedItems + "/" + itemsToDownload;
    if(downloadedItems === itemsToDownload) {
        loadingModal.parentElement.style.opacity = 0;
    } 
}

function downloadTextures() {


    envmap1 = getTextureCube(
        "assets/envmaps/1/posx.jpg", 
        "assets/envmaps/1/negx.jpg", 
        "assets/envmaps/1/posy.jpg", 
        "assets/envmaps/1/negy.jpg", 
        "assets/envmaps/1/posz.jpg", 
        "assets/envmaps/1/negz.jpg", 
        function() {
            incrementDownloadCount();
        });

    envmap2 = getTextureCube(
        "assets/envmaps/3/posx.jpg", 
        "assets/envmaps/3/negx.jpg", 
        "assets/envmaps/3/posy.jpg", 
        "assets/envmaps/3/negy.jpg", 
        "assets/envmaps/3/posz.jpg", 
        "assets/envmaps/3/negz.jpg", 
    function() {
    });

    sceneTextures.albedoTexture = getTexture("assets/textures/Futuristic_Car_C.jpg", false, 
    function(){
        incrementDownloadCount();
    });

    sceneTextures.roughnessTexture = getTexture("assets/textures/Futuristic_Car_S.jpg", false, 
    function(){
        incrementDownloadCount();
    });

    sceneTextures.aoCarTexture = getTexture("assets/textures/Futuristic_Car_O2.png", false, 
    function(){
        incrementDownloadCount();
    });


    sceneTextures.LUTTexture = getTexture("assets/textures/brdf_lut_5.png", false, 
    function(){
        incrementDownloadCount();
    });

    sceneTextures.streetAlbedo = getTexture("assets/textures/street_albedo.png", true, 
    function(){
        incrementDownloadCount();
    });

    sceneTextures.streetNormal = getTexture("assets/textures/street_normal.png", true, 
    function(){
        incrementDownloadCount();
    });

    sceneTextures.streetAOmap = getTexture("assets/textures/street_aomap.png", false, 
    function(){
        incrementDownloadCount();
    });

    sceneTextures.cubeTexture = envmap1;
}

function downloadModel() {
    getJSON("assets/models/fcar-clean2.json", function(status, data) {
        console.log(data);

        mesh = { };
        mesh.vertices = data.meshes[0].vertices;
        mesh.normals  = data.meshes[0].normals;
        mesh.uvs      = data.meshes[0].texturecoords[0];
        mesh.indexes  = [];
        mesh.maxIndex = -1;

        for(let i = 0; i < data.meshes[0].faces.length; i++) {
            let face = data.meshes[0].faces[i];
            let i1 = face[0], i2 = face[1], i3 = face[2];
            if(i1 > mesh.maxIndex) mesh.maxIndex = i1;
            if(i2 > mesh.maxIndex) mesh.maxIndex = i2;
            if(i3 > mesh.maxIndex) mesh.maxIndex = i3;

            mesh.indexes.push(i1, i2, i3);
        }

        console.log("d1");
        downloadedItems++;
    });
}

var getJSON = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
        var status = xhr.status;
        if (status === 200) {
            callback(null, xhr.response);
        } else {
            callback(status, xhr.response);
        }
    };
    xhr.send();
};

function initCamera() {
    camera = new createCamera();
    camera.pos = [0, 3, 10];
    camera.look = [0, 0, 0];
    camera.autoCentered = true;
    camera.radius = 13.0;		
    camera.pitch = 0.2;		
    camera.yaw = 0.9;		


    invPerspective = mat4.create();
    invView        = mat4.create();
    perspective = mat4.create(); 
    model       = mat4.create(); 
    view        = mat4.create(); 
    mat4.perspective(perspective, 45 * Math.PI / 180, innerWidth / innerHeight, 0.3, 50);
    mat4.invert(invPerspective, perspective); 
    mat4.invert(invView, view); 







    var testvec = vec4.fromValues(1, 1, 1, 1);
    vec4.transformMat4(testvec, testvec, invPerspective);
    console.log( "after invpersp mult: " + testvec);
    testvec[0] /= testvec[3];
    testvec[1] /= testvec[3];
    testvec[2] /= testvec[3];
    testvec[3] /= testvec[3];
    console.log( "after w div: " + testvec);

    worldExtent.x = testvec[0];
    worldExtent.y = testvec[1];
    worldExtent.z = -testvec[2];
    // // testvec = vec4.fromValues(-1, -1, 1, 1);
    // vec4.transformMat4(testvec, testvec, invPerspective);
    // console.log( "after InvPersp mult: " + testvec);
    // testvec[0] /= testvec[3];
    // testvec[1] /= testvec[3];
    // testvec[2] /= testvec[3];
    // testvec[3] /= testvec[3];
    // console.log( "after w div: " + testvec);


    // line segment intersection test, will be useful inside shaders
    var A = {x: 2, y: 0};
    var B = {x: 4, y: 4};

    var C = {x: 0, y: 0};
    var D = {x: 4, y: 2};

    var r = (      (A.y - C.y) * (D.x - C.x) - (A.x - C.x) * (D.y - C.y)     )  /
            (      (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x)     );

    var Px = A.x + r * (B.x-A.x);
    var Py = A.y + r * (B.y-A.y);

    console.log("Px: " + Px);
    console.log("Py: " + Py);




    matrices = [
        perspective,
        model,
        view,

        invPerspective,
        invView
    ];  
}


var then = 0;
function draw(now) {
    requestAnimationFrame(draw);
    
    now *= 0.001;
    var deltatime = now - then;
    then = now;

    if(downloadedItems !== itemsToDownload) return;
    if(!ready) {
        afterDownload();
        ready = true;
    }


    view = camera.getViewMatrix(deltatime, 0.07);
    mat4.invert(invView, view); 
    matrices[2] = view;
    matrices[4] = invView;

    drawCubeMap(now, deltatime);
    drawScene(now, deltatime);
    drawSSR(now, deltatime);
    drawComposer(now, deltatime);
}


var currentEnvMap = 1;
var GUIcontroller = {
    x: 2.6,
    y: 2,
    z: 0,
    w: 0,
    switchEnvMap: function() {
        if(currentEnvMap === 1) {
            currentEnvMap = 2;
            sceneTextures.cubeTexture = envmap2;
            return;
        }

        if(currentEnvMap === 2) {
            currentEnvMap = 1;
            sceneTextures.cubeTexture = envmap1;
            return;
        }
    }
};

function initGUI() {
    var gui = new dat.GUI();

    gui.add(GUIcontroller, 'x', -5, 5);
    gui.add(GUIcontroller, 'y', -5, 5);
    gui.add(GUIcontroller, 'z', -0.5, 0.5);
    gui.add(GUIcontroller, 'w', -5, 5);
    gui.add(GUIcontroller, "switchEnvMap");

    gui.close();
}



export { gl, matrices, worldExtent, mesh, sceneTextures, camera, GUIcontroller };