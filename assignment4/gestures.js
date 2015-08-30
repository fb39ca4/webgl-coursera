(function(){

var ua = navigator.userAgent.toLowerCase();
var isFirefox = ((ua.indexOf("gecko") >= 0) && (ua.indexOf("trident") < 0) && (ua.indexOf("webkit") < 0))

var avg = function(a,b){return (a+b)/2}
var sq = function(a) {return a*a}

Gestures = function(target, display) {
    this.callbacks = {};
    this.pointers = {};
    this.gestures = [];
    this.target = target;
    this.display = display;
    this.onGesture = null;

    this.mouse = {x: null, y: null}

    this.target.addEventListener("pointerdown", this.addPointer.bind(this));
    this.target.addEventListener("pointerup", this.removePointer.bind(this));
    this.target.addEventListener("pointerout", this.removePointer.bind(this));
    this.target.addEventListener("pointermove", this.movePointer.bind(this));
    this.target.addEventListener("contextmenu", function(event){event.preventDefault();return false});

    this.renderLoop();
}

Gestures.prototype.emit = function(gesture) {
    this.gestures.push(gesture);
    if (typeof this.onGesture === "function") this.onGesture(gesture);
}

Gestures.prototype.renderLoop = function() {
    for (i in this.gestures) {
        if (!this.gestures[i].active) {
            this.gestures.splice(i,1);
        }
    }
    if (this.display) this.display.innerHTML = this.toString();
    requestAnimationFrame(this.renderLoop.bind(this));
}

Gestures.prototype.addPointer = function(event) {
    var pointer = new Pointer(event);
    if (!this.upgradeToTwoFinger(pointer)) {
        this.pointers[event.pointerId] = pointer;
        this.callbacks[event.pointerId] = pointer.update.bind(pointer);
        setTimeout(function(){this.upgradeToHold(pointer)}.bind(this), 250);
    }
}

Gestures.prototype.movePointer = function(event) {
    if (event.pointerType === "mouse") {
        this.mouse.x = event.clientX;
        this.mouse.y = event.clientY;
    }
    if (this.callbacks.hasOwnProperty(event.pointerId)) {
        this.callbacks[event.pointerId](event);
    }
    if (this.pointers.hasOwnProperty(event.pointerId)) {
        var pointer = this.pointers[event.pointerId]
        this.upgradeToSwipe(pointer);
    }
}

Gestures.prototype.removePointer = function(event) {
    if (this.callbacks.hasOwnProperty(event.pointerId)) {
        this.callbacks[event.pointerId](event);
    }
    if (this.pointers.hasOwnProperty(event.pointerId)) {
        this.pointers[event.pointerId].update(event)
        delete this.pointers[event.pointerId];
    }
}

Gestures.prototype.upgradeToSwipe = function(pointer) {
    if (pointer.maxDist > 25 && pointer.t > 100 && pointer.active) {
        delete this.pointers[pointer.id];
        delete this.callbacks[pointer.id];
        pointer.active = false;
        //console.log("swipe");
        var gesture = new OneFinger(pointer, "swipe");
        this.callbacks[pointer.id] = gesture.update.bind(gesture);
        this.emit(gesture);
    }
}

Gestures.prototype.upgradeToHold = function(pointer) {
    if (pointer.maxDist < 5 && pointer.active) {
        delete this.pointers[pointer.id];
        delete this.callbacks[pointer.id];
        pointer.active = false;
        //console.log("hold");
        var gesture = new OneFinger(pointer, "hold");
        this.callbacks[pointer.id] = gesture.update.bind(gesture);
        this.emit(gesture);
    }
}

Gestures.prototype.upgradeToTwoFinger = function(pointer) {
    if (pointer.active) {
        if (pointer.buttons & 2) {
            var gesture = new TwoFinger(pointer, pointer);
            this.callbacks[pointer.id] = function(event) {
                (gesture.update1.bind(gesture))(event);
                (gesture.update2.bind(gesture))(event);
            }
            this.emit(gesture);
            return true;
        }
        else {
            var bestMatch;
            for (i in this.pointers) {
                if (!bestMatch) {
                    bestMatch = this.pointers[i];
                }
                else if (pointer.t - this.pointers[i].t < pointer.t - bestMatch.t) {
                    bestMatch = this.pointers[i];
                }
            }
            if (bestMatch) {
                id1 = bestMatch.id;
                id2 = pointer.id;
                pointer.active = false;
                bestMatch.active = false;
                delete this.pointers[bestMatch.id];
                var gesture = new TwoFinger(bestMatch, pointer);
                this.callbacks[id1] = gesture.update1.bind(gesture);
                this.callbacks[id2] = gesture.update2.bind(gesture);
                this.emit(gesture);
                //console.log("twofinger");
                return true;
            }
            else return false;
        }
    }
}

Gestures.prototype.toString = function() {
    out = [];
    /*for (i in this.pointers) {
        out.push(this.pointers[i].toString());
    }
    out.push("<hr/>");*/
    for (i in this.gestures) {
        out.push(this.gestures[i].toString());
    }
    return out.join("<br/>");
}

var Pointer = function(event) {
    this.buttons = event.buttons;
    this.id = event.pointerId;
    this.x = this.originX = event.clientX;
    this.y = this.originY = event.clientY;
    this.t = 0;
    this.originT = event.timeStamp / (isFirefox?1000:1);
    this.maxDist = 0;
    this.active = true;
}

Pointer.prototype.update = function(event) {
    switch (event.type) {
    case "pointerup":
        this.active = false;
    default:
    }
    this.x = event.clientX;
    this.y = event.clientY;
    this.maxDist = Math.max(this.maxDist, Math.sqrt(sq(this.x - this.originX) + sq(this.y - this.originY)));
    this.t = event.timeStamp / (isFirefox?1000:1) - this.originT;
}

Pointer.prototype.toString = function() {
    return ["Id:" + this.id, "x:"+this.x, "y:"+this.y, "t:"+this.t, "active:"+this.active].join(", ");
}

var gestureId = 0;
var OneFinger = function(pointer, type) {
    this.id = gestureId++;
    this.type = type || "swipe";
    this.x = pointer.x;
    this.y = pointer.y;
    this.lastX = pointer.x;
    this.lastY = pointer.y;
    this.originX = pointer.originX;
    this.originY = pointer.originY;
    this.active = true;
}

OneFinger.prototype.update = function(event) {
    switch (event.type) {
    case "pointerup":
    case "pointerout":
        this.active = false;
    default:
    }
    this.x = event.clientX;
    this.y = event.clientY;
}

OneFinger.prototype.getDelta = function() {
    var out = { x: this.x - this.lastX, y: this.y - this.lastY }
    this.lastX = this.x;
    this.lastY = this.y;
    return out;
}

OneFinger.prototype.toString = function() {
    return [
        "Id:" + this.id,
        "Type:" + this.type,
        "active:" + this.active,
        "x:"+this.x,
        "y:"+this.y,
    ].join(", ");
}

var TwoFinger = function(pointer1, pointer2) {
    this.id = gestureId++;
    this.type = "pinch";
    this.active = true;

    this.x1 = pointer1.x;
    this.x2 = pointer2.x;
    this.y1 = pointer1.y;
    this.y2 = pointer2.y;
    this.x = avg(this.x1, this.x2);
    this.y = avg(this.y1, this.y2);
    this.d = this.getDistance();
    this.previousA = 0.5;
    this.a = this.getAngle();

    this.originX = this.x;
    this.originY = this.y;

    this.lastX = this.x;
    this.lastY = this.y;
    this.lastD = this.d;
    this.lastA = this.a;
}

TwoFinger.prototype.getDistance = function() {
    var dx = this.x2 - this.x1;
    var dy = this.y2 - this.y1;
    return Math.sqrt(dx * dx + dy * dy);
}

TwoFinger.prototype.getAngle = function() {
    var positiveNormalizedAtan2 = function(y, x) {
        var atan = Math.atan2(y, x) / (2*Math.PI);
        return atan + ((atan < 0) ? 1 : 0);
    }
    var positiveMod = function(a, b) {
        var mod = a % b;
        return mod + ((mod < 0) ? b : 0);
    }
    var dx = this.x2 - this.x1;
    var dy = this.y2 - this.y1;
    if (dy == 0 && dx == 0) return 0;
    var newAngleFract = positiveNormalizedAtan2(dy, dx);
    var rotationsInt = Math.floor(this.previousA);

    var same = Math.abs((newAngleFract + rotationsInt) - this.previousA);
    var minus1 = Math.abs((newAngleFract + rotationsInt - 1) - this.previousA);
    var plus1 = Math.abs((newAngleFract + rotationsInt + 1) - this.previousA);
    if (plus1 < same) this.previousA = newAngleFract + rotationsInt + 1;
    else if (minus1 < same) this.previousA = newAngleFract + rotationsInt - 1;
    else this.previousA = newAngleFract + rotationsInt;
    return this.previousA * Math.PI * 2;
}

TwoFinger.prototype.update1 = function(event) {
    switch (event.type) {
    case "pointerup":
        this.active = false;
    default:
    }
    this.x1 = event.clientX;
    this.y1 = event.clientY;
    this.x = avg(this.x1, this.x2);
    this.y = avg(this.y1, this.y2);
    this.d = this.getDistance();
    this.a = this.getAngle();
}

TwoFinger.prototype.update2 = function(event) {
    switch (event.type) {
    case "pointerup":
    case "pointerout":
        this.active = false;
    default:
    }
    this.x2 = event.clientX;
    this.y2 = event.clientY;
    this.x = avg(this.x1, this.x2);
    this.y = avg(this.y1, this.y2);
    this.d = this.getDistance();
    this.a = this.getAngle();
}

TwoFinger.prototype.getDelta = function() {
    var out =  {
        x: this.x - this.lastX,
        y: this.y - this.lastY,
        d: this.d - this.lastD,
        rd: this.d / this.lastD || 1,
        a: this.a - this.lastA,
    }
    this.lastX = this.x;
    this.lastY = this.y;
    this.lastD = this.d;
    this.lastA = this.a;
    return out;
}

TwoFinger.prototype.toString = function() {
    return [
        "Id:" + this.id,
        "Type:" + this.type,
        "active:" + this.active,
        "x:"+Math.round(this.x),
        "y:"+Math.round(this.y),
        "d:"+Math.round(this.d),
        "a:"+Math.round(1000 * this.a) / 1000,
    ].join(", ");
}

})();
