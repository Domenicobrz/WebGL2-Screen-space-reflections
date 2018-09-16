import { gl } from "./main";
import { matrices, mesh, sceneTextures, camera, GUIcontroller } from "./main";
import { getShader } from "./dependencies/shader";


var Program;
var sceneVertexArray;
var matrixUniformBuffer;
var gBuffer;
var scene;
function initSceneProgram() {
    Program = getShader(gl, vertexShader, fragmentShader);

    setAttributes();
    setUniforms();
    setGBuffer();
}

function setAttributes() {
    sceneVertexArray = gl.createVertexArray();
    gl.bindVertexArray(sceneVertexArray);
    
        scene = createScene();

        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, scene.positions, gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        var normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, scene.normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);

        var uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, scene.uvs, gl.STATIC_DRAW);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(2);

        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, scene.indexes, gl.STATIC_DRAW);


    gl.bindVertexArray(null);
}

function setUniforms() {
    var matrixUniformLocation = gl.getUniformBlockIndex(Program, "Matrices");
    gl.uniformBlockBinding(Program, matrixUniformLocation, 0);

    matrixUniformBuffer = gl.createBuffer();
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUniformBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 64 * 3, gl.DYNAMIC_DRAW);

    Program.uAlbedoLocation   = gl.getUniformLocation(Program, "uAlbedo");
    Program.uAlbedoPlane   = gl.getUniformLocation(Program, "uAlbedoPlane");
    Program.uNormalPlane   = gl.getUniformLocation(Program, "uNormalPlane");
    Program.uAOPlane   = gl.getUniformLocation(Program, "uAOPlane");
    Program.uAOCar   = gl.getUniformLocation(Program, "uAOCar");
    Program.uRoughnessLocation = gl.getUniformLocation(Program, "uRoughness");

    Program.uInvView = gl.getUniformLocation(Program, "uInvView");
    Program.uEnvMap = gl.getUniformLocation(Program, "uEnvMap");
    Program.uLUT = gl.getUniformLocation(Program, "uLUT");

    Program.uCameraPosition = gl.getUniformLocation(Program, "uCameraPosition");
    Program.uGUIcontrols = gl.getUniformLocation(Program, "uGUIcontrols");
    
    // later on, we'd do:
    // glBindBuffer(GL_UNIFORM_BUFFER, matrixUniformBuffer);
    // int b = true; // bools in GLSL are represented as 4 bytes, so we store it in an integer
    // glBufferSubData(GL_UNIFORM_BUFFER, 144, 4, &b); 
    // glBindBuffer(GL_UNIFORM_BUFFER, 0);
}

