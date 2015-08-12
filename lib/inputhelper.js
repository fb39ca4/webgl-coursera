function Keyboard (onchange) {
    if (typeof onchange !== "function") onchange = (function(){});
    keyboard = this;
    keyboard.onchange = onchange;
    window.addEventListener('keydown', function(event) {
        keyboard[event.keyCode] = true;
        keyboard.onchange(keyboard);
    });
    window.addEventListener('keyup', function(event) {
        delete keyboard[event.keyCode];
        keyboard.onchange(keyboard);
    });
}
function Mouse(onchange) {
    if (typeof onchange !== "function") onchange = (function(){});
    mouse = this;
    mouse.click = false;
    window.addEventListener('mousedown', function(event) {
        mouse.click = true;
    });
    window.addEventListener('mouseup', function(event) {
        mouse.click = false;
    });
    window.addEventListener('mousemove', function(event) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });
}
