/////////////////////////////////////////////
// Simulator internal variables

//For functions that require persistent temp storage
var tmps;
//For indexing temp variable functions
var tindex;
//For functions that write or read from the front panel
var uis;
//For indexing UI functions
var uindex;
//The actual user simulated init
var user_init;
//The actual user simulated step
var user_step;

/////////////////////////////////////////////
// Variables used by the simulation

//Previous simulation values
var ins;
//New simulation values
var outs;
//Functions specifically for the simulator
var fns;

/////////////////////////////////////////////
//String hash expander function
function expand_hash(input) {
	var output = '';

	//Split into lines
	for(line of input.split('\n')) {
		var is_input = true;
		var inside_array = false;

		//Limits are offset from ends to protect from over/under run
		for(var i = line.length - 1;i >= 0;i--) {

			//Array detection
			if(!is_input && line[i] == ']') {
				inside_array = true;
			}
			if(!is_input && line[i] == '[') {
				inside_array = false;
				is_input = true;
			}

			//Hash detection and substitution
			if(line[i] == '#') {
				line = line.slice(0, i) + (is_input ? 'ins.' : 'outs.') + line.slice(i + 1);
				if(!inside_array) {
					is_input = true;
				}
			}

			//Assignment operator detection
			if(i > 0 &&
			   !hash_is_part(line[i]) &&
			   line[i - 1] == '=') {
				var offset = -1;
				//Token only 1 char long
				if(i > 2 && !hash_is_part(line[i - 2])) {
					offset = 1;
				}
				//Only apply this behavior on plain assignment
				/*
				//Token is 2 chars long
				else if(i > 3 && !hash_is_part(line[i - 3])) {
					if(line[i - 2] == '+' ||
					   line[i - 2] == '-' ||
					   line[i - 2] == '*' ||
					   line[i - 2] == '/' ||
					   line[i - 2] == '%' ||
					   line[i - 2] == '&' ||
					   line[i - 2] == '^' ||
					   line[i - 2] == '|') {
						offset = 2;
					}
				}
				//Token is 3 chars long
				else if(i > 4 && !hash_is_part(line[i - 4])) {
					if((line[i - 2] == '*' && line[i - 3] == '*') ||
					   (line[i - 2] == '<' && line[i - 3] == '<') ||
					   (line[i - 2] == '>' && line[i - 3] == '>')) {
						offset = 3;
					}
				}
				//Token is 4 chars long
				else if(i > 5 && !hash_is_part(line[i - 5])) {
					if(line[i - 2] == '>' && line[i - 3] == '>' && line[i - 4] == '>') {
						offset = 4;
					}
				}
				*/
				//We actually have an assigment operator
				if(offset > 0) {
					is_input = false;
				}
			}
		}
		output += line + '\n';
	}

	return output;
}
function hash_is_part(curr) {
	return curr == '=' || curr == '+' ||
		curr == '-' || curr == '*' ||
		curr == '/' || curr == '%' ||
		curr == '<' || curr == '>' ||
		curr == '&' || curr == '^' ||
		curr == '|' || curr == '!';
}

/////////////////////////////////////////////
//Step and init Functions

function sim_init(timestep, init_func, step_func) {
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

	//Set user functions
	user_init = init_func;
	user_step = step_func;

	//Need to clear panel and log too
	panel.innerHTML = '';
	log.value = "";

	//Stuff in here should only write back to ins
	//var init_code = init_area.value;
	//eval(init_code);
	try {
		user_init(ins, outs, fns);
	}
	catch(err) {
		alert("Error in init code. See log for details");
		log.value = "Error in init code.\n";
		log.value += err + "\n";
		log.value += "Line:Column - " + err.stack.split("\n")[0].split("eval:")[1];
		setState(States.stopped);
		return;
	}
	tmps = []; //Just in case
	for(var k in outs) ins[k] = outs[k];

	sim_step(timestep, true);
}

function sim_step(timestep, initialize) {
	ins.dt = timestep;
	ins.init = initialize;
	tindex = 0;
	uindex = 0;

	//var step_code = step_area.value;
	//eval(step_code);
	try {
		user_step(ins, outs, fns);
	}
	catch(err) {
		alert("Error in step code. See log for details");
		log.value = "Error in step code.\n";
		log.value += err + "\n";
		log.value += "Line:Column - " + err.stack.split("\n")[0].split("eval:")[1];
		setState(States.stopped);
		return;
	}
	ins.tick++;
	ins.t = ins.tick * ins.dt;
	for(var k in outs) ins[k] = outs[k];
}

/////////////////////////////////////////////
//Simulation functions
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
		tmp.input = document.createElement('input');
		tmp.input.disabled = true;
		tmp.input.type = 'number';
		ui.appendChild(tmp.input);
	}
	tmp.input.value = args[2];
}, true, true);
addFunction("number_input", function(args, tmp, ui) {
	if(ins.init) {
		ui.appendChild(document.createTextNode(args[1]));
		ui.appendChild(document.createElement('br'));
		tmp.input = document.createElement('input');
		tmp.input.type = 'number';
		ui.appendChild(tmp.input);
		tmp.input.onchange = function() {
			if(tmp.input.value != "") {
				tmp.val = tmp.input.value;
			}
		};

		tmp.val = args[2];
		tmp.input.value = tmp.val;
	}
	return tmp.val;
}, true, true);
addFunction("graph", function(args, tmp, ui) {
	if(ins.init) {
		ui.appendChild(document.createTextNode(args[1]));
		ui.appendChild(document.createElement('br'));
		tmp.output = document.createElement('svg');
		tmp.output.style.position = 'absolute';
		tmp.output.style.left = '0px';
		tmp.output.style.top = '0px';
		tmp.output.style.width = '100%';
		tmp.output.style.height = '100%';
		ui.appendChild(tmp.output);

		tmp.width = tmp.output.clientWidth;
		tmp.height = tmp.output.clientHeight;
	}

	var config = args[2];

	var t_count = Math.round(config.t_width/config.t_spacing);
	for(var i = 0;i <= t_count;i++) {
	}

	var line = document.createElementNS('http://www.w3.org/2000/svg','line');
	tmp.output.appendChild(line);


}, true, true);
