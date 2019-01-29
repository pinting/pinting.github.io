var character;
var x = -100;
var y = 330;

function start(speed) {
    move(0, 0, 0);
    wait(500);
    run(810, 4000 / speed);
    jumpUp(-224);
    run(150, 1400 / speed);
    jumpDown(224);
    run(650, 3600 / speed);
    jumpUp(-255);
    run(365, 2000 / speed);
    jumpDown(255);
    run(550, 3600 / speed);
    jumpUp(-190);
    run(130, 1300 / speed);
    jumpDown(190);
    run(8000, 26000 / speed);
}

function jumpDown(top) {
    move(40, -36, 50);
    move(10, 0, 50);
    move(10, 0, 40);
    move(50, top + 36, 400);
}

function jumpUp(top) {
    move(10, top - 22, 500);
    move(10, 22, 200);
}

function run(left, speed) {
    move(left, 0, speed);
}

function wait(speed) {
    move(0, 0, speed);
}

function move(left, top, speed) {
    x += left;
    y += top;
    
    character.animate({
        marginLeft: x,
        marginTop: y
    }, speed);
}

$(window).bind("touchmove", function(e) {
    e.preventDefault();
});

$(document).ready(function() {
    character = $("#mario");
    start(1.35);
});