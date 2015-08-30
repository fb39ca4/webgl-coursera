(function() {

var Engine = function() {
    this.gl = null;
    this.glh = null;
    this.canvas = null;
    this.models = {};
    this.camera = new Camera();
    this.meshes = {};
    this.shaders = {};
    this.backgroundColor = [0,0,0,1];
    this.tempMatrix = mat4.create();
    this.needsRender = true;
    this.screenWidth = null;
    this.screenHeight = null;
    this.keyboard = null;//new Keyboard();
    this.mouse = new Mouse();
    this.lastRenderLoopTimestamp = null;
    this.renderFramebuffer = null;
    this.selectionFramebuffer = null;
    this.selectionFramebufferTexture = null;
    this.selectionFramebufferDepth = null;
    this.selectionFramebufferIsValid = false;
    this.selectionFramebufferArray = null;
    
    this.lights = [];

    this.gestures = null;

    this.selected = null;
    this.hover = null;

    this.mode = "select";

    var ua = navigator.userAgent.toLowerCase();
    this.isFirefox = ((ua.indexOf("gecko") >= 0) && (ua.indexOf("trident") < 0) && (ua.indexOf("webkit") < 0))
    this.isIE = (ua.indexOf("trident") >= 0);
}

Engine.prototype.init = function(canvas, options) {
    this.canvas = canvas;
    this.glh = new GlHelper(canvas, options);
    this.gl = this.glh.gl;
    this.keyboard = new Keyboard(null);
    this.meshes.triangle = this.createMesh(triangleVertexData, 4 * 4);
    this.meshes.axes = this.createMesh(axesVertexData, 4*8);
    this.meshes.sphere = this.createMesh(sphereVertexData, 4*7);
    this.meshes.cylinder = this.createMesh(cylinderVertexData, 4*7);
    this.meshes.cone = this.createMesh(coneVertexData, 4*7);
    this.shaders.flat = this.createShader("flat-vertex", "flat-fragment", ["uCamera", "uModel", "uColor"], ["aPos"]);
    this.shaders.colored = this.createShader("colored-vertex", "colored-fragment", ["uCamera", "uModel"], ["aPos", "aColor"]);
    this.shaders.shaded = this.createShader("shaded-vertex", "shaded-fragment", ["uCamera", "uModel", "uColor", "uLight0Pos", "uLight0Color", "uLight1Pos", "uLight1Color"], ["aPos", "aNormal"]);

    var gl = this.gl;
    this.selectionFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.selectionFramebuffer);
    this.selectionFramebufferTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.selectionFramebufferTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.selectionFramebufferTexture, 0);
    this.selectionFramebufferDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.selectionFramebufferDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.selectionFramebufferDepth);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.selectionFramebufferArray = new Uint8Array(4 * this.canvas.width * this.canvas.height);

    this.addModel(new Model({
        pos: vec3.fromValues(0,0,0),
        //rot: quat.setAxisAngle(quat.create(), vec3.fromValues(0,0,1), Math.PI / 4),
        scale: vec3.fromValues(10000000000, 10000000000, 10000000000),
        mesh: this.meshes.axes,
        primitiveType: "LINES",
        shading: "FLAT_VERTEX",
    }));
    this.addModel(new Model({
        pos: vec3.fromValues(0,0,0),
        //rot: quat.setAxisAngle(quat.create(), vec3.fromValues(0,0,1), Math.PI / 4),
        //scale: vec3.fromValues(2,1,1),
        mesh: this.meshes.sphere,
        primitiveType: "TRIANGLES",
        shading: "SHADED",
    }));
    this.addModel(new Model({
        pos: vec3.fromValues(3,0,0),
        //rot: quat.setAxisAngle(quat.create(), vec3.fromValues(0,0,1), Math.PI / 4),
        //scale: vec3.fromValues(2,1,1),
        mesh: this.meshes.cylinder,
        primitiveType: "TRIANGLE_STRIP",
        shading: "SHADED",
    }));
    this.addModel(new Model({
        pos: vec3.fromValues(-3,0,0),
        //rot: quat.setAxisAngle(quat.create(), vec3.fromValues(0,0,1), Math.PI / 4),
        //scale: vec3.fromValues(2,1,1),
        mesh: this.meshes.cone,
        primitiveType: "TRIANGLE_STRIP",
        shading: "SHADED",
    }));
    
    this.lights.push({
        enabled: true,
        posX: "0",
        posY: "5 * cos(t)",
        posZ: "5 * sin(t)",
        currentPos: vec3.create(),
        color: vec3.fromValues(1,1,1),
        intensity: 10,
        timeOffset: Date.now(),
    });
    this.lights.push({
        enabled: false,
        posX: "0",
        posY: "0",
        posZ: "0",
        currentPos: vec3.create(),
        color: vec3.fromValues(0,0,0),
        intensity: 1,
        timeOffset: Date.now(),
    });

    this.gestureController = new Gestures(canvas);
    this.gestureController.onGesture = this.onGesture.bind(this);
    this.gestures = [];

    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));

    this.renderLoop();
}

