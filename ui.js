//The entire start/pause/step button interface is a state machine

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

//Set up button actions
start_button.onclick = start_pressed;
pause_button.onclick = pause_pressed;
step_button.onclick = step_pressed;

//Writing button labels depending on state
function apply_labels() {
	switch(state) {
	case States.stopped:
		start_button.innerHTML = "Start";
		pause_button.innerHTML = "Start Step";
		step_button.innerHTML = "Step";
		step_button.disabled = true;
		break;
	case States.paused:
		start_button.innerHTML = "Stop";
		pause_button.innerHTML = "Resume";
		step_button.innerHTML = "Step";
		step_button.disabled = false;
		break;
	case States.running:
		start_button.innerHTML = "Stop";
		pause_button.innerHTML = "Pause";
		step_button.innerHTML = "Step";
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
		ui_step();
		break;
	}
}

function setInputDisabled(disabled) {
	timestep_field.disabled = disabled;
	codestep_field.disabled = disabled;
	init_area.disabled = disabled;
	step_area.disabled = disabled;
}

//This function sets the main state of the simulator
//Takes into account the previous states too
function setState(new_state) {
	switch(state) {
	case States.stopped:
		switch(new_state) {
		case States.paused:
			state = States.paused;
			setInputDisabled(true);
			ui_init();
			break;
		case States.running:
			state = States.running;
			setInputDisabled(true);
			ui_init() && ui_resume();
			break;
		}
		break;
	case States.paused:
		switch(new_state) {
		case States.stopped:
			state = States.stopped;
			setInputDisabled(false);
			break;
		case States.running:
			state = States.running;
			ui_resume();
			break;
		}
		break;
	case States.running:
		switch(new_state) {
		case States.stopped:
			state = States.stopped;
			setInputDisabled(false);
			ui_pause();
			break;
		case States.paused:
			state = States.paused;
			ui_pause();
			break;
		}
		break;
	}
	apply_labels();
}

function ui_init() {
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

	//These trys will only catch some errors
	try {
		var init_function = eval("(function(ins, outs, fns) {" +
								 expand_hash(init_area.value) +
								 "})");
	}
	catch(err) {
		alert("Error in init code. See log for details");
		log.value = "Error in init code.\n";
		log.value += err + "\n";
		log.value += "Line:Column - " + err.stack.split("\n")[0].split("eval:")[1];
		setState(States.stopped);
		return;
	}
	try {
		var step_function = eval("(function(ins, outs, fns) {" +
								 expand_hash(step_area.value) +
								 "})");
	}
	catch(err) {
		alert("Error in step code. See log for details");
		log.value = "Error in step code.\n";
		log.value += err + "\n";
		log.value += "Line:Column - " + err.stack.split("\n")[0].split("eval:")[1];
		setState(States.stopped);
		return;
	}

	sim_init(+timestep / 1000, init_function, step_function);

	return true;
}

function ui_resume() {
	var codestep = codestep_field.value;

	//Bail early if we have any errors
	if(isNaN(codestep) || !codestep) {
		alert("Code Run Timestep is not a number");
		setState(States.paused);
		return false;
	}

	//console.log("RESUME");
	timerID = window.setInterval(ui_step, +codestep);

	return true;
}

function ui_pause() {
	//console.log("PAUSE");
	window.clearInterval(timerID);

	return true;
}

function ui_step() {
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

	sim_step(+timestep / 1000, false);

	return true;
}
