//Constants
var States = Object.freeze({stopped: 0,
							running: 1,
							paused: 2});
//Simulator Variables
var state = States.stopped;
var timerID;

var ins;
var fns;
var outs;
var tmps;
var tindex;
var uis;
var uindex;

//Writing button labels
function apply_labels() {
	var start_button = document.getElementById('start_button');
	var pause_button = document.getElementById('pause_button');
	var step_button = document.getElementById('step_button');
	switch(state) {
	case States.stopped:
		start_button.innerHTML = "Start";
		pause_button.innerHTML = "Start Step";
		step_button.disabled = true;
		break;
	case States.paused:
		start_button.innerHTML = "Stop";
		pause_button.innerHTML = "Resume";
		step_button.disabled = false;
		break;
	case States.running:
		start_button.innerHTML = "Stop";
		pause_button.innerHTML = "Pause";
		step_button.disabled = true;

	}
}
apply_labels();

//Button input functions

function start_pressed() {
	switch(state) {
	case States.stopped:
		setState(States.running);
		break;
	case States.running:
	case States.paused:
		setState(States.stopped);
		break;
	}
}

function pause_pressed() {
	switch(state) {
	case States.paused:
		setState(States.running);
		break;
	case States.running:
		setState(States.paused);
		break;
	case States.stopped:
		setState(States.paused);
		break;
	}
}

function step_pressed() {
	switch(state) {
	case States.paused:
		step();
		break;
	}
}

//This function sets the main state of the simulator
//Takes into account the previous states too
function setState(new_state) {
	switch(state) {
	case States.stopped:
		switch(new_state) {
		case States.paused:
			state = States.paused;
			init();
			break;
		case States.running:
			state = States.running;
			init() && resume();
			break;
		}
		break;
	case States.paused:
		switch(new_state) {
		case States.stopped:
			state = States.stopped;
			break;
		case States.running:
			state = States.running;
			resume();
			break;
		}
		break;
	case States.running:
		switch(new_state) {
		case States.stopped:
			state = States.stopped;
			pause();
			break;
		case States.paused:
			state = States.paused;
			pause();
			break;
		}
		break;
	}
	apply_labels();
}

function init() {
	var timestep = document.getElementById('timestep_textfield').value;

	//Bail early if we have any errors
	if(isNaN(timestep) || !timestep) {
		alert("Simulation Timestep is not a number");
		setState(States.stopped);
		return false;
	}
	if(+timestep == 0) {
		alert("Simulation Timestep cannot be zero");
		setState(States.stopped);
		return false;
	}

	//Actual init stuff now
	console.log("INIT");

	internal_init(+timestep / 1000);

	return true;
}

function internal_init(timestep) {
	ins = {};
	outs = {};
	tmps = [];
	uis = [];

	ins.tick = 0;
	ins.t = 0;
	ins.dt = timestep;
	ins.init = true;
	tindex = 0;
	unidex = 0;

	//Stuff in here should only write back to ins
	var init_code = document.getElementById('init_textarea').value;
	eval(init_code);
	tmps = []; //Just in case

	internal_step(timestep, true);
}

function internal_step(timestep, initialize) {
	ins.dt = timestep;
	ins.init = initialize;
	tindex = 0;

	var step_code = document.getElementById('step_textarea').value;
	eval(step_code);
	outs.tick = ins.tick + 1;
	outs.t = outs.tick * timestep;
	for(var k in outs) ins[k] = outs[k];
}

function resume() {
	var codestep = document.getElementById('codestep_textfield').value;

	//Bail early if we have any errors
	if(isNaN(codestep) || !codestep) {
		alert("Code Run Timestep is not a number");
		setState(States.paused);
		return false;
	}

	//console.log("RESUME");
	timerID = window.setInterval(step, +codestep);

	return true;
}

function pause() {
	//console.log("PAUSE");
	window.clearInterval(timerID);

	return true;
}

function step() {
	var timestep = document.getElementById('timestep_textfield').value;

	//Bail early if we have any errors
	if(isNaN(timestep) || !timestep) {
		alert("Simulation Timestep is not a number");
		setState(States.paused);
		return false;
	}
	if(+timestep == 0) {
		alert("Simulation Timestep cannot be zero");
		setState(States.paused);
		return false;
	}

	//Do actual stepping stuff now
	console.log("STEP");

	internal_step(+timestep / 1000, false);

	return true;
}

//Functions
fns = {};
function addFunction(name, func) {
	fns[name] = function() {
		if(ins.init) {
			tmps[tindex] = {};
		}
		return func(arguments, tmps[tindex++]);
	}
}
fns.log = function(text) {
	document.getElementById('out_textarea').value += text + '\n';
}
addFunction("integral", function(args, tmp) {
	if(ins.init) {
		tmp.acc = 0;
		return 0;
	}
	else {
		tmp.acc += args[0] * ins.dt;
		return tmp.acc;
	}
});