Engine.prototype.addModel = function(model) {
    this.models[model.id] = model;
}

Engine.prototype.removeModel = function(id) {
    delete this.models[id];
}

Engine.prototype.onGesture = function(gesture) {
    this.gestures.push(gesture);
    console.log(gesture.type);
    if (gesture.type == "pinch") {
        var model = this.models[this.getSelectionBuffer(gesture.originX, gesture.originY)];
        if (model === this.selected) {
            gesture.action = "rotate";
            gesture.target = model;
        }
        else {
            gesture.action = "rotate";
            gesture.target = null;
        }
    }
    else {
        if (gesture.type == "swipe") {
            var model = this.models[this.getSelectionBuffer(gesture.originX, gesture.originY)];
            if (model === this.selected) {
                gesture.action = "translate";
                gesture.target = model;
            }
            else {
                gesture.action = "translate";
                gesture.target = null;
            }
        }
        else if (gesture.type == "hold") {
            if (this.mode === "select") {
                var model = this.models[this.getSelectionBuffer(gesture.originX, gesture.originY)];
                if (this.selected !== model) this.selected = model;
                else this.selected = null;
            }
            else if (this.mode === "delete") {
                var model = this.models[this.getSelectionBuffer(gesture.originX, gesture.originY)];
                this.removeModel(model.id);
            }
            else {
                var model;
                if (this.mode == "sphere") {
                    model = new Model({mesh: this.meshes.sphere, primitiveType: "TRIANGLES"});
                }
                else if (this.mode == "cone") {
                    model = new Model({mesh: this.meshes.cone, primitiveType: "TRIANGLE_STRIP"});
                }
                else if (this.mode == "cylinder") {
                    model = new Model({mesh: this.meshes.cylinder, primitiveType: "TRIANGLE_STRIP"});
                }
                else return;
                vec3.scaleAndAdd(model.pos, this.camera.pos, this.camera.viewDir, 20);
                this.selected = model
                this.addModel(model);
                gesture.action = "translate"
                gesture.target = model;
            }
        }
    }
}

Engine.prototype.createMesh = function(data, vertexSizeBytes) {
    var gl = this.gl;
    mesh = gl.createBuffer();
    mesh.bytesSize = data.length * data.BYTES_PER_ELEMENT;
    mesh.numVertices = Math.floor(mesh.bytesSize / vertexSizeBytes);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return mesh;
}

Engine.prototype.createShader = function(vertexId, fragmentId, uniforms, attributes) {
    var glh = this.glh;
    var vertexShader = glh.loadShaderDOM(vertexId);
    var fragmentShader = glh.loadShaderDOM(fragmentId);
    var shaderProgram = glh.linkShaderProgram(vertexShader, fragmentShader);
    glh.readUniforms(shaderProgram, uniforms);
    glh.readVertexAttribs(shaderProgram, attributes);
    glh.enableVertexAttribArray(shaderProgram);
    return shaderProgram;
}

