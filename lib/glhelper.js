function GlHelper(canvas, options) {
    this.canvas = canvas;
    options = options || {};
    this.gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
    if (!this.gl) {
        window.alert("Failed to initialize WebGL");
        throw new Error("Failed to initialize WebGL");
    }
    if ((options.debug === true) && WebGLDebugUtils) {
        WebGLDebugUtils.makeDebugContext(this.gl);
    }
    this.constants = {}
    this.gatherConstants();
}

GlHelper.prototype.gatherConstants = function() {
    for (var i in this.gl.__proto__) {
        if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(i.charAt(0)) >= 0) {
            this.constants[i] = this.gl[i];
        }
    }
}

GlHelper.loadURLAsync = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType("text/plain; charset=utf-8");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
          callback(xhr.responseText);
        }
    }
    xhr.open("GET", url, true);
    xhr.send();
};

GlHelper.prototype.loadShaderDOM = function(id, type) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) throw new Error("could not find shader");
    var shaderSource = shaderScript.innerHTML;
    var shaderType
    if (typeof type != "string") {
        if (type == this.gl.FRAGMENT_SHADER) shaderType = this.gl.FRAGMENT_SHADER;
        else if (type == this.gl.VERTEX_SHADER) shaderType = this.gl.VERTEX_SHADER;
        else if (shaderScript.type == "x-shader/x-fragment") shaderType = this.gl.FRAGMENT_SHADER;
        else if (shaderScript.type == "x-shader/x-vertex") shaderType = this.gl.VERTEX_SHADER;
        else throw new Error("Unknown shader type");
    }
    else {
        if (type.toLowercase.startsWith("frag")) shaderType = this.gl.FRAGMENT_SHADER;
        else if (type.toLowercase.startsWith("vert")) shaderType = this.gl.VERTEX_SHADER;
        else throw new Error("Unknown shader type");
    }
    return this.loadShaderString(shaderSource, shaderType);
};

GlHelper.prototype.loadShaderString = function(shaderSource, type) {
    var shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, shaderSource);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(shader));
            return null;
    }

    return shader;
};

GlHelper.prototype.linkShaderProgram = function(vertex, fragment) {
    var program = this.gl.createProgram();
    this.gl.attachShader(program, vertex);
    this.gl.attachShader(program, fragment);
    this.gl.linkProgram(program);
    if (this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        program.vertexAttribs = {};
        program.uniforms = {};
        return program;
    }
    else throw new Error(this.gl.getProgramInfoLog(program));
};

GlHelper.prototype.enableVertexAttribArray = function(program) {
    for (i in program.vertexAttribs) this.gl.enableVertexAttribArray(program.vertexAttribs[i]);
}

GlHelper.prototype.disableVertexAttribArray = function(program) {
    for (i in program.vertexAttribs) this.gl.disableVertexAttribArray(program.vertexAttribs[i]);
}

GlHelper.prototype.readVertexAttribs = function(program, names) {
    for (i in names) {
        program.vertexAttribs[names[i]] = this.gl.getAttribLocation(program, names[i]);
    }
}

GlHelper.prototype.readUniforms = function(program, names) {
    for (i in names) {
        program.uniforms[names[i]] = this.gl.getUniformLocation(program, names[i]);
    }
}

GlHelper.prototype.createBuffer = function(data, itemSize) {
    if (typeof itemSize == "undefined") itemSize = -1;
    var buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    buffer.numItems = data.byteLength;
    return buffer;
}
