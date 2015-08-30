(function(){
    window.triangleVertexData = new Float32Array([
        0, 1, 0, 1,
        -Math.sqrt(3)/2, -0.5, 0, 1,
        Math.sqrt(3)/2, -0.5, 0, 1
    ]);

    window.axesVertexData = new Float32Array([
        0, 0, 0, 1, 1, 0, 0, 1,
        1, 0, 0, 1, 1, 0, 0, 1,
        0, 0, 0, 1, 0, 1, 0, 1,
        0, 1, 0, 1, 0, 1, 0, 1,
        0, 0, 0, 1, 0, 0.5, 1, 1,
        0, 0, 1, 1, 0, 0.5, 1, 1,
        0, 0, 0, 1, 1, 0.5, 0.5, 1,
        -1, 0, 0, 1, 1, 0.5, 0.5, 1,
        0, 0, 0, 1, 0.6, 1, 0.6, 1,
        0, -1, 0, 1, 0.6, 1, 0.6, 1,
        0, 0, 0, 1, 0.4, 0.4, 1, 1,
        0, 0, -1, 1, 0.4, 0.4, 1, 1,
    ]);

    window.axesVertexData = new Float32Array([
        0, 0, 0, 1, 1, 0, 0, 1,
        1, 0, 0, 1, 1, 0, 0, 1,
        0, 0, 0, 1, 0, 1, 0, 1,
        0, 1, 0, 1, 0, 1, 0, 1,
        0, 0, 0, 1, 0, 0.4, 1, 1,
        0, 0, 1, 1, 0, 0.4, 1, 1,
        0, 0, 0, 1, 0.5, 0, 0, 1,
        -1, 0, 0, 1, 0.5, 0, 0, 1,
        0, 0, 0, 1, 0, 0.5, 0, 1,
        0, -1, 0, 1, 0, 0.5, 0, 1,
        0, 0, 0, 1, 0, 0.1, 0.5, 1,
        0, 0, -1, 1, 0, 0.1, 0.5, 1,
    ]);

    var octahedronPoints = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
        0, 1, 0,
        -1, 0, 0,
        0, 0, 1,
        -1, 0, 0,
        0, -1, 0,
        0, 0, 1,
        0, -1, 0,
        1, 0, 0,
        0, 0, 1,

        1, 0, 0,
        0, 0, -1,
        0, 1, 0,
        0, 1, 0,
        0, 0, -1,
        -1, 0, 0,
        -1, 0, 0,
        0, 0, -1,
        0, -1, 0,
        0, -1, 0,
        0, 0, -1,
        1, 0, 0,
    ]);

    function subdivideToSphere(inArray, iterations) {
        var dim = 3;
        if (iterations == 0) return new Float32Array(inArray);
        function avg(a,b) {return (a + b) / 2.0;}
        var triangleSize = 3 * dim;
        var numTriangles = parseInt(inArray.length / triangleSize);
        var outArrayLength = triangleSize * numTriangles;
        for (var i = 0; i < iterations; i++) outArrayLength *= 4;
        var outArray = new Float32Array(outArrayLength);
        for (var i = 0; i < iterations; i++) {
            for (var t = numTriangles - 1; t >= 0; t--) {
                var a = t * triangleSize;
                var b = a + dim;
                var c = b + dim;
                var o = 4*a;
                for (var d = 0; d < dim; d++) {
                    outArray[o +11*dim + d] = avg(inArray[b+d], inArray[c+d]);
                    outArray[o +10*dim + d] = avg(inArray[a+d], inArray[b+d]);
                    outArray[o + 9*dim + d] = avg(inArray[a+d], inArray[c+d]);
                    outArray[o + 8*dim + d] = inArray[c+d];
                    outArray[o + 7*dim + d] = avg(inArray[b+d], inArray[c+d]);
                    outArray[o + 6*dim + d] = avg(inArray[a+d], inArray[c+d]);
                    outArray[o + 5*dim + d] = avg(inArray[b+d], inArray[c+d]);
                    outArray[o + 4*dim + d] = inArray[b+d];
                    outArray[o + 3*dim + d] = avg(inArray[a+d], inArray[b+d]);
                    outArray[o + 2*dim + d] = avg(inArray[a+d], inArray[c+d]);
                    outArray[o + 1*dim + d] = avg(inArray[a+d], inArray[b+d]);
                    outArray[o + 0*dim + d] = inArray[a+d];
                }
                for (var v = 0; v < 12; v++) {
                    var sum = 0;
                    for (var d = 0; d < dim; d++) {
                        sum += outArray[o + v*dim + d] * outArray[o + v*dim + d];
                    }
                    var s = 1 / Math.sqrt(sum);
                    for (var d = 0; d < dim; d++) {
                        outArray[o + v*dim + d] *= s;
                    }
                }
            }
            numTriangles *= 4;
            inArray = outArray;
        }
        return outArray;
    }

    function sphereNormals(vertices) {
        var numVertices = parseInt(vertices.length / 3);
        var out = new Float32Array(numVertices * 7);
        for (var i = 0; i < numVertices; i++) {
            var s = i * 3;
            var d = i * 7;
            out [d + 3] = 1;
            for (var j = 0; j < 3; j++) {
                out[d + j] = vertices[s + j];
                out[d + j + 4] = vertices[s + j];
            }
        }
        return out;
    }

    window.sphereVertexData = sphereNormals(subdivideToSphere(octahedronPoints, 4));

    function cylinderVertices(segments) {
        var numCorners = segments;
        var numVertices = (numCorners * 2 + 3) * 3 + 1;
        var out = new Float32Array(numVertices * 7);
        var dTheta = Math.PI / segments;
        var o = 0;
        function duplicatePrevious() {
            for (var i = 0; i < 7; i++) {
                out[o] = out[o - 7];
                o++;
            }
        }
        for (var i = 0; i < segments * 2 + 2; i++) {
            out[o + 0] = Math.cos(i * dTheta);
            out[o + 1] = Math.sin(i * dTheta);
            out[o + 2] = (i & 1) ? -1 : 1;
            out[o + 3] = 1;
            out[o + 4] = out[o + 0];
            out[o + 5] = out[o + 1];
            out[o + 6] = 0;
            o += 7;
        }
        duplicatePrevious();
        out[o + 0] = 0;
        out[o + 1] = 0;
        out[o + 2] = 1;
        out[o + 3] = 1;
        out[o + 4] = 0;
        out[o + 5] = 0;
        out[o + 6] = 1;
        o += 7;
        for (var i = 0; i < segments + 1; i++) {
            out[o + 0] = 0;
            out[o + 1] = 0;
            out[o + 2] = 1;
            out[o + 3] = 1;
            out[o + 4] = 0;
            out[o + 5] = 0;
            out[o + 6] = 1;
            o += 7;
            out[o + 0] = Math.cos(i * dTheta * 2);
            out[o + 1] = Math.sin(i * dTheta * 2);
            out[o + 2] = 1;
            out[o + 3] = 1;
            out[o + 4] = 0;
            out[o + 5] = 0;
            out[o + 6] = 1;
            o += 7;
        }
        duplicatePrevious();
        out[o + 0] = 0;
        out[o + 1] = 0;
        out[o + 2] = -1;
        out[o + 3] = 1;
        out[o + 4] = 0;
        out[o + 5] = 0;
        out[o + 6] = -1;
        o += 7;
        for (var i = 0; i < segments + 1; i++) {
            out[o + 0] = 0;
            out[o + 1] = 0;
            out[o + 2] = -1;
            out[o + 3] = 1;
            out[o + 4] = 0;
            out[o + 5] = 0;
            out[o + 6] = -1;
            o += 7;
            out[o + 0] = Math.cos(i * -dTheta * 2 + dTheta);
            out[o + 1] = Math.sin(i * -dTheta * 2 + dTheta);
            out[o + 2] = -1;
            out[o + 3] = 1;
            out[o + 4] = 0;
            out[o + 5] = 0;
            out[o + 6] = -1
            o += 7;
        }
        return out;
    }

    window.cylinderVertexData = cylinderVertices(48);

    function coneVertices(segments) {
        var numCorners = segments;
        var numVertices = numCorners * 3 + 4;
        var out = new Float32Array(numVertices * 7);
        var dTheta = 2 * Math.PI / segments;
        var o = 0;
        function duplicatePrevious() {
            for (var i = 0; i < 7; i++) {
                out[o] = out[o - 7];
                o++;
            }
        }
        for (var i = 0; i < numCorners + 1; i++) {
            o += 7;
            out[o + 0] = Math.cos(-i * dTheta);
            out[o + 1] = Math.sin(-i * dTheta);
            out[o + 2] = 1;
            out[o + 3] = 1;
            out[o + 4] = 0.5 * Math.sqrt(2) * out[o + 0];
            out[o + 5] = 0.5 * Math.sqrt(2) * out[o + 1];
            out[o + 6] = 0.5 * -Math.sqrt(2);
            o -= 7;
            out[o + 0] = 0;
            out[o + 1] = 0;
            out[o + 2] = 0;
            out[o + 3] = 1;
            out[o + 4] = out[o + 4 + 7];
            out[o + 5] = out[o + 5 + 7];
            out[o + 6] = 0;
            o += 14;
        }
        duplicatePrevious();
        for (var i = 0; i * dTheta <= Math.PI; i++) {
            out[o + 0] = Math.cos(i * dTheta);
            out[o + 1] = Math.sin(i * dTheta);
            out[o + 2] = 1;
            out[o + 3] = 1;
            out[o + 4] = 0;
            out[o + 5] = 0;
            out[o + 6] = 1;
            o += 7;
            out[o + 0] = Math.cos(-i * dTheta);
            out[o + 1] = Math.sin(-i * dTheta);
            out[o + 2] = 1;
            out[o + 3] = 1;
            out[o + 4] = 0;
            out[o + 5] = 0;
            out[o + 6] = 1;
            o += 7;
        }

        return out;
    }

    window.coneVertexData = coneVertices(256);
})()