Engine.prototype.queueRender = function() {
    this.needsRender = true;
}


Engine.prototype.handleKeyboardInput = function(dt) {
    var moveDist = 5 * dt / 1000;
    var rotateAngle = 2 * dt / 1000;
    var rotateOrigin = (this.keyboard[16]) ? zeroVec3 : null;
    /*if (this.keyboard[87]) {
        this.camera.translate(this.camera.viewUp, moveDist);
        this.queueRender();
    }
    if (this.keyboard[83]) {
        this.camera.translate(this.camera.viewUp, -moveDist);
        this.queueRender();
    }
    if (this.keyboard[68]) {
        this.camera.translate(this.camera.viewRight, moveDist);
        this.queueRender();
    }
    if (this.keyboard[65]) {
        this.camera.translate(this.camera.viewRight, -moveDist);
        this.queueRender();
    }
    if (this.keyboard[82]) {
        this.camera.translate(this.camera.viewDir, moveDist);
        this.queueRender();
    }
    if (this.keyboard[70]) {
        this.camera.translate(this.camera.viewDir, -moveDist);
        this.queueRender();
    }
    if (this.keyboard[38]) {
        this.camera.rotateAbout(this.camera.viewRight, rotateAngle, rotateOrigin);
        this.queueRender();
    }
    if (this.keyboard[40]) {
        this.camera.rotateAbout(this.camera.viewRight, -rotateAngle, rotateOrigin);
        this.queueRender();
    }
    if (this.keyboard[37]) {
        this.camera.rotateAbout(this.camera.viewUp, rotateAngle, rotateOrigin);
        this.queueRender();
    }
    if (this.keyboard[39]) {
        this.camera.rotateAbout(this.camera.viewUp, -rotateAngle, rotateOrigin);
        this.queueRender();
    }
    if (this.keyboard[32]) {
        this.queueRender();
    }*/

}

var rotQuat = quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), 1 / 60);
Engine.prototype.renderLoop = function(time) {
    if (this.lastRenderLoopTimestamp) {
        var dt = time - this.lastRenderLoopTimestamp;
        this.handleKeyboardInput(dt);
    }
    this.lastRenderLoopTimestamp = time;
    if (this.needsRender) {
        this.render();
        this.needsRender = false;
        this.handleInput();
    }
    //quat.mul(this.models[3].rot, this.models[3].rot, rotQuat);
    //quat.normalize(this.models[3].rot, this.models[3].rot);
    //vec3.copy(this.models[4].pos, this.clipCoordToPlane(vec2.fromValues(0,0), vec3.fromValues(0,0,1), 0));
    this.queueRender();
    requestAnimationFrame(this.renderLoop.bind(this));
}

