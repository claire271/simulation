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
		//Initial creation of label and graph view
		ui.appendChild(document.createTextNode(args[1]));
		ui.appendChild(document.createElement('br'));
		tmp.output = d3.select(ui).append('svg')
			.style('position', 'absolute')
			.style('left', '0px').style('top', '0px')
			.style('width', '100%').style('height', '100%');

		//Create groups
		tmp.ggrid = tmp.output.append('g');
		tmp.ggraphs = tmp.output.append('g');
		tmp.glabels = tmp.output.append('g');
		tmp.guline = tmp.output.append('g');

		//Getting the view width and height for line width purposes
		tmp.width = tmp.output.node().getBoundingClientRect().width;
		tmp.height = tmp.output.node().getBoundingClientRect().height;

		//Shift for easier drawing
		//tmp.output.attr('viewBox', '-1 0 ' + tmp.width + ' ' + tmp.height);
		//tmp.output.style('font-size','.1px')

		tmp.config = {t_width: 0, t_spacing: 0, maxs: [], mins: [], spacing: []};
		tmp.tlines = [];

		//Create the updater line
		tmp.toffset = 0;
		tmp.uline = tmp.guline.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', tmp.height)
			.attr('stroke-width', 2)
			.attr('stroke', 'violet');
	}

	//Modify counter and graph stuff if the time width has changed
	if(tmp.config.t_width != args[2].t_width) {
	}

	//Change offset if we're going off the edge of the screen
	if(ins.t - tmp.toffset >= args[2].t_width) {
		tmp.toffset += args[2].t_width;
	}
	//Move the update line
	var upos = tmp.width * (ins.t - tmp.toffset) / args[2].t_width;
	tmp.uline.attr('x1', upos).attr('x2', upos);

	//See if the time spacing stuff has changed
	if(tmp.config.t_width != args[2].t_width ||
	   tmp.config.t_spacing != args[2].t_spacing) {
		//Copy over parameters
		tmp.config.t_width = args[2].t_width;
		tmp.config.t_spacing = args[2].t_spacing;

		//Removing old lines
		for(var i = 0;i < tmp.tlines.length;i++) {
			tmp.tlines[i].remove();
		}
		tmp.tlines = [];

		//Adding actual lines
		var t_count = Math.round(tmp.config.t_width/tmp.config.t_spacing);
		for(var i = 0;i <= t_count;i++) {
			tmp.tlines[i] = tmp.ggrid.append('line')
				.attr('x1', tmp.width * i/t_count)
				.attr('y1', 0)
				.attr('x2', tmp.width * i/t_count)
				.attr('y2', tmp.height)
				.attr('stroke-width', 1)
				.attr('stroke', 'gray');
		}
	}

	var changed = false;

	//var line = document.createElementNS('http://www.w3.org/2000/svg','line');
	//tmp.output.appendChild(line);


}, true, true);
