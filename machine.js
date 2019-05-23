const add = (accumulator, currentValue) => accumulator + currentValue;
const goalPos = 20;
const datapoints = 100;

function graph(destination, position, error, goal) {
    return Highcharts.chart(destination, {
        chart: {
            animation: false
        },
        title: {
            text: 'Motion Profile'
        },
        series: [{
            name: 'Position',
            data: position
        }, {
            name: 'Error (Difference)',
            data: error
        }, {
            name: 'Goal',
            data: goal
        }],
    });
}

function createSlider(min, max, val, id) {
    var slider = document.createElement("input");
    slider.type = "range";
    slider.className = "slider";
    slider.min = min;
    slider.max = max;
    slider.step = (max - min) / 1000;
    slider.value = val;
    slider.class = "slider";
    slider.id = id;
    slider.style.width = "78%";
    slider.style.color = "green";
    slider.style.margin = "0";
    return slider;
}

function createNumInput(min, max, val, id) {
    var numIn = document.createElement("input");
    numIn.type = "number"
    numIn.min = min;
    numIn.max = max;
    numIn.value = val;
    numIn.step = (max - min) / 1000;
    numIn.id = id;
    numIn.style.width = "20%";
    numIn.style.minWidth = "40px";
    numIn.style.margin = "0";
    return numIn;
}

function createLabel(emphtext, text) {
    var header = document.createElement("h2");
    header.innerHTML = "<b>" + emphtext + "</b>" + text;
    return header;
}

class Machine {

    constructor(kP, kI, kD) {
        this.kP = kP;
        this.kI = kI;
        this.kD = kD;
        this.kAccel = 0.03;
        this.kMaxV = 8;
        this.pos = 0;
        this.vel = 0;
        this.goalPos = goalPos;
        this.errorsSum=0
        this.lastError=goalPos;
    }

    /**
    Calculate and return the new machine position, using constructor information.
    */
    next() {
        var error = this.goalPos - this.pos;
        var p = this.kP * error;
        var i = this.kI * this.integrate(error);
        var d = this.kD * this.derive(error);
        var sign = Math.sign(this.vel);
        this.vel += this.kAccel *  Math.tanh(p + i + d);
        this.vel -= sign *this.getFriction(this.vel);
        this.pos += this.vel;
        return this.pos;
    }
    
    integrate(error){
        //If error and the sum have the same sign, sum the two. If they crossed, reset sum.
        if(Math.sign(error)===Math.sign(this.errorsSum)){
           this.errorsSum+=error;   
        }else{
           this.errorsSum=error;   
        }
        return this.errorsSum
    }
    
    derive(error){
        var dif=error-this.lastError;
        this.lastError=error;
        return dif;
    }
    
    getFriction(velocity) {
        var absvel=Math.abs(velocity)
        return Math.min(Math.abs(velocity),2*this.kAccel / 5 + 0.01 * absvel);
    }
}
/**
Creates and returns a div wrapper containing a single machine and sliders.
*/

var loop;
var paused = false;
var frame = 1;
var frameDelay = 28;
var frameLimit = -1;
var greenBlock, redBlock;
var redData, greenData;
var redMachine, greenMachine;
function getPairedSliderInput(max, min, classname, idprepend) {
    var wrapper = document.createElement("div");
    wrapper.className = "flexrow flexstretch";
    var slider = createSlider(min, max, (min + max) / 2, idprepend + "Slider", classname);
    var numIn = createNumInput(min, max, (min + max) / 2, idprepend + "Number", classname);
    slider.oninput = function () {
        numIn.value = this.value;
    }
    numIn.oninput = function () {
        slider.value = this.value;
    }
    wrapper.appendChild(slider);
    wrapper.appendChild(numIn);
    return wrapper;
}

function createSlider(min, max, val, id, classname) {
    var slider = document.createElement("input");
    slider.type = "range";
    slider.className = "slider " + classname;
    slider.min = min;
    slider.max = max;
    slider.step = (max - min) / 1000;
    slider.value = val;
    slider.id = id;
    slider.style.width = "78%";
    slider.style.color = "green";
    slider.style.margin = "0";
    return slider;
}

