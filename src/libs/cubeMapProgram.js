import { gl } from "./main";
import { matrices, worldExtent, sceneTextures } from "./main";
import { getShader } from "./dependencies/shader";
import { gBuffer } from "./sceneProgram";

var Program;

function initCubeMapProgram() {

    Program = getShader(gl, cubemapVertex, cubemapFragment);

    Program.aPosition = gl.getAttribLocation(Program, "aPosition");

    Program.uPerspective = gl.getUniformLocation(Program, "uPerspective");
    Program.uModel = gl.getUniformLocation(Program, "uModel");
    Program.uView = gl.getUniformLocation(Program, "uView");
    
    Program.uTexture = gl.getUniformLocation(Program, "uTexture");

    var cubevertices = [
        -1.0,  1.0, -1.0, 1,
        -1.0, -1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,
         1.0,  1.0, -1.0, 1,
        -1.0,  1.0, -1.0, 1,

        -1.0, -1.0,  1.0, 1,
        -1.0, -1.0, -1.0, 1,
        -1.0,  1.0, -1.0, 1,
        -1.0,  1.0, -1.0, 1,
        -1.0,  1.0,  1.0, 1,
        -1.0, -1.0,  1.0, 1,

         1.0, -1.0, -1.0, 1,
         1.0, -1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,

        -1.0, -1.0,  1.0, 1,
        -1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0, -1.0,  1.0, 1,
        -1.0, -1.0,  1.0, 1,

        -1.0,  1.0, -1.0, 1,
         1.0,  1.0, -1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
        -1.0,  1.0,  1.0, 1,
        -1.0,  1.0, -1.0, 1,

        -1.0, -1.0, -1.0, 1,
        -1.0, -1.0,  1.0, 1,
         1.0, -1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,
        -1.0, -1.0,  1.0, 1,
         1.0, -1.0,  1.0, 1
    ];

    Program.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubevertices), gl.STATIC_DRAW);
}



function drawCubeMap(now, deltatime) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    gl.useProgram(Program);
    gl.bindBuffer(gl.ARRAY_BUFFER, Program.vertexBuffer);

    gl.enableVertexAttribArray(Program.aPosition);
    gl.enableVertexAttribArray(Program.aColor);

    gl.vertexAttribPointer(Program.aPosition, 4, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(Program.uPerspective, false, matrices[0]);
    gl.uniformMatrix4fv(Program.uModel, false,       matrices[1]);
    gl.uniformMatrix4fv(Program.uView, false,        matrices[2]);


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, sceneTextures.cubeTexture);
    gl.uniform1i(Program.uTexture, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.enable(gl.DEPTH_TEST);   
    gl.depthMask(true);

}


const cubemapVertex = `#version 300 es
layout(std140) uniform;

layout(location=0) in vec4 aPosition;

uniform mat4 uPerspective;
uniform mat4 uModel;
uniform mat4 uView;

out vec4 Position;

void main() {
    gl_Position = uPerspective * mat4(mat3(uView)) * uModel * aPosition;

    Position = uModel * aPosition;
}`;

const cubemapFragment = `#version 300 es
precision highp float;

in vec4 Position;

uniform samplerCube uTexture;

layout(location=0) out vec4 fragPosition;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragColor; 
layout(location=3) out vec4 fragMaterial; 

void main() {
    vec4 col = vec4(texture(uTexture, Position.xyz).rgb, 1.0);
    fragColor = col;
    fragNormal = vec4(0.0);
    fragMaterial = vec4(0.0);
    fragPosition = vec4(0.0);
}`;


export { drawCubeMap, initCubeMapProgram, Program };