var inputRotateQuat = quat.create();
var inputLineDir = vec3.create();
Engine.prototype.handleInput = function() {
    this.hover = this.models[this.getSelectionBuffer(this.gestureController.mouse.x, this.gestureController.mouse.y)];
    this.gestures = this.gestures.filter(function(gesture) {return gesture.active;})
    for (var i in this.gestures) {
        var gesture = this.gestures[i];
        if (gesture.action === "rotate") {
            var delta = gesture.getDelta();
            if (gesture.target) {
                if (delta.x) gesture.target.rotateAbout(this.camera.viewUp, 5 * delta.x / this.screenDiagonal);
                if (delta.y) gesture.target.rotateAbout(this.camera.viewRight, 5 * delta.y / this.screenDiagonal);
                if (delta.a) gesture.target.rotateAbout(this.camera.viewDir, delta.a);
                if (delta.rd) vec3.scale(gesture.target.scale, gesture.target.scale, delta.rd);
            }
            else {
                if (delta.x) this.camera.rotateAbout(this.camera.viewUp, -5 * delta.x / this.screenDiagonal, this.selected ? this.selected.pos : zeroVec3);
                if (delta.y) this.camera.rotateAbout(this.camera.viewRight, -5 * delta.y / this.screenDiagonal, this.selected ? this.selected.pos : zeroVec3);
                if (delta.a) this.camera.rotateAbout(this.camera.viewDir, -delta.a, this.selected ? this.selected.pos : zeroVec3);
                if (delta.d) this.camera.translate(this.camera.viewDir, 20 * delta.d / this.screenDiagonal);
            }
        }
        else if (gesture.action === "translate") {
            var delta = gesture.getDelta();
            if (gesture.target) {
                var x = gesture.x / this.screenWidth - 0.5;
                var y = -(gesture.y / this.screenHeight - 0.5);
                for (var i = 0; i < 3; i++) {
                    inputLineDir[i] = this.camera.viewDir[i] + x * this.camera.viewRight[i] + y * this.camera.viewUp[i];
                }
                vec3.copy(gesture.target.pos, this.clipCoordToPlane(x, y, this.camera.viewDir, null, gesture.target.pos));
            }
            else {
                if (delta.x) this.camera.translate(this.camera.viewRight, -20 * delta.x / this.screenDiagonal);
                if (delta.y) this.camera.translate(this.camera.viewUp, 20 * delta.y / this.screenDiagonal);
            }
        }
    }

    /*var selected = this.gestures.map(function(gesture) {
        return this.getSelectionBuffer(gesture.x, gesture.y).toString();
    }.bind(this));
    if (this.display) {
        this.display.innerHTML = selected.join("<br>");
    }*/
}

Engine.prototype.handleWheel = function(event) {
    var scrollAmount = 0;
    if (event.type === "wheel") {
        scrollAmount = event.deltaY * 0.5;
    }
    switch (event.deltaMode) {
    case 1:
        break;
    case 2:
        scrollAmount *= window.innerHeight;
    case 0:
        scrollAmount /= 50;
        break;
    default:
        break;
    }
    var model = this.models[this.getSelectionBuffer(event.clientX, event.clientY)];
    if (model === this.selected) {
        vec3.scale(model.scale, model.scale, Math.exp(scrollAmount * 0.1));
    }
    else {
        this.camera.translate(this.camera.viewDir, scrollAmount);
    }
}

Engine.prototype.evaluateParametric = function(expression, t) {
    var sin = Math.sin;
    var cos = Math.cos;
    var tan = Math.tan;
    var pow = Math.pow;
    var PI = Math.pi;
    return eval(expression);
}

Engine.prototype.updateLightPos = function() {
    for (i in this.lights) {
        var light = this.lights[i];
        light.currentPos[0] = this.evaluateParametric(light.posX, (Date.now() - light.timeOffset) / 1000);
        light.currentPos[1] = this.evaluateParametric(light.posY, (Date.now() - light.timeOffset) / 1000);
        light.currentPos[2] = this.evaluateParametric(light.posZ, (Date.now() - light.timeOffset) / 1000);
    }
}

Engine.prototype.render = function() {
    var gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE)
    this.camera.calcMatrix();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderFramebuffer);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.updateLightPos();
    this.drawModels(this.models, mat4.create());
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.selectionFramebuffer);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawModelsSelection(this.models, mat4.create());


    /*gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderFramebuffer);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawModelsSelection(this.models, mat4.create());*/

}


