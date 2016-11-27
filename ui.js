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
//The main div for large data input output
var data_div = document.getElementById('data');
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
//File saving and reading
var save_button = document.getElementById('save_button');
var filename_field = document.getElementById('filename_textfield');
var open_button = document.getElementById('open_button');
var file_selector = document.getElementById('file_selector');
//Data inputing
var add_data_button = document.getElementById('add_data_button');

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

	//Switch to front panel view
	$('#button-panel').trigger('click');

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

//Setting up file stuff
save_button.onclick = function() {
	//Build the file up line by line
	var strings = [];
	strings.push("////////////////////\n//Configuration\n////////////////////\n");
	strings.push("timestep ", timestep_field.value, "\n");
	strings.push("codestep ", codestep_field.value, "\n");
	strings.push("////////////////////\n//Data\n////////////////////\n");
	for(var i = 0;i < datas.length;i++) {
		strings.push("//////////////////\n");
		strings.push(datas[i].name_field.value, "\n");
		strings.push(datas[i].type_field.value, "\n");
		strings.push(datas[i].data_field.value, "\n");
	}
	strings.push("////////////////////\n//Init Code\n////////////////////\n");
	strings.push(init_area.value, "\n");
	strings.push("////////////////////\n//Step Code\n////////////////////\n");
	strings.push(step_area.value, "\n");

	var blob = new Blob(strings, {type: "text/plain;charset=utf-8"});
	saveAs(blob, filename_field.value);
}
open_button.onclick = function() {
	var reader = new FileReader();
	reader.onloadend = function() {
		//Actually handle parsing it now
		var lines = reader.result.split('\n');
		var mode = '';
		var init_text = '';
		var step_text = '';
		while(datas.length > 0) datas[0].remove_button.onclick();
		for(var i = 0;i < lines.length;i++) {
			//Switching between the modes
			if(i < lines.length - 2 &&
			   lines[i] == '////////////////////' &&
			   lines[i + 2] == '////////////////////') {
				mode = lines[i + 1];
				i += 2;
				continue;
			}
			if(mode == '//Configuration') {
				var parts = lines[i].split(' ');
				window[parts[0] + '_field'].value = parts.slice(1).join(' ');
			}
			else if(mode == '//Data') {
				if(lines[i] == '//////////////////') {
					add_datafield();
					datas[datas.length - 1].name_field.value = lines[i + 1];
					datas[datas.length - 1].type_field.value = lines[i + 2];
					datas[datas.length - 1].type_field.onchange();
					datas[datas.length - 1].data_field.value = lines[i + 3];
					i += 3;
				}
				else {
					datas[datas.length - 1].data_field.value += "\n" + lines[i];
				}
			}
			else if(mode == '//Init Code') {
				init_text += lines[i] + '\n';
			}
			else if(mode == '//Step Code') {
				step_text += lines[i] + '\n';
			}
		}

		//Strip whitespace if there is any at the end of the code
		init_area.value = init_text.replace(/\s$/, '');
		step_area.value = step_text.replace(/\s$/, '');
	}
	reader.onerror = function () {
		alert('Error reading file');
	}
	reader.readAsText(file_selector.files[0]);
	filename_field.value = file_selector.files[0].name;
}

//Setting up large data inputs
add_data_button.onclick = add_datafield;

function add_datafield() {
	var data = {};

	//The name of the data that the user script can access
	data.name_field = document.createElement('input');
	data.name_field.type = 'text';

	//Change what type of data this can be
	data.type_field = document.createElement('select');
	data.type_field.appendChild(document.createElement('option'));
	data.type_field.lastElementChild.value = 'shorttext';
	data.type_field.lastElementChild.innerHTML = 'Short Text';
	data.type_field.lastElementChild.selected = true;
	data.type_field.appendChild(document.createElement('option'));
	data.type_field.lastElementChild.value = 'number';
	data.type_field.lastElementChild.innerHTML = 'Number';
	data.type_field.appendChild(document.createElement('option'));
	data.type_field.lastElementChild.value = 'longtext';
	data.type_field.lastElementChild.innerHTML = 'Long Text';

	//Allow the user to remove data fields
	data.remove_button = document.createElement('button');
	data.remove_button.type = 'text';
	data.remove_button.classList.add('btn', 'btn-default');
	data.remove_button.innerHTML = '-';

	//Initial creation of an input element for the data
	data.data_field = document.createElement('input');
	data.data_field.type = 'text';

	//Build the div
	data.div = document.createElement('div');
	data.div.appendChild(data.name_field);
	data.div.appendChild(data.type_field);
	data.div.appendChild(data.remove_button);
	data.div.appendChild(document.createElement('br'));
	data.div.appendChild(data.data_field);

	//Data type switching code
	data.type_field.onchange = function() {
		var data_field;
		switch(data.type_field.value) {
		case 'number':
			data_field = document.createElement('input');
			data_field.type = 'number';
			data_field.value = data.data_field.value;
			break;
		case 'longtext':
			data_field = document.createElement('textarea');
			data_field.rows = 20;
			data_field.cols = 80;
			data_field.style.fontFamily = 'Liberation Mono, monospace';
			data_field.value = data.data_field.value;
			break;
		case 'shorttext':
		default:
			data_field = document.createElement('input');
			data_field.type = 'text';
			data_field.value = data.data_field.value;
			break;
		}
		data.div.replaceChild(data_field, data.data_field);
		data.data_field = data_field;
	}

	//Remove data code
	data.remove_button.onclick = function() {
		data_div.removeChild(data.div);
		datas.splice(datas.indexOf(data), 1);
	}

	data_div.insertBefore(data.div, data_div.lastElementChild);
	datas.push(data);
}

function write_datafield(name, data) {
	for(var i = 0;i < datas.length;i++) {
		//We have a match
		if(datas[i].name_field.value == name) {
			datas[i].data_field.value = data;
			return;
		}
	}
}

function read_datafield(name) {
	for(var i = 0;i < datas.length;i++) {
		//We have a match
		if(datas[i].name_field.value == name) {
			return datas[i].data_field.value;
		}
	}
}
