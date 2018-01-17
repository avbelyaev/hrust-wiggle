
const TYPE_TRIANGLE = 'triangle';
const TYPE_LINE = 'line';

let gl, figures = [];


const logr = (text) => {
    const log = document.getElementById("logr");
    log.textContent += (text + "\n");
    console.log(text);
};

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;


const normalizeX = (posX) => {
    return (posX - gl.canvas.clientWidth / 2);
};

const normalizeY = (posY) => {
    return -(posY - gl.canvas.clientHeight / 2);
};

const handleMouseDown = (event) => {
    console.log("Down");

    mouseDown = true;
    lastMouseX = normalizeX(event.clientX);
    lastMouseY = normalizeY(event.clientY);
    console.log("lastX: " + lastMouseX + " lastY: " + lastMouseY);
};

const handleMouseUp = (event) => {
    console.log("Up");

    mouseDown = false;
    console.log("lastX: " + lastMouseX + " lastY: " + lastMouseY);
};

const handleMouseMove = (event) => {
    console.log("Move");

    if (!mouseDown) {
        return;
    }
    const newX = normalizeX(event.clientX);
    const newY = normalizeY(event.clientY);

    // const deltaX = newX - lastMouseX;
    // const deltaY = newY - lastMouseY;

    lastMouseX = newX;
    lastMouseY = newY;
};

const vsSource = `
    attribute vec2 aPosition;
    attribute vec3 aColor;
    
    uniform mat3 uMatrix;
    
    // varying vec3 fragColor;
    
    void main() {
        gl_Position = vec4((uMatrix * vec3(aPosition, 1.0)).xy, 0, 1);
      
        // pass color to fragment shader
        // fragColor = aColor;
    }
  `;

const fsSource = `
    precision highp float;
    
    // varying vec3 fragColor;

    void main() {
      // gl_FragColor = vec4(fragColor, 1.0);
      gl_FragColor = vec4(1.0, 0.0, 0, 0);
    }
  `;

const translation = [100, 100];
const rotation = [0, 1];
let angleInRadians = 0;
let scale = 1;

const changeRange = () => {
    const rngX = document.getElementById("rngX");
    translation[0] = rngX.value;

    const rngY = document.getElementById("rngY");
    translation[1] = rngY.value;

    const rngA = document.getElementById("rngA");
    angleInRadians = rngA.value * Math.PI / 180;
    rotation[0] = Math.sin(angleInRadians);
    rotation[1] = Math.cos(angleInRadians);

    const rngS = document.getElementById("rngS");
    scale = rngS.value;
};

function initMatrices(width, height) {
    // const m3 = {
    //     projection: function (width, height) {
    //         return [
    //             2 / width, 0, 0,
    //             0, -2 / height, 0,
    //             -1, 1, 1
    //         ];
    //     },
    //     translation: function (x, y) {
    //         return [
    //             1, 0, 0,
    //             0, 1, 0,
    //             x, y, 1
    //         ];
    //     }
    // };
    const identity = mat3.create();
    const projection = mat3.projection(identity, width, height);
    const translated = mat3.translate(projection, projection, [translation[0], translation[1]]);
    const rotated = mat3.rotate(translated, translated, -angleInRadians);
    const scaled = mat3.scale(rotated, rotated, [scale, scale]);

    return scaled;
}

function drawScene() {

    const w = gl.canvas.width;
    const h = gl.canvas.height;

    const matrix = initMatrices(w, h);

    // gl.viewport(0, 0, w, h);

    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    figures.forEach((f) => {
        const figure = f.figureInfo;

        const programInfo = figure.programInfo;
        gl.useProgram(programInfo.program);

        // vertices
        enableAndBindBuffer(programInfo.attribLocations.vertexPosition, figure.positionBufferInfo);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);


        // colors
        // bindBufferToAttribute(programInfo.attribLocations.vertexColors, figure.colorBufferInfo);


        //TODO set buffers and attribs

        // set uniforms
        gl.uniformMatrix3fv(programInfo.uniformLocations.uMatrix, false, matrix);

        gl.drawArrays(figure.drawMode, 0, figure.numElements);
    });

    requestAnimationFrame(drawScene);
}


function main() {
    gl = initGL();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    // const axisX = new Line(gl, [-400, 0], [400, 0], [1, 0, 0]);
    // axisX.setShaderSource(vsSource, fsSource);
    // axisX.initBuffer();
    // figures.push(axisX);
    //
    // const axisY = new Line(gl, [0, -400], [0, 400], [0, 0, 1]);
    // axisY.setShaderSource(vsSource, fsSource);
    // axisY.initBuffer();
    // figures.push(axisY);

    const triangle = new Triangle(gl);
    triangle.setShaderSource(vsSource, fsSource);
    triangle.initBuffer();
    figures.push(triangle);


    requestAnimationFrame(drawScene);
}

window.addEventListener("DOMContentLoaded", () => {
    logr("DOM content loaded");
    try {
        main();

    } catch (e) {
        logr('Error: ' + e.message + '\n' + e.stack);
    }
}, false);