Engine.prototype.drawModels = function(models, baseMatrix) {
    var gl = this.gl;
    var matrix = mat4.create();
    for (i in models) {
        var model = models[i];
        mat4.fromRotationTranslation(matrix, model.rot, model.pos);
        mat4.scale(matrix, matrix, model.scale);
        mat4.mul(matrix, baseMatrix, matrix);
        var model = models[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh);
        if (model.shading == "FLAT_VERTEX") {
            var shader = this.shaders.colored;
            gl.useProgram(shader);
            gl.vertexAttribPointer(shader.vertexAttribs.aPos, 4, gl.FLOAT, false, 32, 0);
            gl.vertexAttribPointer(shader.vertexAttribs.aColor, 4, gl.FLOAT, false, 32, 16);
            gl.uniformMatrix4fv(shader.uniforms.uCamera, gl.FALSE, this.camera.transformMatrix);
            gl.uniformMatrix4fv(shader.uniforms.uModel, gl.FALSE, matrix);
        }
        else if (model.shading == "SHADED") {
            var shader = this.shaders.shaded;
            gl.useProgram(shader);
            gl.vertexAttribPointer(shader.vertexAttribs.aPos, 4, gl.FLOAT, false, 28, 0);
            gl.vertexAttribPointer(shader.vertexAttribs.aNormal, 3, gl.FLOAT, false, 28, 16);
            gl.uniformMatrix4fv(shader.uniforms.uCamera, gl.FALSE, this.camera.transformMatrix);
            gl.uniformMatrix4fv(shader.uniforms.uModel, gl.FALSE, matrix);
            if (this.mode === "delete" && this.hover == model) {
                gl.uniform4f(shader.uniforms.uColor, 1,0.5,0.5,0.5);
            }
            else if (this.mode === "select") {
                if (this.selected == model && this.hover == model) {
                    gl.uniform4f(shader.uniforms.uColor, 0.75,1,0.75,0.5);
                }
                else if (this.selected == model) {
                    gl.uniform4f(shader.uniforms.uColor, 0.5,1,0.5,0.5);
                }
                else if (this.hover == model) {
                    gl.uniform4f(shader.uniforms.uColor, 1,1,1,0.5);
                }
                else {
                    gl.uniform4f(shader.uniforms.uColor, 1,1,1,0);
                }
            }
            else gl.uniform4f(shader.uniforms.uColor, 1,1,1,0);
            var lightPosUniforms = ["uLight0Pos", "uLight1Pos"];
            var lightColorUniforms = ["uLight0Color", "uLight1Color"];
            for (var i = 0; i < this.lights.length; i++) {
                gl.uniform3fv(shader.uniforms[lightPosUniforms[i]], this.lights[i].currentPos);
                gl.uniform4f(shader.uniforms[lightColorUniforms[i]], 
                             this.lights[i].color[0], 
                             this.lights[i].color[1], 
                             this.lights[i].color[2], 
                             this.lights[i].enabled ? this.lights[i].intensity : 0);
            }
        }
        if (model.primitiveType == "LINES") {
            gl.drawArrays(gl.LINES, 0, model.mesh.numVertices);
        }
        else if (model.primitiveType == "TRIANGLES") {
            gl.drawArrays(gl.TRIANGLES, 0, model.mesh.numVertices);
        }
        else if (model.primitiveType == "TRIANGLE_STRIP") {
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, model.mesh.numVertices);
        }

        //this.drawModels(model.models, matrix);
    }
}

var colorArray = [0,0,0,0];
function intToColor(i) {
    colorArray[0] = (i & 0xFF) / 255;
    colorArray[1] = (i >> 8 & 0xFF) / 255;
    colorArray[2] = (i >> 16 & 0xFF) / 255;
    colorArray[3] = (i >> 24 & 0xFF) / 255;
    return colorArray;
}

Engine.prototype.drawModelsSelection = function(models, baseMatrix) {
    var gl = this.gl;
    var matrix = mat4.create();
    for (i in models) {
        var model = models[i];
        if (model.primitiveType == "LINES") {
            //this.drawModelsSelection(model.models, matrix);
            continue;
        }
        mat4.fromRotationTranslation(matrix, model.rot, model.pos);
        mat4.scale(matrix, matrix, model.scale);
        mat4.mul(matrix, baseMatrix, matrix);
        var model = models[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh);
        var shader = this.shaders.flat;
        gl.useProgram(shader);
        gl.uniformMatrix4fv(shader.uniforms.uCamera, gl.FALSE, this.camera.transformMatrix);
        gl.uniformMatrix4fv(shader.uniforms.uModel, gl.FALSE, matrix);
        gl.uniform4fv(shader.uniforms.uColor, intToColor(model.id));
        if (model.shading == "FLAT_VERTEX") {
            gl.vertexAttribPointer(shader.vertexAttribs.aPos, 4, gl.FLOAT, false, 32, 0);
        }
        else if (model.shading == "SHADED") {
            gl.vertexAttribPointer(shader.vertexAttribs.aPos, 4, gl.FLOAT, false, 28, 0);
        }
        if (model.primitiveType == "LINES") {
            gl.drawArrays(gl.LINES, 0, model.mesh.numVertices);
        }
        else if (model.primitiveType == "TRIANGLES") {
            gl.drawArrays(gl.TRIANGLES, 0, model.mesh.numVertices);
        }
        else if (model.primitiveType == "TRIANGLE_STRIP") {
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, model.mesh.numVertices);
        }

        //this.drawModelsSelection(model.models, matrix);
    }
}