function createNumInput(min, max, val, id, classname) {
    var numIn = document.createElement("input");
    numIn.classname = classname;
    numIn.type = "number"
    numIn.min = min;
    numIn.max = max;
    numIn.value = val;
    numIn.step = (max - min) / 1000;
    numIn.id = id;
    numIn.style.width = "20%";
    numIn.style.minWidth = "40px";
    numIn.style.margin = "0";
    return numIn;
}
function init() {
    //create extra dom elements
    var letters = ['p', 'i', 'd'];
    var maxs = [5, 2, 1];
    var mins = [-0.5, -0.5, -0.5];
    for (var i = 0; i < letters.length; i++) {
        //create slider for both red and green
        var greenParent = document.getElementById(letters[i] + "Green");
        var redParent = document.getElementById(letters[i] + "Red");
        //add slider
        greenParent.appendChild(getPairedSliderInput(maxs[i], mins[i], "green", letters[i] + "Green"))
        redParent.appendChild(getPairedSliderInput(maxs[i], mins[i], "red", letters[i] + "Red"))
    }
    greenBlock = document.getElementById("greenBlock");
    redBlock = document.getElementById("redBlock");
    start();
}
function draw() {
    greenNext = greenMachine.next();
    greenData.series[0].addPoint(20);
    greenData.series[1].addPoint(Math.abs(20 - greenNext));
    greenData.series[2].addPoint(greenNext);
    redNext = redMachine.next();
    redData.series[0].addPoint(20);
    redData.series[1].addPoint(Math.abs(20 - redNext));
    redData.series[2].addPoint(redNext);
    greenBlock.style.marginLeft = 5 * greenNext / 2 - 2 + "vw";
    redBlock.style.marginLeft = 5 * redNext / 2 - 2.5 + "vw";
    if (frameLimit > -1 && frame > frameLimit) {
        clearInterval(loop);
        // console.log("Done!" + frame + "-" + frameLimit);
        return;
    }
    // console.log(x + " \n" + v);

    // ctx.font = "16px Arial";
    // ctx.fillText("Frame: " + frame, 10, height - 40);
    // ctx.fillText("Velocity: " + v, 10, 90);
    // ctx.fillText("Acceleration: " + a, 10, 110);
    // ctx.fillText("RoC of Acceleration: " + ap, 10, 130);

    // ctx.fillStyle = 'rgb(200, 0, 0)';
    // ctx.fillRect(x, y, 50, 50);
    // frame++;
}



function start() {
    clearInterval(loop);
    rconf=[];
    gconf=[];
    letters=['p','i','d'];
    for(var i=0;i<3;i++){
        redinput=document.getElementById(letters[i]+"RedNumber");
        greeninput=document.getElementById(letters[i]+"GreenNumber");
        rconf.push(redinput.value);
        gconf.push(greeninput.value);
    }
    redMachine = new Machine(rconf[0], rconf[1], rconf[2]);
    greenMachine = new Machine(gconf[0], gconf[1], gconf[2]);
    var greenGraphDest = document.getElementById("greenGraph");
    var redGraphDest = document.getElementById("redGraph");
    while(greenGraphDest.firstChild){
        greenGraphDest.removeChild(greenGraphDest.firstChild);
    }
    while(redGraphDest.firstChild){
        redGraphDest.removeChild(redGraphDest.firstChild);
    }
    greenData = graph(greenGraphDest, [], [], []);
    redData = graph(redGraphDest, [], [], []);
    x = 0;
    frame = 1;
    if (!paused) {
        loop = setInterval(draw, frameDelay);
    }
}

function play() {
        paused = false;
        loop = setInterval(draw, frameDelay);
        var button=document.getElementById("play");
        button.innerHTML = "Pause (press k)";
        button.id = "pause";
        button.onclick=pause;
}
function pause() {
        paused = true;
        clearInterval(loop);
        var button=document.getElementById("pause");
        button.innerHTML = "Resume (press k)";
        button.id = "play";
        button.onclick=play
}

$(document).ready(function () {
    $("#start").click(start);
    document.getElementById("pause").onclick=pause;
    document.onkeypress = function (e) {
        e = e || window.event;
        if (e.which == 107) {
            if (paused) {
                play();
            } else {
                pause();
            }
        }
        // use e.keyCode
    };
});
init();
