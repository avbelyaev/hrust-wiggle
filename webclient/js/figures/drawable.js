/**
 * Created by anthony on 04.02.2018.
 */

const DRAWABLES = Object.freeze({
    FIGURE: "figure",
    GRID: "grid",
    AXIS: "axis",
    CROPPER: "cropper"
});

class Drawable {
    constructor(positions, colors, gl, vsSource, fsSource, id, type) {
        if (!id) {
            throw new Error('Drawable id is null or empty');
        }

        this.id = `${id}_${getRandomInt(100000, 999999)}`;
        this.gl = gl;
        this.vsSource = vsSource;
        this.fsSource = fsSource;

        this.positions = positions.slice();
        this.worldPositions = positions.slice();
        this.colors = colors;

        // args for further model matrix creation
        this.movable = true;
        this.translationVec = [0, 0, 0];
        this.scaleVec = [1, 1, 1];
        this.rotationVec = [0, 0, 0];

        this.type = type;
        this.subtype = null; // to distinguish croppers

        this.visible = true;

        // only for objects made of triangles
        if (DRAWABLES.FIGURE === this.type || DRAWABLES.CROPPER === this.type) {
            // update world positions -> vertices -> triangles -> normals
            this.vertices = reduceArrayToTriples(this.worldPositions);
            this.triangles = reduceArrayToTriples(this.vertices);
            this.normals = [];

            this.updateFigure(); // fills normals

            // provide light
            this.lightingNormals = this.__spreadNormalsToEachPosition(this.normals);
        }
    }

    draw() {
        Drawable.__throwNotImplementedError();
    }

    scaleBy(scaleCoefficient) {
        // scale by all axes
        const scale = parseFloat(scaleCoefficient);
        this.scaleVec = [scale, scale, scale];
    }

    translateByX(additionalX) {
        this.translationVec[0] += parseFloat(additionalX);
    }

    translateByY(additionalY) {
        this.translationVec[1] += parseFloat(additionalY);
    }

    translateByZ(additionalZ) {
        this.translationVec[2] += parseFloat(additionalZ);
    }

    rotateBy(rotationDegreeVec, rotationPoint) {
        this.rotationVec = rotationDegreeVec
            .map(angleDegree => degToRad(parseFloat(angleDegree)));
    }

    updateFigure() {
        log('updating figure');
        this.__updateNormals();

        // update using reevaluated world positions
        this.__updateVertices();
        this.__updateTriangles();
    }

    init() {
        log(`init Drawable ${this.id}`);
        this.__initProgram();
        this.__initBuffers();
        this.__initShaderArgLocations();
    }

    __initProgram() {
        // log('initProgram');
        this.program = initShaderProgram(this.gl, this.vsSource, this.fsSource);
    }

    __initBuffers() {
        // log('initBuffers');

        const posNumComponents = 3;
        // vertices
        this.positionBufferInfo = createBufferInfo(
            this.gl, new Float32Array(this.positions), posNumComponents, gl.FLOAT, false);

        // colors
        this.colorBufferInfo = createBufferInfo(
            this.gl, new Uint8Array(this.colors), posNumComponents, gl.UNSIGNED_BYTE, true);

        const numElements = countNumElem(this.positions, posNumComponents);
        checkAgainstColors(numElements, this.colors);
        this.numElements = numElements;

        // normals
        this.normalBufferInfo = createBufferInfo(
            this.gl, new Float32Array(this.lightingNormals), posNumComponents, gl.FLOAT, false);
    }

    __initShaderArgLocations() {
        // log('initShaderArgLocations');

        this.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.program, 'aPosition'),
            vertexColor: this.gl.getAttribLocation(this.program, 'aColor'),
            vertexNormal: this.gl.getAttribLocation(this.program, 'aNormal')
        };
        this.uniformLocations = {
            uModel: this.gl.getUniformLocation(this.program, 'uModel'),
            uView: this.gl.getUniformLocation(this.program, 'uView'),
            uProjection: this.gl.getUniformLocation(this.program, 'uProjection'),
            uReverseLightDirection: this.gl.getUniformLocation(this.program, "uReverseLightDirection"),
            uWorldInverseTranspose: this.gl.getUniformLocation(this.program, "uWorldInverseTranspose")
        };
    }

    /**
     * all matrices are updated here to render object relatively to world+camera+frustum
     */
    __updateMatrices() {
        this.mModel = makeModelMatrix(this.movable, this.scaleVec, this.translationVec, this.rotationVec);
        this.mView = makeViewMatrix();
        this.mProj = makeProjectionMatrix();
    }

    __updateVertices() {
        this.vertices = reduceArrayToTriples(this.worldPositions);
    }

    __updateTriangles() {
        this.triangles = reduceArrayToTriples(this.vertices);
    }

    /**
     * model matrix places object to the right place in the world.
     * => to know where the object is situated at the moment we have to update worldPositions on every change.
     * worldPositions are counted like this: position_row<vec4> * ModelMatrix<mat4>
     * FYI shader counts position like this: MVPMatrix<mat4> * position_col<vec4>
     */
    __updateWorldPositions() {
        this.__updateVertices();
        this.__updateTriangles();

        const modelMatrix = makeModelMatrix(true, this.scaleVec, this.translationVec, this.rotationVec);

        this.worldPositions = new Array(this.positions.length);
        let j = 0;
        this.vertices.forEach(vertex => {
            const originPosition = vec4.fromValues(vertex[0], vertex[1], vertex[2], 1);

            const positionInTheWorld = multiplyVec4ByMat4(originPosition, modelMatrix);

            this.worldPositions[j++] = positionInTheWorld[0];
            this.worldPositions[j++] = positionInTheWorld[1];
            this.worldPositions[j++] = positionInTheWorld[2];
        });
    }

    __updateNormals() {
        this.__updateWorldPositions();

        this.normals = new Array(Math.round(this.positions.length / 9));
        let j = 0;
        this.triangles.forEach(triangle => {
            this.normals[j++] = countNormal(triangle[0], triangle[1], triangle[2]);
        });

        return this.normals;
    }

    __spreadNormalsToEachPosition(normals) {
        const lightingNormals = [];
        const triangleNum = this.triangles.length;
        let  i = 0;
        for (let j = 0; j < triangleNum; j++) {
            lightingNormals.push(...normals[i]);
            lightingNormals.push(...normals[i]);
            lightingNormals.push(...normals[i]);
            i++;
        }
        return lightingNormals;
    }

    static __throwNotImplementedError() {
        throw new TypeError('Method is not implemented!');
    }
}
