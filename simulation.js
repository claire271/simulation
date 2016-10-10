/////////////////////////////////////////////
// Constants

//All possible states of the simulator
var States = Object.freeze({stopped: 0,
							running: 1,
							paused: 2});

/////////////////////////////////////////////
// Simulator internal variables

//Current state of the simulator
//Must be a state in the enum States ^
var state = States.stopped;

//If the simulator is running on a timer, this will be its ID
var timerID;

//For functions that require persistent temp storage
var tmps;
//For indexing temp variable functions
var tindex;
//For functions that write or read from the front panel
var uis;
//For indexing UI functions
var uindex;

/////////////////////////////////////////////
// Variables used by the simulation

//Previous simulation values
var ins;
//New simulation values
var outs;
//Functions specifically for the simulator
var fns;

/////////////////////////////////////////////
// HTML elements

//The main UI panel for the user simulation
var panel = document.getElementById('panel');
//The main debug log for the user simulation
var log = document.getElementById('out_textarea');
//Buttons
var start_button = document.getElementById('start_button');
var pause_button = document.getElementById('pause_button');
var step_button = document.getElementById('step_button');
//Input areas
var timestep_field = document.getElementById('timestep_textfield');
var codestep_field = document.getElementById('codestep_textfield');
//Input fields
var init_area = document.getElementById('init_textarea');
var step_area = document.getElementById('step_textarea');

//Writing button labels depending on state
function apply_labels() {
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

//Need to apply initial labels
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
	var timestep = timestep_field.value;

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
	uindex = 0;

	//Need to clear panel and log too
	panel.innerHTML = '';
	log.value = "";

	//Stuff in here should only write back to ins
	var init_code = init_area.value;
	eval(init_code);
	tmps = []; //Just in case

	internal_step(timestep, true);
}

function internal_step(timestep, initialize) {
	ins.dt = timestep;
	ins.init = initialize;
	tindex = 0;
	uindex = 0;

	var step_code = step_area.value;
	eval(step_code);
	ins.tick++;
	ins.t = ins.tick * ins.dt;
	for(var k in outs) ins[k] = outs[k];
}

function resume() {
	var codestep = codestep_field.value;

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
	var timestep = timestep_field.value;

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
function addFunction(name, func, use_tmp, use_ui) {
	fns[name] = function() {
		var tmp;
		var ui;
		if(ins.init) {
			if(use_tmp) tmps[tindex] = {};
			if(use_ui) {
				uis[uindex] = document.createElement('div');
				uis[uindex].style = "position: absolute; " + arguments[0];
				panel.appendChild(uis[uindex]);
			}
		}
		if(use_tmp) tmp = tmps[tindex++];
		if(use_ui) ui = uis[uindex++];
		return func(arguments, tmp, ui);
	}
}
fns.log = function(text) {
	log.value += text + '\n';
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
}, true, false);
addFunction("number_output", function(args, tmp, ui) {
	if(ins.init) {
		ui.appendChild(document.createTextNode(args[1]));
		ui.appendChild(document.createElement('br'));
		var input = document.createElement('input');
		input.disabled = true;
		input.type = 'number';
		ui.appendChild(input);
	}
	ui.lastChild.value = args[2];
}, false, true);
