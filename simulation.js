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

/////////////////////////////////////////////
// Variables used by the simulation

//Previous simulation values
var ins;
//New simulation values
var outs;
//Functions specifically for the simulator
var fns;

function sim_init(timestep) {
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

	sim_step(timestep, true);
}

function sim_step(timestep, initialize) {
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
