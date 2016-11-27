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
//The actual user simulated end
var user_end;

/////////////////////////////////////////////
// Variables used by the simulation

//External data variables
var datas = [];
//Previous simulation values
var ins;
//New simulation values
var outs;
//Functions specifically for the simulator
var Sim;

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

function sim_init(timestep, init_func, step_func, end_func) {
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
	user_end = end_func;

	//Need to clear panel and log too
	panel.innerHTML = '';
	log.value = "";

	//Stuff in here should only write back to ins
	//var init_code = init_area.value;
	//eval(init_code);
	try {
		user_init(ins, outs, Sim);
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
		user_step(ins, outs, Sim);
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

function sim_end(timestep) {
	ins.dt = timestep;
	ins.init = true;
	tindex = 0;
	uindex = 0;

	try {
		user_end(ins, outs, Sim);
	}
	catch(err) {
		alert("Error in end code. See log for details");
		log.value = "Error in end code.\n";
		log.value += err + "\n";
		log.value += "Line:Column - " + err.stack.split("\n")[0].split("eval:")[1];
		setState(States.stopped);
		return;
	}
}

/////////////////////////////////////////////
//Simulation functions
Sim = {};
function addFunction(name, func, use_tmp, use_ui) {
	Sim[name] = function() {
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

//Usage: log(text)
Sim.log = function(text) {
	log.value += text + '\n';
}

//Usage: integral(value)
addFunction("integral", function(args, tmp) {
	if(ins.init) {
		tmp.acc = 0;
		return 0;
	}
	else {
		tmp.acc += args[0] * ins.dt;
		//Check minimum (optional)
		if(args[1] !== undefined && tmp.acc < args[1]) tmp.acc = args[1];
		//Check maximum (optional)
		if(args[2] !== undefined && tmp.acc > args[2]) tmp.acc = args[2];
		return tmp.acc;
	}
}, true, false);

//Usage: derivative(value)
addFunction("derivative", function(args, tmp) {
	if(ins.init) {
		tmp.old = args[0];
	}
	var slope = (args[0] - tmp.old) / ins.dt;
	tmp.old = args[0];
	return slope;
}, true, false)

//Usage: number_input(position, label, value)
//position = 'top: <dist from top>px; left: <dist from left>px;'
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

//Usage: number_input(position, label, initial_value)
//position = 'top: <dist from top>px; left: <dist from left>px;'
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

//Usage: graph(position, label, limits, inputs)
//position = 'top: <dist from top>px; left: <dist from left>px; width: <width>px; height: <height>px;'
//limits = {t_width: <time to show>, t_spacing: <time between vertical lines>,
//          maxs:[<a max>, <b max>, ...], mins:[<a min>, <b min>, ...],
//          spacings: [<a spacing>, <b spacing>, ...], colors: [<a color>, <b color>, ...]}
//inputs = [<a value>, <b value>, ...]
addFunction("graph", function(args, tmp, ui) {
	const vlwidth = 50;
	if(ins.init) {
		//Number of plots drawn on this
		tmp.vcount = args[2].maxs.length;

		//Initial creation of label and graph view
		var label_div = document.createElement('div');
		label_div.style.position = 'absolute';
		label_div.style.top = '0px';
		label_div.style.left = vlwidth * tmp.vcount + 'px';
		label_div.appendChild(document.createTextNode(args[1])); //Label (consistent with other UI elements)
		ui.appendChild(label_div);
		ui.appendChild(document.createElement('br'));
		//Actual view being drawn on
		tmp.output = d3.select(ui).append('svg')
			.style('position', 'absolute')
			.style('left', '0px').style('top', '0px')
			.style('width', '100%').style('height', '100%');

		//Getting the view width and height for line width purposes
		tmp.rwidth = tmp.output.node().getBoundingClientRect().width;   //(Real) width [of the entire svg]
		tmp.rheight = tmp.output.node().getBoundingClientRect().height; //(Real) height [of the entire svg]
		tmp.offx = vlwidth * tmp.vcount;                                //How much space is on the left of the plot
		tmp.offy = 25;                                                  //How much space is on top of the plot
		tmp.width = tmp.rwidth - vlwidth * (tmp.vcount + 1);            //width [of the plot]
		tmp.height = tmp.rheight - 50;                                  //height [of the plot]

		//Shift for easier drawing
		tmp.output.attr('viewBox', -tmp.offx + ' ' + -tmp.offy + ' ' + tmp.rwidth + ' ' + tmp.rheight);

		//Create groups for proper ordering
		tmp.ggrid = tmp.output.append('g');   //(Group) grid
		tmp.ggraphs = tmp.output.append('g'); //(Group) graphs
		tmp.glabels = tmp.output.append('g'); //(Group) labels
		tmp.guline = tmp.output.append('g');  //(Group update) line

		//Draw outline box
		tmp.ggrid.append('rect')
			.attr('x', -1)
			.attr('y', -1)
			.attr('width', tmp.width)
			.attr('height', tmp.height)
			.attr('fill', 'none')
			.attr('stroke', 'gray')
			.attr('stroke-width', 1);

		//Create the updater line and offset for it
		tmp.toffset = 0; //Time offset [time between the left edge of the graph and the update line]
		tmp.uline = tmp.guline.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', tmp.height)
			.attr('stroke-width', 2)
			.attr('stroke', 'violet');

		//Some initial configuration
		tmp.config = args[2];

		//Validate the configuration
		if(tmp.config.maxs.length != tmp.config.mins.length ||
		   tmp.config.maxs.length != tmp.config.spacings.length ||
		   tmp.config.maxs.length != tmp.config.colors.length) {
			throw 'ERROR: Maxs, mins, spacings, and colors of a grapher must match in length.';
		}

		//(Set Time) labels
		tmp.stlabels = function(tmp) {
			for(var i = 0;i < tmp.tlabels.length;i++) {
				tmp.tlabels[i].text((tmp.toffset + tmp.config.t_width * i/(tmp.tlabels.length - 1)).toPrecision(3));
			}
		}

		tmp.tlabels = []; //(Time) labels
		//(Regenerate Time) labels
		tmp.rtlabels = function(tmp) {
			//Remove old labels
			for(var i = 0;i < tmp.tlabels.length;i++) {
				tmp.tlabels[i].remove();
			}
			tmp.tlabels = [];

			//Create new labels
			var t_count = Math.round(tmp.config.t_width/tmp.config.t_spacing);
			for(var i = 0;i <= t_count;i++) {
				tmp.tlabels[i] = tmp.glabels.append('text')
					.attr('x', tmp.width * i/t_count)
					.attr('y', tmp.height + 2)
					.attr('dominant-baseline', 'hanging')
					.attr('text-anchor', 'middle');

			}
			tmp.stlabels(tmp);
		};
		tmp.rtlabels(tmp);

		tmp.graphs = []; //Graph [line]s
		tmp.values = []; //Values
		for(var i = 0;i < tmp.vcount;i++) {
			tmp.graphs[i] = [];
			tmp.values[i] = [];
		}
		tmp.tlines = []; //(Time) lines
		//(Regenerate Time) lines
		tmp.rtlines = function(tmp,args) {
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

			//Also handle changing the number of segments in each plot
			var noffset = tmp.toffset;
			while(ins.t - noffset >= tmp.config.t_width) {
				noffset += tmp.config.t_width;
			}
			var l_count = Math.round(tmp.config.t_width / ins.dt);
			var l_old = tmp.graphs[0].length;

			var i1 = Math.round((ins.t - tmp.toffset) / ins.dt); //Old index of the update line
			var k1 = Math.round((ins.t - noffset) / ins.dt);     //New index of the update line

			for(var j = 0;j < tmp.graphs.length;j++) {
				//The timespan has increased
				if(l_count > tmp.graphs[j].length) {
					for(var i = 0;i < tmp.graphs[j].length;i++) {
						tmp.graphs[j][i]
							.attr('x1', tmp.width * i/l_count)
							.attr('x2', tmp.width * (i + 1)/l_count);
					}
					for(var i = tmp.graphs[j].length;i < l_count;i++) {
						tmp.graphs[j][i] = tmp.ggraphs.append('line')
							.attr('x1', tmp.width * i/l_count)
							.attr('y1', 0)
							.attr('x2', tmp.width * (i + 1)/l_count)
							.attr('y2', 0)
							.attr('stroke-width', 1)
							.attr('display', 'none')
							.attr('stroke', tmp.config.colors[j]);
						tmp.values[j][i] = 0;
					}

					//Shift things after the line over
					var diff = l_count - l_old;
					console.log(l_old);
					for(var i = l_old - 1;i >= k1;i--) {
						var line_old = tmp.graphs[j][i];
						tmp.graphs[j][i + diff]
							.attr('y1',line_old.attr('y1'))
							.attr('y2',line_old.attr('y2'))
							.attr('display', line_old.attr('display'));
						line_old.attr('display', 'none');
						tmp.values[j][i + diff] = tmp.values[j][i];
					}
				}
				//The timespan has decreased
				else if(l_count < tmp.graphs[j].length) {
					for(var i = 0;i < l_count;i++) {
						tmp.graphs[j][i]
							.attr('x1', tmp.width * i/l_count)
							.attr('x2', tmp.width * (i + 1)/l_count);
					}
					for(var i = l_count - 1;i >= 0;i--) {
						var index_old = (i1 - i + l_old) % l_old;
						var index_new = (k1 - i + l_count) % l_count;
						var line_old = tmp.graphs[j][index_old];
						tmp.graphs[j][index_new]
							.attr('y1', line_old.attr('y1'))
							.attr('y2', line_old.attr('y2'))
							.attr('display', line_old.attr('display'));
						tmp.values[j][index_new] = tmp.values[j][index_old];
					}

					for(var i = l_count;i < tmp.graphs[j].length;i++) {
						tmp.graphs[j][i].remove();
					}
					tmp.graphs[j].length = l_count;
					tmp.values[j].length = l_count;
				}
			}
		};
		tmp.rtlines(tmp,args);
		//Initialize first segment on first run
		var l_count = Math.round(tmp.config.t_width / ins.dt);
		for(var j = 0;j < tmp.graphs.length;j++) {
			var ypos = tmp.height * (1 - (args[3][j] - tmp.config.mins[j]) / (tmp.config.maxs[j] - tmp.config.mins[j]))
			tmp.graphs[j][tmp.graphs[j].length - 1]
				.attr('y1', ypos);
		}

		tmp.vlabels = []; //(Values) labels
		//(Regenerate Values) labels
		tmp.rvlabels = function(tmp) {
			//Remove old labels
			for(var i = 0;i < tmp.vlabels.length;i++) {
				tmp.vlabels[i].remove();
			}
			tmp.vlabels = [];

			//Create new labels
			for(var j = 0;j < tmp.config.maxs.length;j++) {
				var v_width = tmp.config.maxs[j] - tmp.config.mins[j];
				var v_spacing = tmp.config.spacings[j];
				var v_count = Math.abs(Math.round(v_width/v_spacing));
				var v_offset = tmp.config.mins[j];
				var v_color = tmp.config.colors[j];
				for(var i = 0;i <= v_count;i++) {
					tmp.vlabels[tmp.vlabels.length] = tmp.glabels.append('text')
						.attr('x', -vlwidth * j - 10)
						.attr('y', tmp.height * (1 - i/v_count))
						.attr('fill', v_color)
						.attr('dominant-baseline', 'central')
						.attr('text-anchor', 'end')
						.text((v_offset + v_width * i/v_count).toPrecision(3));
				}
			}
		};
		tmp.rvlabels(tmp);

		tmp.vlines = []; //(Values) lines
		//(Regenerate Value) lines
		tmp.rvlines = function(tmp) {
			//Removing old lines
			for(var i = 0;i < tmp.vlines.length;i++) {
				tmp.vlines[i].remove();
			}
			tmp.vlines = [];

			//Adding actual lines
			for(var j = 0;j < tmp.config.maxs.length;j++) {
				var v_width = tmp.config.maxs[j] - tmp.config.mins[j];
				var v_spacing = tmp.config.spacings[j];
				var v_count = Math.abs(Math.round(v_width/v_spacing));

				for(var i = 0;i <= v_count;i++) {
					tmp.vlines[tmp.vlines.length] = tmp.ggrid.append('line')
						.attr('x1', -vlwidth * j)
						.attr('y1', tmp.height * i/v_count)
						.attr('x2', tmp.width)
						.attr('y2', tmp.height * i/v_count)
						.attr('stroke-width', 1)
						.attr('stroke', 'gray');
				}
			}

			//Scale graphs as well
			for(var j = 0;j < tmp.graphs.length;j++) {
				for(var i = 0;i < tmp.graphs[j].length;i++) {
					var ypos = tmp.height * (1 - (tmp.values[j][i] - tmp.config.mins[j]) / (tmp.config.maxs[j] - tmp.config.mins[j]))
					var i2 = (i - 1 + tmp.graphs[j].length) % tmp.graphs[j].length;
					tmp.graphs[j][i].attr('y1',ypos);
					tmp.graphs[j][i2].attr('y2',ypos);
				}
			}
		};
		tmp.rvlines(tmp);

		//(Config) changed [detection]
		tmp.cchanged = function(tmp, config) {
			var output = {};
			//Save the old configuration
			output.old_config = tmp.config;
			//Copy over new config
			tmp.config = config;

			//Bail if any of the dimensions of the values changed
			if(output.old_config.maxs.length != tmp.config.maxs.length) throw 'ERROR: Maxs length cannot change during runtime for a grapher';
			if(output.old_config.mins.length != tmp.config.mins.length) throw 'ERROR: mins length cannot change during runtime for a grapher';
			if(output.old_config.spacings.length != tmp.config.spacings.length) throw 'ERROR: spacings length cannot change during runtime for a grapher';
			if(output.old_config.colors.length != tmp.config.colors.length) throw 'ERROR: colors length cannot change during runtime for a grapher';

			//Make sure everything is numbers
			tmp.config.t_width = +tmp.config.t_width;
			tmp.config.t_spacing = +tmp.config.t_spacing;
			for(var i = 0;i < tmp.config.maxs.length;i++) {
				tmp.config.maxs[i] = +tmp.config.maxs[i];
			}
			for(var i = 0;i < tmp.config.mins.length;i++) {
				tmp.config.mins[i] = +tmp.config.mins[i];
			}
			for(var i = 0;i < tmp.config.spacings.length;i++) {
				tmp.config.spacings[i] = +tmp.config.spacings[i];
			}

			//Checking if any parameters changed
			output.changed = {};
			output.changed.t_width = output.old_config.t_width != tmp.config.t_width;
			output.changed.t_spacing = output.old_config.t_spacing != tmp.config.t_spacing;
			output.changed.maxs = false;
			for(var i = 0;i < tmp.config.maxs.length;i++) {
				output.changed.maxs |= output.old_config.maxs[i] != tmp.config.maxs[i];
			}
			output.changed.mins = false;
			for(var i = 0;i < tmp.config.mins.length;i++) {
				output.changed.mins |= output.old_config.mins[i] != tmp.config.mins[i];
			}
			output.changed.spacings = false;
			for(var i = 0;i < tmp.config.spacings.length;i++) {
				output.changed.spacings |= output.old_config.spacings[i] != tmp.config.spacings[i];
			}

			return output;
		};
	}

	//Find changes to the UI at the beginning of each cycle
	var changed = tmp.cchanged(tmp, args[2]);

	//Modify time lines and labels if stuff has changed
	if(changed.changed.t_width || changed.changed.t_spacing) {
		tmp.rtlines(tmp,args);
		tmp.rtlabels(tmp);
	}

	//Modify the value lines and labels if stuff has changed
	if(changed.changed.maxs || changed.changed.mins ||
	   changed.changed.spacings || changed.changed.colors) {
		tmp.rvlines(tmp);
		tmp.rvlabels(tmp);
	}

	//Change offset if we're going off the edge of the screen
	while(ins.t - tmp.toffset >= tmp.config.t_width) {
		tmp.toffset += tmp.config.t_width;
		tmp.stlabels(tmp);
	}

	//Move the update line
	var upos = tmp.width * (ins.t - tmp.toffset) / args[2].t_width;
	tmp.uline.attr('x1', upos).attr('x2', upos);

	//Update the lines that need to be updated
	var i1 = Math.round((ins.t - tmp.toffset) / ins.dt);
	var i2 = (i1 - 1 + tmp.graphs[0].length) % tmp.graphs[0].length;
	for(var j = 0;j < tmp.graphs.length;j++) {
		tmp.values[j][i1] = args[3][j];
		var ypos = tmp.height * (1 - (args[3][j] - tmp.config.mins[j]) / (tmp.config.maxs[j] - tmp.config.mins[j]))
		tmp.graphs[j][i1]
			.attr('y1', ypos)
			.attr('display', 'none');
		tmp.graphs[j][i2]
			.attr('y2', ypos)
			.attr('display', 'inline');
	}
}, true, true);

//Taken from https://github.com/jamesbloomer/node-ziggurat
//Usage: nrandom()
//Returns a stream of random values with a gaussian distribution
//mean = 0, variance = 1
addFunction("nrandom", function(args, tmp) {
	if(ins.init) {
		tmp.jsr = 123456789;

		tmp.wn = Array(128);
		tmp.fn = Array(128);
		tmp.kn = Array(128);

		tmp.RNOR = function() {
			var hz = tmp.SHR3();
			var iz = hz & 127;
			return (Math.abs(hz) < tmp.kn[iz]) ? hz * tmp.wn[iz] : tmp.nfix(hz, iz);
		}

		tmp.nfix = function(hz, iz) {
			var r = 3.442619855899;
			var r1 = 1.0 / r;
			var x;
			var y;
			while(true){
				x = hz * tmp.wn[iz];
				if( iz == 0 ){
					x = (-Math.log(tmp.UNI()) * r1); 
					y = -Math.log(tmp.UNI());
					while( y + y < x * x){
						x = (-Math.log(tmp.UNI()) * r1); 
						y = -Math.log(tmp.UNI());
					}
					return ( hz > 0 ) ? r+x : -r-x;
				}

				if( tmp.fn[iz] + tmp.UNI() * (tmp.fn[iz-1] - tmp.fn[iz]) < Math.exp(-0.5 * x * x) ){
					return x;
				}
				hz = tmp.SHR3();
				iz = hz & 127;

				if( Math.abs(hz) < tmp.kn[iz]){
					return (hz * tmp.wn[iz]);
				}
			}
		}

		tmp.SHR3 = function() {
			var jz = tmp.jsr;
			var jzr = tmp.jsr;
			jzr ^= (jzr << 13);
			jzr ^= (jzr >>> 17);
			jzr ^= (jzr << 5);
			tmp.jsr = jzr;
			return (jz+jzr) | 0;
		}

		tmp.UNI = function() {
			return 0.5 * (1 + tmp.SHR3() / -Math.pow(2,31));
		}

		// seed generator based on current time
		tmp.zigset = function() {
			tmp.jsr ^= new Date().getTime();

			var m1 = 2147483648.0;
			var dn = 3.442619855899;
			var tn = dn;
			var vn = 9.91256303526217e-3;

			var q = vn / Math.exp(-0.5 * dn * dn);
			tmp.kn[0] = Math.floor((dn/q)*m1);
			tmp.kn[1] = 0;

			tmp.wn[0] = q / m1;
			tmp.wn[127] = dn / m1;

			tmp.fn[0] = 1.0;
			tmp.fn[127] = Math.exp(-0.5 * dn * dn);

			for(var i = 126; i >= 1; i--){
				dn = Math.sqrt(-2.0 * Math.log( vn / dn + Math.exp( -0.5 * dn * dn)));
				tmp.kn[i+1] = Math.floor((dn/tn)*m1);
				tn = dn;
				tmp.fn[i] = Math.exp(-0.5 * dn * dn);
				tmp.wn[i] = dn / m1;
			}
		}
		tmp.zigset();
	}

	//Returns the next gaussian distributed random number
	return tmp.RNOR();
}, true, false);

//Usage: friction(input, ks, kk)
//Simulates dynamic and static friction
addFunction("friction", function(args) {
	return Math.sign(args[0]) * (args[1] + args[2] * Math.abs(args[0]));
}, false, false);

//Usage: limit(input, min, max)
addFunction("limit", function(args) {
	//Check minimum (optional)
	if(args[1] !== undefined && args[0] < args[1]) return args[1];
	//Check maximum (optional)
	if(args[2] !== undefined && args[0] > args[2]) return args[2];
	//Within limits
	return args[0];
}, false, false);

//Usage: pid(sp, pv, kp, ki, kd, lims)
//lims = {l, u, pl, pu, il, iu, dl, du}
addFunction("pid", function(args) {
	var limits = args[5] || {};
	var err = args[0] - args[1];

	var p = Sim.limit(args[2] * err, limits.pl, limits.pu);
	var i = Sim.integral(args[3] * err, limits.il, limits.iu);
	var d = Sim.limit(args[4] * Sim.derivative(args[1]), limits.dl, limits.du);

	return Sim.limit(p + i + d, limits.l, limits.u);
}, false, false);

//Usage: pidv(sp, pv, kp, kd, lims)
//lims = {l, u, pl, pu, dl, du}
addFunction("pidv", function(args) {
	var limits = args[4] || {};
	var err = args[0] - args[1];

	var p = Sim.integral(args[2] * err, limits.pl, limits.pu);
	var d = Sim.limit(args[3] * err, limits.dl, limits.du);

	return Sim.limit(p + d, limits.l, limits.u);
}, false, false);

//Usage: readData(name)
addFunction("readData", function(args) {
	return read_datafield(args[0]);
}, false, false);

//Usage: writeData(name, data)
addFunction("writeData", function(args) {
	write_datafield(args[0], args[1]);
}, false, false);

//Usage: pause()
addFunction("pause", function(args) {
	setState(States.paused);
}, false, false);

//Usage: stop()
addFunction("stop", function(args) {
	setState(States.stopped);
}, false, false);