window.pixel = new Uint8Array(4);
Engine.prototype.getSelectionBuffer = function(x, y) {
    //x = Math.round((x / 2 + 0.5) * this.canvas.width);
    //y = Math.round((y / 2 + 0.5) * this.canvas.height);
    if (x >= this.canvas.width || x < 0 || y >= this.canvas.height || y < 0) {
        return null;
    }
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.selectionFramebuffer);
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(x, this.canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return pixel[0] | (pixel[1] << 8) | (pixel[2] << 16)// | (pixel[3] << 24);


}

Engine.prototype.setResolution = function(width, height) {
    var gl = this.gl;
    this.canvas.width = this.screenWidth = width;
    this.canvas.height = this.screenHeight = height;
    this.camera.aspectRatio = this.screenWidth / this.screenHeight;
    this.screenDiagonal = Math.sqrt(this.screenWidth * this.screenWidth + this.screenHeight * this.screenHeight)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.selectionFramebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.selectionFramebufferDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.selectionFramebufferDepth);
    gl.bindTexture(gl.TEXTURE_2D, this.selectionFramebufferTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.selectionFramebufferTexture, 0);



    this.queueRender();
}

var intersectLinePlane = function(intersectPos, lineDir, linePos, planeDir, planeOffset, point) {
    var ld = lineDir;
    var lp = linePos;
    var pd = planeDir;
    var pt = point;
    if (point) {
        planeOffset = pd[0]*pt[0] + pd[1]*pt[1] + pd[2]*pt[2];
    }
    var po = planeOffset;
    var t = -(pd[0]*lp[0] + pd[1]*lp[1] + pd[2]*lp[2] - po) / (pd[0]*ld[0] + pd[1]*ld[1] + pd[2]*ld[2]);
    intersectPos[0] = ld[0]*t + lp[0];
    intersectPos[1] = ld[1]*t + lp[1];
    intersectPos[2] = ld[2]*t + lp[2];
    return isFinite(t);
}

var viewUpScaled = vec3.create();
var viewRightScaled = vec3.create();
var lineDir = vec3.create();
var intersectPos = vec3.create();
Engine.prototype.clipCoordToPlane = function(x, y, planeDir, planeOffset, point) {
    //var viewLengths = this.camera.getViewLengths();

    vec3.scale(viewRightScaled, this.camera.viewRight, this.camera.viewRightLength * x);
    vec3.scale(viewUpScaled, this.camera.viewUp, this.camera.viewUpLength * y);
    vec3.copy(lineDir, this.camera.viewDir);
    vec3.add(lineDir, lineDir, viewRightScaled);
    vec3.add(lineDir, lineDir, viewUpScaled);
    intersectLinePlane(intersectPos, lineDir, this.camera.pos, planeDir, planeOffset, point);
    return intersectPos;
}

