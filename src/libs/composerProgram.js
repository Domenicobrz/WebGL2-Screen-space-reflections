import { gl, sceneTextures } from "./main";
import { matrices, worldExtent, camera } from "./main";
import { getShader } from "./dependencies/shader";
import { Program as sceneProgram } from "./sceneProgram";
import { Program as SSRProgram } from "./SSRProgram";

var Program;
var vertexArray;
var frameBuffer;
function initComposerProgram() {
    Program = getShader(gl, vertexShader, fragmentShader);

    setAttributes();
    setUniforms();
}

function setAttributes() {
    vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    
        var quad = createQuad();

        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

    gl.bindVertexArray(null);
}

function setUniforms() {
    Program.positionBufferLocation = gl.getUniformLocation(Program, "uPositionBuffer");
    Program.normalBufferLocation = gl.getUniformLocation(Program, "uNormalBuffer");
    Program.uColorBufferLocation = gl.getUniformLocation(Program, "uColorBuffer");
    Program.uDepthBufferLocation = gl.getUniformLocation(Program, "uDepthBuffer");
    Program.uSSRBufferLocation = gl.getUniformLocation(Program, "uSSRBuffer");
    Program.uMaterialBufferLocation = gl.getUniformLocation(Program, "uMaterialBuffer");
   
    Program.uEnvMapLocation = gl.getUniformLocation(Program, "uEnvMap");
    Program.uLUTLocation = gl.getUniformLocation(Program, "uLUT");

    Program.uInvProjection = gl.getUniformLocation(Program, "uInvProjection");
    
    Program.uInvView = gl.getUniformLocation(Program, "uInvView");
    Program.uDepthBufferSize = gl.getUniformLocation(Program, "uDepthBufferSize");

    Program.uWorldExtent = gl.getUniformLocation(Program, "uWorldExtent");
    Program.uCameraPosition = gl.getUniformLocation(Program, "uCameraPosition");
}


function drawComposer(now, deltatime) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(Program);
    gl.bindVertexArray(vertexArray);


    gl.uniform1i(Program.positionBufferLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneProgram.positionTarget);
    
    gl.uniform1i(Program.normalBufferLocation, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sceneProgram.normalTarget);
    
    gl.uniform1i(Program.uColorBufferLocation, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, sceneProgram.colorTarget);

    gl.uniform1i(Program.uDepthBufferLocation, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, sceneProgram.depthTexture);

    gl.uniform1i(Program.uSSRBufferLocation, 4);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, SSRProgram.renderTargetTexture);

    gl.uniform1i(Program.uMaterialBufferLocation, 5);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, sceneProgram.materialTarget);


    gl.uniform1i(Program.uEnvMapLocation, 6);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, sceneTextures.cubeTexture);

    gl.uniform1i(Program.uLUTLocation, 7);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, sceneTextures.LUTTexture);



    gl.uniformMatrix4fv(Program.uInvProjection, false, matrices[3]);
    gl.uniformMatrix4fv(Program.uInvView, false, matrices[4]);

    gl.uniform2f(Program.uDepthBufferSize, innerWidth, innerHeight);
    gl.uniform3f(Program.uWorldExtent, worldExtent.x, worldExtent.y, worldExtent.z);
    gl.uniform3f(Program.uCameraPosition, camera.pos[0], camera.pos[1], camera.pos[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);


    gl.enable(gl.DEPTH_TEST);
}




function createQuad() {
    var quad = new Float32Array([
        -1,-1, 0,1,
        -1,+1, 0,1,
        +1,-1, 0,1,
 
        +1,-1, 0,1,
        -1,+1, 0,1,
        +1,+1, 0,1,
    ]);

    return quad;
}

var vertexShader = `#version 300 es

layout(std140) uniform;

layout(location=0) in vec4 aPosition;

out vec2 vUV;

uniform mat4 uInvProjection;

void main() {
    gl_Position = aPosition;
    vUV         = aPosition.xy * 0.5 + 0.5;
}`;


var fragmentShader = `#version 300 es

precision highp float;

in vec2 vUV;


uniform sampler2D uPositionBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uColorBuffer;
uniform sampler2D uDepthBuffer;
uniform sampler2D uSSRBuffer;
uniform sampler2D uMaterialBuffer;

uniform samplerCube uEnvMap;
uniform sampler2D uLUT;

uniform vec2 uDepthBufferSize;

uniform vec3 uCameraPosition;  // as half world width and half world height    AND the far plane
uniform vec3 uWorldExtent;  // as half world width and half world height    AND the far plane
uniform mat4 uInvView;

out vec4 fragColor;


void main() {


    vec3 position = (uInvView * texture(uPositionBuffer, vUV)).xyz;
    vec4 material = texture(uMaterialBuffer, vUV);
    vec3 normal   = (uInvView * vec4(texture(uNormalBuffer, vUV).xyz, 0.0)).xyz;
    vec4 depth    = texture(uDepthBuffer, vUV);
    vec4 albedo   = texture(uColorBuffer, vUV);
    vec4 ssr      = texture(uSSRBuffer, vUV);




    vec4 color = albedo;

    if(ssr.x != 0.0 && material.z > 90.0) {
        float dotNV = ssr.w;
        float distanceTraveled = ssr.z;
        float miplevel = distanceTraveled * 0.2;
        vec4 reflectedColor = texture(uColorBuffer, ssr.xy, miplevel);

        // float dotFade = 1.0 - pow(dotNV, 1.0);
        float viewFade = 1.0 - pow(distanceTraveled, 1.2) * 0.047;
        viewFade = max(viewFade, 0.0);
        color = mix(color, reflectedColor, /*viewFade * */ max((1.0 - material.x), 0.0));
    }




    fragColor = vec4(color.xyz, 1.0);
    // fragColor = vec4(ssr.xy, 0.0, 1.0);
    // fragColor = vec4(specular.xyz, 1.0);
}`;



export { initComposerProgram, drawComposer };