function setGBuffer() {
    gBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);
    gl.activeTexture(gl.TEXTURE0);



    // ******************** MIPMAP EXAMPLE ************************

    // Program.positionTarget = gl.createTexture();
    // gl.bindTexture(gl.TEXTURE_2D, Program.positionTarget);
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Program.positionTarget, 0);
    
    //      AFTER YOU'RE DONE RENDEREING, YOU WOULD CALL GENERATEMIPMAPS() like this :
    //      gl.drawArrays(gl.TRIANGLES, 0, 6);

    //      gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);
	//      gl.bindTexture(gl.TEXTURE_2D, Program.positionTarget);
    //      gl.generateMipmap(gl.TEXTURE_2D);
    //      as you can imagine, it's required to re-make the mipmaps everytime you render to your gBuffer texture
    
    // ******************** MIPMAP EXAMPLE - END ************************




    Program.positionTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, Program.positionTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Program.positionTarget, 0);

    Program.normalTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, Program.normalTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, Program.normalTarget, 0);

    Program.colorTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, Program.colorTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, Program.colorTarget, 0);

    Program.materialTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, Program.materialTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, Program.materialTarget, 0);

    Program.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, Program.depthTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, Program.depthTexture, 0);
    
    gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
        gl.COLOR_ATTACHMENT1,
        gl.COLOR_ATTACHMENT2,
        gl.COLOR_ATTACHMENT3
    ]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawScene(now, deltatime) {
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);


    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(/*gl.COLOR_BUFFER_BIT | */ gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);


    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUniformBuffer);
    var matricesBuffer = new Float32Array(16 * 3);
    for (let i = 0; i < 3; i++) {
        var matrix = matrices[i];
        for(let j = 0; j < 16; j++) {
            matricesBuffer[i*16 + j] = matrix[j];
        }
    }
    gl.bufferData(gl.UNIFORM_BUFFER, matricesBuffer, gl.DYNAMIC_DRAW);


    gl.useProgram(Program);
    gl.bindVertexArray(sceneVertexArray);


    gl.uniformMatrix4fv(Program.uInvView, false, matrices[4]);


    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(Program.uAlbedoLocation, 0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.albedoTexture);

    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(Program.uRoughnessLocation, 1);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.roughnessTexture);

    gl.uniform1i(Program.uEnvMap, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, sceneTextures.cubeTexture);

    gl.uniform1i(Program.uLUT, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.LUTTexture);


    gl.uniform1i(Program.uAlbedoPlane, 4);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.streetAlbedo);

    gl.uniform1i(Program.uNormalPlane, 5);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.streetNormal);

    gl.uniform1i(Program.uAOPlane, 6);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.streetAOmap);

    gl.uniform1i(Program.uAOCar, 7);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.aoCarTexture);


    gl.uniform3f(Program.uCameraPosition, camera.pos[0], camera.pos[1], camera.pos[2]);
    gl.uniform4f(Program.uGUIcontrols, GUIcontroller.x, GUIcontroller.y, GUIcontroller.z, GUIcontroller.w);


    // gl.drawArrays(gl.TRIANGLES, 0, 9);
    gl.drawElements(gl.TRIANGLES, scene.indexes.length, gl.UNSIGNED_INT, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);
	gl.bindTexture(gl.TEXTURE_2D, Program.colorTarget);
	gl.generateMipmap(gl.TEXTURE_2D);
}

function createScene() {
    var scene = { };

    var pm = 20;
    var tm = 1;
    var positions = [];
    for (let i = 0; i < mesh.vertices.length; i+=3) {
        positions.push(
            mesh.vertices[i+0],
            mesh.vertices[i+1] + 0.36,
            mesh.vertices[i+2],
            1
        );
    }

    // plane
    positions.push(    
        -1 * pm,  0, +1 * pm,  1,
        -1 * pm,  0, -1 * pm,  1,
        +1 * pm,  0, +1 * pm,  1,

        +1 * pm,  0, +1 * pm,  1,
        +1 * pm,  0, -1 * pm,  1,
        -1 * pm,  0, -1 * pm,  1
    );

    var normals = [];
    for (let i = 0; i < mesh.normals.length; i+=3) {
        normals.push(
            mesh.normals[i+0],
            mesh.normals[i+1],
            mesh.normals[i+2],
            0
        );
    }

    normals.push(
        0,1,0,0,
        0,1,0,0,
        0,1,0,0,

        0,1,0,0,
        0,1,0,0,
        0,1,0,0
    );

    var uvs = [];
    for (let i = 0; i < mesh.uvs.length; i+=2) {
        uvs.push(
            mesh.uvs[i+0],
            mesh.uvs[i+1],
            0.5,
            0.5
        );
    }
    uvs.push(
        0.0,1.0, 100, 0,
        0.0,0.0, 100, 0,
        1.0,1.0, 100, 0,

        1.0,1.0, 100, 0,
        1.0,0.0, 100, 0,
        0.0,0.0, 100, 0
    );


    var indexes = [];
    for (let i = 0; i < mesh.indexes.length; i++) {
        indexes.push( mesh.indexes[i] );
    }
    indexes.push(
        mesh.maxIndex + 1,
        mesh.maxIndex + 2,
        mesh.maxIndex + 3,

        mesh.maxIndex + 4,
        mesh.maxIndex + 5,
        mesh.maxIndex + 6
    );



    scene.positions = new Float32Array(positions); 
    scene.normals = new Float32Array(normals); 
    scene.uvs = new Float32Array(uvs); 
    scene.indexes = new Uint32Array(indexes); 

    return scene;
}