var Camera = function() {
    this.diagonalFov = 1.2;
    this.aspectRatio = 16/9;
    this.pos = vec3.fromValues(0,0,10);
    this.viewDir = vec3.fromValues(0,0,-1);
    this.viewUp = vec3.fromValues(0,1,0);
    this.viewRight = vec3.fromValues(1, 0, 0);
    /*this.viewDir = vec3.fromValues(0,1,0);
    this.viewUp = vec3.fromValues(0,0,1);
    this.viewRight = vec3.fromValues(1,0,0);*/
    this.perspectiveMatrix = mat4.create();
    this.cameraMatrix = mat4.create();
    this.transformMatrix = mat4.create();
    this.inverseCamera = mat4.create();
    this.calcMatrix();
}


var zeroVec3 = vec3.create();
var viewFocus = vec3.create();

Camera.prototype.calcViewLengths = function() {
    var diagonal = Math.tan(this.diagonalFov / 2);
    var diagonal2 = diagonal * diagonal;
    var up2 = diagonal2 / (this.aspectRatio * this.aspectRatio + 1);
    var up = Math.sqrt(up2);
    var right2 = diagonal2 - up2;
    var right = Math.sqrt(right2);
    this.viewRightLength = right;
    this.viewUpLength = up;
}

Camera.prototype.calcMatrix = function() {
    vec3.add(viewFocus, this.pos, this.viewDir);
    this.calcViewLengths();
    mat4.perspective(this.perspectiveMatrix, this.viewUpLength, this.aspectRatio, 0.25, 1024.0);
    mat4.lookAt(this.cameraMatrix, this.pos, viewFocus, this.viewUp);
    mat4.mul(this.transformMatrix, this.perspectiveMatrix, this.cameraMatrix);
}

var cameraTranslationVector = vec3.create();
Camera.prototype.translate = function(direction, distance) {
    vec3.normalize(cameraTranslationVector, direction);
    vec3.scale(cameraTranslationVector, cameraTranslationVector, distance);
    vec3.add(this.pos, this.pos, cameraTranslationVector);
}

var cameraRotationQuat = quat.create();
var tempVec3 = quat.create();
Camera.prototype.rotateAbout = function(axis, angle, point) {
    quat.setAxisAngle(cameraRotationQuat, axis, angle);
    vec3.transformQuat(this.viewDir, this.viewDir, cameraRotationQuat);
    vec3.transformQuat(this.viewUp, this.viewUp, cameraRotationQuat);
    vec3.cross(this.viewRight, this.viewDir, this.viewUp);
    vec3.cross(this.viewUp, this.viewRight, this.viewDir);
    vec3.normalize(this.viewDir, this.viewDir);
    vec3.normalize(this.viewUp, this.viewUp);
    vec3.normalize(this.viewRight, this.viewRight);
    if (point) {
        vec3.copy(tempVec3, point);
        vec3.sub(this.pos, this.pos, point);
        vec3.transformQuat(this.pos, this.pos, cameraRotationQuat);
        vec3.add(this.pos, this.pos, tempVec3);
    }
}

var currentModelId = 1;
Model = function(options) {
    this.pos = options.pos || vec3.create();
    this.rot = options.rot || quat.create();
    this.scale = options.scale || vec3.fromValues(1,1,1);
    this.matrix = mat4.create();
    this.matrixValid = false;

    this.mesh = options.mesh || null;
    this.primitiveType = options.primitiveType || "TRIANGLES";
    this.shading = options.shading || "SHADED";

    this.color = vec3.create();

    this.id = currentModelId;
    currentModelId++;

    this.models = [];
}

Model.getMatrix = function() {

    this.matrixValid = true;
    return this.matrix;
}

var modelRotationQuat = quat.create();
Model.prototype.rotateAbout = function(axis, angle) {
    quat.setAxisAngle(modelRotationQuat, axis, angle);
    quat.mul(this.rot, modelRotationQuat, this.rot);
    quat.normalize(this.rot, this.rot);
    /*if (point) {
        vec3.copy(tempVec3, point);
        vec3.sub(this.pos, this.pos, point);
        vec3.transformQuat(this.pos, this.pos, modelRotationQuat);
        vec3.add(this.pos, this.pos, tempVec3);
    }*/
}

window.Engine = Engine;

})();
