import { gl } from "./main";
import { matrices, worldExtent } from "./main";
import { getShader } from "./dependencies/shader";
import { Program as sceneProgram } from "./sceneProgram";

var Program;
var vertexArray;
var frameBuffer;
function initSSRProgram() {
    Program = getShader(gl, vertexShader, fragmentShader);

    setAttributes();
    setUniforms();
    setFrameBuffer();
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
    Program.uInvProjection = gl.getUniformLocation(Program, "uInvProjection");
    
    Program.uPerspective = gl.getUniformLocation(Program, "uPerspective");
    Program.uDepthBufferSize = gl.getUniformLocation(Program, "uDepthBufferSize");

    Program.uWorldExtent = gl.getUniformLocation(Program, "uWorldExtent");
}

function setFrameBuffer() {
    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.activeTexture(gl.TEXTURE0);

    Program.renderTargetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, Program.renderTargetTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Program.renderTargetTexture, 0);




    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function drawSSR(now, deltatime) {
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
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


    gl.uniformMatrix4fv(Program.uInvProjection, false, matrices[3]);
    gl.uniformMatrix4fv(Program.uPerspective, false, matrices[0]);

    gl.uniform2f(Program.uDepthBufferSize, innerWidth, innerHeight);
    gl.uniform3f(Program.uWorldExtent, worldExtent.x, worldExtent.y, worldExtent.z);

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

out vec4 vPosition;
out vec3 vViewRay;
out vec2 vUV;
out float vFarDepth;

uniform mat4 uInvProjection;

void main() {
    vPosition   = aPosition;
    gl_Position = aPosition;
    vUV         = aPosition.xy * 0.5 + 0.5;

    //                                               remember that in NDC +z points forward into the screen
    vec4 tb1    = uInvProjection * vec4(aPosition.xy, +1.0, 1.0);
    // reapplying perspective division 
    vViewRay    = tb1.xyz / tb1.w;

    // DEFINING Z-DEPTH AS A POSITIVE VALUE
    vFarDepth   = -vViewRay.z;    
    vViewRay    = normalize(vViewRay);  
}`;





var distanceSquared = `
float distanceSquaredv2(vec2 P1, vec2 P2) {
    vec2 diff = P2 - P1;
    return diff.x * diff.x + diff.y * diff.y;
}`;

var linearizeDepthFunc = `
float getLinearDepth(vec4 position) {
    return      -position.z / vFarDepth;
}`;

var viewToNDC = `
vec4 viewToNDC(vec4 position) {
    vec4 hs = uPerspective * position;
    return hs / hs.w;
}`;


var lineSegmentsIntersection = `
vec2 lineSegmentsIntersection(vec2 A, vec2 B, vec2 C, vec2 D) {
    float r = (      (A.y - C.y) * (D.x - C.x) - (A.x - C.x) * (D.y - C.y)     )  /
              (      (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x)     );

    return A + r * (B - A);
}`;

var scaleLengthAgainstViewFrustum = `
vec3 scaleLengthAgainstViewFrustum(vec3 origin, vec3 endpoint) {

    vec3 endPoint2 = endpoint;
    vec4 endPointNDC = viewToNDC(vec4(endPoint2, 1.0));
    
    if(abs(endPointNDC.y) > 1.0) {
        vec2 A = origin.zy;
        vec2 B = endPoint2.zy;
        vec2 C = vec2(0.0);
        vec2 D = vec2(uWorldExtent.z, uWorldExtent.y);

        if(endPointNDC.y < 0.0)
            D.y = -uWorldExtent.y;

        vec2 intersection = lineSegmentsIntersection(A, B, C, D);
        endPoint2 *= (intersection.y / endPoint2.y);  
    }


    endPointNDC = viewToNDC(vec4(endPoint2, 1.0));


    if(abs(endPointNDC.x) > 1.0) {
        vec2 A = origin.zx;
        vec2 B = endPoint2.zx;
        vec2 C = vec2(0.0);
        vec2 D = vec2(uWorldExtent.z, uWorldExtent.x);

        if(endPointNDC.x < 0.0)
            D.y = -uWorldExtent.x;

        vec2 intersection = lineSegmentsIntersection(A, B, C, D);
        endPoint2 *= (intersection.x / endPoint2.x);  
    }

    return endPoint2;
}`;

    // var A = {x: 10, y: 0};
    // var B = {x: 14, y: 9};

    // var C = {x: 0, y: 0};
    // var D = {x: 14, y: 5};

    // var r = (      (A.y - C.y) * (D.x - C.x) - (A.x - C.x) * (D.y - C.y)     )  /
    //         (      (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x)     );

    // var Px = A.x + r * (B.x-A.x);
    // var Py = A.y + r * (B.y-A.y);

var traceRay = `
bool traceScreenSpaceRay(
    // Camera-space ray origin, which must be within the view volume
    vec3 orig,
    // Unit length camera-space ray direction
    vec3 dir,
    // Pixel coordinates of the first intersection with the scene
    out vec2 hitPixel,
    // Camera space location of the ray hit
    out vec3 hitPoint)
{
    // float rayLength = dir.z < 0.0 ? cb_farPlaneZ * abs(dir.z) + orig.z : 
    //                                 abs(orig.z) * abs(dir.z); 
    
    // vec3 endPoint  = orig + dir * rayLength;
    // endPoint = scaleLengthAgainstViewFrustum(orig, endPoint);

    // RAYLENGTH E' ZERO SE LA DIREZIONE RIFLESSA E' VERSO +Z
    // hitPoint = vec3(rayLength / 50.0);


    



    float step = 0.115;
    for(float i = 1.0; i <= 80.0; i++) {
        vec3 samplePoint = orig + dir * step * i;

        vec4 PS = viewToNDC(vec4(samplePoint, 1.0));
        // abs because every depth is negative
        float depthAtPS = abs(   texture(uPositionBuffer, PS.xy * 0.5 + 0.5).z  );
        if (depthAtPS < 0.001) depthAtPS = uWorldExtent.z;

        // if (i > 79.0) { 
        //     hitPoint.x = length(samplePoint - orig);
        //     hitPixel.xy = PS.xy * 0.5 + 0.5; // vec2(hitPoint.x);
        //     return true;
        // }

        // if we have an intersection...
        // abs because every depth is negative
        if (depthAtPS < abs(samplePoint.z * 0.98)) {


            // // attempt a linear search
            // // attempt a linear search
            // // attempt a linear search
            // vec3 lo = orig + dir * step * (i-1.0);
            // vec3 hi = samplePoint;

            // for (float j = 0.0; j < 8.0; j++) {
            //     vec3 newEstimate = (lo + hi) / 2.0;
            //     vec4 nePS = viewToNDC(vec4(newEstimate, 1.0));
            //     float nedepthAtPS = abs(   texture(uPositionBuffer, nePS.xy * 0.5 + 0.5).z  );
                
            //     if( nedepthAtPS < abs(newEstimate.z) ) {
            //         hi = newEstimate;
            //     } else {
            //         lo = newEstimate;
            //     }
            // }

            // samplePoint = hi;
            // PS = viewToNDC(vec4(samplePoint, 1.0));
            // depthAtPS = abs(   texture(uPositionBuffer, PS.xy * 0.5 + 0.5).z  );
            // // attempt a linear search - END 
            // // attempt a linear search - END 
            // // attempt a linear search - END 










            // Trying to solve the z-cutoff problem ...            
            if (abs(orig.z) > depthAtPS) return false;
            
            // think about the following line.. if the difference in depth between the sample point and the hit point is
            // bigger than a certain (small) value we're not hitting the visible part of the face,
            // but something that's either a backface or anyway not visible on screen
            // since we're interested in showing the reflections only of the visible part of an object, we're
            // skipping the points behind/not visible of the object we're hitting
            // this way we solve the z-cutoff problem

            // see figure 1
            if (abs(samplePoint.z) - depthAtPS > objectsThickness) return false;
            // in this case I'm just skipping iteration since I want the i to go to the max loop iteration
            // so that we can instead sample the cubemap
            // if (abs(samplePoint.z) - depthAtPS > objectsThickness) continue;
            // Trying to solve the z-cutoff problem ... - END            



            if (i > 79.0) { return false; }
            if (depthAtPS > uWorldExtent.z) return false;
            if (abs(samplePoint.z) > uWorldExtent.z) return false;
            if (abs(samplePoint.x) > uWorldExtent.x) return false;
            if (abs(samplePoint.y) > uWorldExtent.y) return false;
            if (abs(PS.z) >= 1.0) return false;
            if (abs(PS.x) >= 1.0) return false;
            if (abs(PS.y) >= 1.0) return false;

            hitPoint.x = length(samplePoint - orig);
            


            hitPixel.xy = PS.xy * 0.5 + 0.5; // vec2(hitPoint.x);
            return true;
        }
    }

    return false;
}`;



var fragmentShader = `#version 300 es
precision highp float;

in vec4 vPosition;      // position of the quad used in the vertex shader
in vec2 vUV;
in vec3 vViewRay;       // normalized viewDir in viewSpace

// EXPRESSED AS A POSITIVE VALUE
in float vFarDepth;


uniform sampler2D uPositionBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uColorBuffer;
uniform sampler2D uDepthBuffer;

uniform vec2 uDepthBufferSize;


uniform vec3 uWorldExtent;  // as half world width and half world height    AND the far plane
uniform mat4 uPerspective;

out vec4 fragColor;



const float cb_maxDistance = 30000000.0;
const float cb_nearPlaneZ  = 0.0;
const float cb_farPlaneZ   = 50.0;
// if the first intersection found is at 1000000 z distance then the ray probably passed under that object
const float objectsThickness = 0.75;
const float cb_stride = 1.0;
const float cb_maxSteps = 20.0;
const float cb_zThickness = 0.00001;


` + distanceSquared + `
` + linearizeDepthFunc + `
` + lineSegmentsIntersection + `
` + viewToNDC + `
` + scaleLengthAgainstViewFrustum + `
` + traceRay + `



void main() {

    vec4 position = texture(uPositionBuffer, vUV);
    vec4 normal   = texture(uNormalBuffer, vUV);
    vec4 depth    = texture(uDepthBuffer, vUV);
    vec4 uv       = texture(uColorBuffer, vUV);



    if ( normal.xyz == vec3(0.0)) {
        fragColor = vec4(0, 0, 0, 1);
        return;
    }



    vec3 rayOriginVS    = position.xyz; // vViewRay * getLinearDepth(position);
    vec3 toPositionVS   = normalize(rayOriginVS);
    vec3 rayDirectionVS = normalize(reflect(toPositionVS, normal.xyz));



    float rDotV = dot(rayDirectionVS, toPositionVS);
    float vDotN = dot(toPositionVS, normal.xyz);


    vec2 hitPixel = vec2(0.0f, 0.0f);
    vec3 hitPoint = vec3(0.0f, 0.0f, 0.0f);


    bool intersection = traceScreenSpaceRay(rayOriginVS, rayDirectionVS, hitPixel, hitPoint);



    if (intersection) {
        fragColor = vec4(hitPixel, hitPoint.x, vDotN);
    } else { 
        fragColor = vec4(0.0);
    }
}`;



export { initSSRProgram, drawSSR, Program };