var vertexShader = `#version 300 es

layout(std140) uniform;

layout(location=0) in vec4 aPosition;
layout(location=1) in vec4 aNormal;
layout(location=2) in vec4 aUV;

uniform Matrices {
    mat4 uPerspective;
    mat4 uModel;
    mat4 uView;
};

out vec4 vPosition;
out vec4 vNormal;
out vec4 vUV;
out mat4 vViewMatrix;

void main() {
    vPosition = uView * uModel * aPosition;
    vNormal = uView * uModel * vec4(aNormal.xyz, 0.0);
    vUV = aUV;
    gl_Position = uPerspective * uView * uModel * aPosition;
    vViewMatrix = uView * uModel;
}`;

 
var fragmentShader = `#version 300 es
precision highp float;

in mat4 vViewMatrix;
in vec4 vPosition;
in vec4 vNormal; 
in vec4 vUV;

uniform mat4 uInvView;
uniform vec3 uCameraPosition;
uniform vec4 uGUIcontrols;

uniform samplerCube uEnvMap;
uniform sampler2D uLUT;

uniform sampler2D uAlbedo;
uniform sampler2D uRoughness;

uniform sampler2D uAlbedoPlane;
uniform sampler2D uNormalPlane;
uniform sampler2D uAOPlane;
uniform sampler2D uAOCar;


layout(location=0) out vec4 fragPosition;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragColor; 
layout(location=3) out vec4 fragMaterial; 












const float PI = 3.14159265359;
const float envMapIntensity = 2.8;







// random & noise functions

float rand(float n) {
    return fract(sin(n) * 43758.5453123);
}

float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(float p){
	float fl = floor(p);
  float fc = fract(p);
	return mix(rand(fl), rand(fl + 1.0), fc);
}
	
float noise(vec2 n) {
	const vec2 d = vec2(0.0, 1.0);
  vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
	return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

// random & noise functions - END
















float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a = roughness*roughness;
    float a2 = a*a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float nom   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    #ifdef MEDIUMP_PRECISION
        nom = max(nom,   0.0002);
        denom = max(denom, 0.000075);
    #endif

    return nom / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

vec3 FresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);  // era 5.0
} 

vec3 getPrefilteredColor(vec3 R, float roughness) {
    const float MAX_REFLECTION_LOD = 8.0;
    return texture(uEnvMap, R, roughness * MAX_REFLECTION_LOD).rgb;
}





void main() {

    vec3 position = (uInvView * vec4(vPosition.xyz, 1.0)).xyz;
    float roughness = 1.0 - texture(uRoughness, vUV.st).x; 
    vec4 material       = vec4(roughness, 1.0 - roughness, 0.0, 1.0);
    vec3 normal   = (uInvView * vec4(vNormal.xyz, 0.0)).xyz;
    vec4 albedo   = texture(uAlbedo, vUV.st);




    float noiseres =  noise(vUV.st * 10.0 + vec2(8.3 + uGUIcontrols.x, 6.0 + uGUIcontrols.y)) * 0.8;
    noiseres       += noise(vUV.st * 15.0) * 0.1;
    noiseres       += noise(vUV.st * 60.0) * 0.06;
    noiseres       += noise(vUV.st * 150.0) * 0.06;
    noiseres       += noise(vUV.st * 280.0) * 0.045;
    noiseres       += noise(vUV.st * 400.0) * 0.03;
    if(noiseres < 0.5) noiseres = pow(noiseres * 2.0, 1.2) * 0.5; 
    if(noiseres > 0.5) noiseres = pow(noiseres * 2.0, 1.0) * 0.5; 

    // fragColor = vec4(noiseres, 0.0, 0.0, 1.0);
    // return;



    // if shading the plane
    if (vUV.z > 99.0) { 
        // material = vec4(0.5, 0.8, 0.0, 1.0);
        material = vec4(0.5, 0.0, 0.0, 1.0);
        albedo   = texture(uAlbedoPlane, mod(vUV.st * 13.0, 1.0));
        vec3 normal2   = texture(uNormalPlane, mod(vUV.st * 13.0, 1.0)).xzy * 2.0 - 1.0;
        normal2.z = -normal2.z;

        normal = normalize(mix(normal, normal2, 0.2));
    }

    roughness = material.x;
    float metallic  = material.y;

    float frenelModeratedRoughness = roughness;
    if(vUV.z > 99.0) {
        frenelModeratedRoughness = roughness * ( 1.2 - noiseres) * 2.4;

        if( frenelModeratedRoughness < 0.7) {
            frenelModeratedRoughness = pow(frenelModeratedRoughness * (1.0 / 0.7), 4.0) * 0.7;
        }
        // frenelModeratedRoughness *= max(dot(N, V),  0.0) * 5.0;
        roughness = frenelModeratedRoughness + uGUIcontrols.z;
        metallic  = 1.0 - roughness;
    }
    
    
    vec3 albedoColor = albedo.rgb;
    albedoColor      = pow(albedoColor, vec3(2.2)); 


    vec3 F0 = vec3(0.04); 
    F0 = mix(F0, albedoColor, metallic);

    vec3 N = normalize(normal);
    vec3 V = normalize(uCameraPosition - position);
    vec3 R = reflect(-V, N); 


    vec3 Lo = vec3(0.0);
    vec3 F = FresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);

    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - metallic;	  

    vec3 irradiance = textureLod(uEnvMap, N, 10.0).rgb;
    vec3 diffuse    = irradiance * albedoColor;


    vec3 prefilteredColor = getPrefilteredColor(R, frenelModeratedRoughness);  
    // GAMMA CORRECTION
    prefilteredColor      = pow(prefilteredColor, vec3(2.2)); 
    // GAMMA CORRECTION
    vec2 envBRDF  = texture(uLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = prefilteredColor * (F * envBRDF.x + envBRDF.y);
    
   

    vec3 ambient = (kD * diffuse + specular) * envMapIntensity;               // * ao; 

    // if we're shading the plane
    if (vUV.z > 99.0) {
        ambient *= pow(texture(uAOPlane, vec2(1.0 - vUV.y -0.206, vUV.x - 0.22) * 1.76).x, 2.0);
    } else {
        ambient *= texture(uAOCar, vUV.st).x;
        ambient *= texture(uAlbedo, vUV.st).x * 1.25;
    }


    vec3 color = ambient + Lo;
    color = color / (color + vec3(1.0));   // HDR tonemapping
    color = pow(color, vec3(1.0/2.2));     // gamma correct






    fragPosition = vec4(vPosition.xyz, 1.0);
    fragNormal = vec4(normalize(vNormal.xyz), 1.0);
    fragColor = vec4(color, 1.0);


    roughness = 1.0 - texture(uRoughness, vUV.st).x; 
    fragMaterial = vec4(frenelModeratedRoughness, 1.0 - roughness, 0.0, 1.0);


    // if we're shading the plane
    if (vUV.z > 99.0) {
        fragMaterial.z = 100.0;    
        fragNormal = vec4(normalize(vViewMatrix * vec4(normal, 0.0)).xyz, 1.0);
        // fragColor = vec4(texture(uAOPlane, vec2(1.0 - vUV.y -0.206, vUV.x - 0.22) * 1.76).xxx, 1.0);
    }
}`;



export { initSceneProgram, drawScene, Program, gBuffer };