import { gl } from "./main";
import { matrices } from "./main";
import { getShader } from "./dependencies/shader";
import { Program as sceneProgram } from "./sceneProgram";

var Program;
var vertexArray;
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
    Program.uVBufferLocation = gl.getUniformLocation(Program, "uUVBuffer");
    Program.uDepthBufferLocation = gl.getUniformLocation(Program, "uDepthBuffer");
    Program.uInvProjection = gl.getUniformLocation(Program, "uInvProjection");
    
    Program.uPerspective = gl.getUniformLocation(Program, "uPerspective");
    Program.uDepthBufferSize = gl.getUniformLocation(Program, "uDepthBufferSize");
}


function drawComposer(now, deltatime) {
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
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
    
    gl.uniform1i(Program.uVBufferLocation, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, sceneProgram.uvTarget);

    gl.uniform1i(Program.uDepthBufferLocation, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, sceneProgram.depthTexture);


    gl.uniformMatrix4fv(Program.uInvProjection, false, matrices[3]);
    gl.uniformMatrix4fv(Program.uPerspective, false, matrices[0]);

    gl.uniform2f(Program.uDepthBufferSize, innerWidth, innerHeight);

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




var swap = `
void swap(inout float a, inout float b) {
    float t = a;
    a = b;
    b = t;
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

var viewToTextureSpace = `
vec2 viewToTextureSpace(vec4 position) {
    vec4 projected = uPerspective * position;
    projected /= projected.w;

    return projected.xy * 0.5 + 0.5;       
}`;

var viewToTextureSpaceHomogeneous = `
vec4 viewToTextureSpaceHomogeneous(vec4 position) {
    vec4 projected = uPerspective * position;
    // follows from the matrix I've seen in the comments
    projected.xy = projected.xy * 0.5 + 0.5 * projected.w;

    return projected;       
}`;

var intersectsDepthBuffer = `
bool intersectsDepthBuffer(float z, float minZ, float maxZ) {
    /*
     * Based on how far away from the camera the depth is,
     * adding a bit of extra thickness can help improve some
     * artifacts. Driving this value up too high can cause
     * artifacts of its own.
     */
    float depthScale = min(1.0f, z * cb_strideZCutoff);
    z += cb_zThickness + mix(0.0f, 2.0f, depthScale);
    return (maxZ >= z) && (minZ - cb_zThickness <= z);
}`;

var traceRay = `
bool traceScreenSpaceRay(
    // Camera-space ray origin, which must be within the view volume
    vec3 csOrig,
    // Unit length camera-space ray direction
    vec3 csDir,
    // Number between 0 and 1 for how far to bump the ray in stride units
    // to conceal banding artifacts. Not needed if stride == 1.
    float jitter,
    // Pixel coordinates of the first intersection with the scene
    out vec2 hitPixel,
    // Camera space location of the ray hit
    out vec3 hitPoint)
{

    float rayLength = ((csOrig.z + csDir.z * cb_maxDistance) < cb_nearPlaneZ) ?
                       (cb_nearPlaneZ - csOrig.z) / csDir.z : cb_maxDistance;
    vec3 csEndPoint = csOrig + csDir * rayLength;


    // adesso abbiamo il viewToTextureSpace come funzione che prende una posizione
    // devi continuare da qui

    vec4 H0 = viewToTextureSpaceHomogeneous(vec4(csOrig, 1.0f));
    H0.xy *= uDepthBufferSize;
    vec4 H1 = viewToTextureSpaceHomogeneous(vec4(csEndPoint, 1.0f));
    H1.xy *= uDepthBufferSize;

    float k0 = 1.0f / H0.w;
    float k1 = 1.0f / H1.w;

    // The interpolated homogeneous version of the camera-space points
    vec3 Q0 = csOrig * k0;
    vec3 Q1 = csEndPoint * k1;

    
    // Screen-space endpoints
    vec2 P0 = H0.xy * k0;
    vec2 P1 = H1.xy * k1;


    // If the line is degenerate, make it cover at least one pixel
    // to avoid handling zero-pixel extent as a special case later
    P1 += (distanceSquaredv2(P0, P1) < 0.0001f) ? vec2(0.01f, 0.01f) : vec2(0.0f);
    vec2 delta = P1 - P0;


    // Permute so that the primary iteration is in x to collapse
    // all quadrant-specific DDA cases later
    bool permute = false;
    if(abs(delta.x) < abs(delta.y)) {
        // This is a more-vertical line
        permute = true;
        delta = delta.yx;
        P0 = P0.yx;
        P1 = P1.yx;
    }


    float stepDir = sign(delta.x);
    float invdx = stepDir / delta.x;


    // Track the derivatives of Q and k
    vec3 dQ = (Q1 - Q0) * invdx;
    float dk = (k1 - k0) * invdx;
    vec2 dP = vec2(stepDir, delta.y * invdx);



    // Scale derivatives by the desired pixel stride and then
    // offset the starting values by the jitter fraction
    float strideScale = 1.0f - min(1.0f, csOrig.z * cb_strideZCutoff);
    float stride = 1.0f + strideScale * cb_stride;
    dP *= stride;
    dQ *= stride;
    dk *= stride;




    P0 += dP * jitter;
    Q0 += dQ * jitter;
    k0 += dk * jitter;



    // Slide P from P0 to P1, (now-homogeneous) Q from Q0 to Q1, k from k0 to k1
    vec4 PQk = vec4(P0, Q0.z, k0);
    vec4 dPQk = vec4(dP, dQ.z, dk);
    vec3 Q = Q0; 

    // Adjust end condition for iteration direction
    float end = P1.x * stepDir;




    float stepCount = 0.0f;
    float prevZMaxEstimate = csOrig.z;
    float rayZMin = prevZMaxEstimate;
    float rayZMax = prevZMaxEstimate;
    float sceneZMax = rayZMax + 100.0f;


    for(;
        ((PQk.x * stepDir) <= end) && (stepCount < cb_maxSteps) &&
        !intersectsDepthBuffer(sceneZMax, rayZMin, rayZMax) &&
        (sceneZMax != 0.0f);
        ++stepCount)
    {
        rayZMin = prevZMaxEstimate;
        rayZMax = (dPQk.z * 0.5f + PQk.z) / (dPQk.w * 0.5f + PQk.w);
        prevZMaxEstimate = rayZMax;
        if(rayZMin > rayZMax)
        {
            swap(rayZMin, rayZMax);
        }

        hitPixel = permute ? PQk.yx : PQk.xy;
        //      // You may need hitPixel.y = depthBufferSize.y - hitPixel.y; here if your vertical axis
        //      // is different than ours in screen space
        //      sceneZMax = linearDepthTexelFetch(depthBuffer, int2(hitPixel));
        

        hitPixel.y = uDepthBufferSize.y - hitPixel.y;
        // tengo conto che hitPixel è fra [0...texture size]
        sceneZMax = getLinearDepth(      texture(uPositionBuffer, hitPixel / uDepthBufferSize)     );

        PQk += dPQk;
    }

    // Advance Q based on the number of steps
    Q.xy += dQ.xy * stepCount;
    hitPoint = Q * (1.0f / PQk.w);


    hitPoint = vec3(sceneZMax);


    return intersectsDepthBuffer(sceneZMax, rayZMin, rayZMax);
}
`;



var fragmentShader = `#version 300 es
precision highp float;

in vec4 vPosition;      // position of the quad used in the vertex shader
in vec2 vUV;
in vec3 vViewRay;       // normalized viewDir in viewSpace

// EXPRESSED AS A POSITIVE VALUE
in float vFarDepth;


uniform sampler2D uPositionBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uUVBuffer;
uniform sampler2D uDepthBuffer;

uniform vec2 uDepthBufferSize;

uniform mat4 uPerspective;

out vec4 fragColor;



const float cb_maxDistance = 30.0;
const float cb_nearPlaneZ  = 0.5;
const float cb_strideZCutoff = 1.0;
const float cb_stride = 1.0;
const float cb_maxSteps = 20.0;
const float cb_zThickness = 0.00001;


` + distanceSquared + `
` + swap + `
` + linearizeDepthFunc + `
` + intersectsDepthBuffer + `
` + viewToTextureSpace + `
` + viewToTextureSpaceHomogeneous + `
` + traceRay + `



void main() {

    vec4 position = texture(uPositionBuffer, vUV);
    vec4 normal   = texture(uNormalBuffer, vUV);
    vec4 depth    = texture(uDepthBuffer, vUV);
    vec4 uv       = texture(uUVBuffer, vUV);



    if ( normal.xyz == vec3(0.0)) {
        fragColor = vec4(0, 0, 0, 1);
        return;
    }



    vec3 rayOriginVS    = position.xyz; // vViewRay * getLinearDepth(position);
    vec3 toPositionVS   = normalize(rayOriginVS);
    vec3 rayDirectionVS = normalize(reflect(toPositionVS, normal.xyz));


    float rDotV = dot(rayDirectionVS, toPositionVS);


    vec2 hitPixel = vec2(0.0f, 0.0f);
    vec3 hitPoint = vec3(0.0f, 0.0f, 0.0f);

    float jitter = cb_stride > 1.0f ? float(int(uDepthBufferSize.x + uDepthBufferSize.y) & 1) * 0.5f : 0.0f;


    bool intersection = traceScreenSpaceRay(rayOriginVS, rayDirectionVS, jitter, hitPixel, hitPoint);





    // tengo conto che hitPixel è fra [0...texture size]
    float hitdepth = getLinearDepth(      texture(uPositionBuffer, hitPixel / uDepthBufferSize)     );


    // move hit pixel from pixel position to UVs
    hitPixel *= vec2(1.0 / uDepthBufferSize.x, 1.0 / uDepthBufferSize.y);
    if(hitPixel.x > 1.0f || hitPixel.x < 0.0f || hitPixel.y > 1.0f || hitPixel.y < 0.0f)
    {
        intersection = false;
    }

    fragColor = vec4(hitPixel.xy, hitdepth, rDotV) * (intersection ? vec4(1.0f) : vec4(0.0f));





    // fragColor = mix(vec4(vec3(depth), 1.0) , vec4(hitPoint, 1.0),  0.5);
    // fragColor = vec4(hitPoint, 1.0);

    // if (intersection == true)
    //     fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // else
    //     fragColor = vec4(0.0, 0.0, 1.0, 1.0);
}`;



export { initComposerProgram, drawComposer };