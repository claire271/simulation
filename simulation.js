//Constants
var States = Object.freeze({stopped: 0,
							running: 1,
							paused: 2});
//Simulator Variables
var state = States.stopped;
var timerID;

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
			init();
			resume();
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
	//Actual init stuff now
	console.log("INIT");

}

function resume() {
	var timestep = document.getElementById('codestep_textfield').value;

	//Bail early if we have any errors
	if(isNaN(timestep) || !timestep) {
		alert("Code Run Timestep is not a number");
		setState(States.paused);
		return;
	}

	console.log("RESUME");
	timerID = window.setInterval(step, +timestep);
}

function pause() {
	console.log("PAUSE");
	window.clearInterval(timerID);
}

function step() {
	var timestep = document.getElementById('timestep_textfield').value;

	//Bail early if we have any errors
	if(isNaN(timestep) || !timestep) {
		alert("Simulation Timestep is not a number");
		setState(States.paused);
		return;
	}
	if(+timestep == 0) {
		alert("Simulation Timestep cannot be zero");
		setState(States.paused);
		return;
	}

	//Do actual stepping stuff now
	console.log("STEP");
}
