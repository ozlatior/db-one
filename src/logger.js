/*
 * Console Logger Class
 */

const colors = require("colors");

const string = require("util-one").string;
const object = require("util-one").object;

class Logger {

	constructor () {
		// all possible levels and their output
		this.levels = {
			detail: [ "detail".gray ],
			sql:	[ " PSQL ".cyan, [ "grey" ] ],
			info:	[ " INFO ".green ],
			sess:	[ " SESS ".green.bold ],
			warn:	[ " WARN ".yellow.bold ],
			module:	[ "MODULE".green.bold, [ "bold" ] ],
			error:	[ " ERROR ".red.bold ]
		};
		// set default display colors for output
		this.colors = [];
		// set default width to stdout width
		if (process && process.stdout && process.stdout.columns)
			this.consoleWidth = process.stdout.columns;
		else
			this.consoleWidth = 260;
		// set default word break characters
		this.wordBreak = " \t-.";
		// timestamp regexp
		this.timestampRegexp = /^[0-9\-.]+[T ][0-9:.]+Z? *\[[^\[\]]+\] ?/g;
		// currently active level
		this.level = "detail";
		// set the log function to default (formatted on stdout with console width)
		this.resetLogFunction();
		// generate logging methods for each level
		this.setupLoggingMethods();
		// report logger instance
		this.info("Logger Instance Initialized", "Logger", "db-one");
	}

	/*
	 * Set display colors style
	 */
	setColors (arr) {
		if (!arr)
			this.colors = [];
		this.colors = arr;
	}

	/*
	 * Set logging level; ignore all calls lower than this level
	 */
	setLevel (level) {
		if (this.levels[level] === undefined)
			throw new Error("No such level " + level);
		this.level = level;
	}

	/*
	 * Set the console width to something else
	 */
	setConsoleWidth (width) {
		this.consoleWidth = width;
	}

	/*
	 * Get the console width
	 */
	getConsoleWidth () {
		return this.consoleWidth;
	}

	/*
	 * Formatted output function using console width
	 */
	formattedOutput () {

		let getLastBreak = (str, index, chars) => {
			if (string.colors.length(str) <= index)
				return index;
			while (index > 0 && chars.indexOf(string.colors.charAt(index, str)) === -1) {
				index--;
			}
			return index;
		};

		let getIndent = (len) => {
			let ret = new Array(len);
			ret.fill(" ");
			return ret.join("");
		};

		let str = Array.prototype.slice.call(arguments, 0).join(" ");
		let head = string.colors.remove(str).match(this.timestampRegexp);
		let indent = getIndent(4);
		if (head !== null && head.length)
			indent = getIndent(head[0].length);
		let rows = [];
		let index;
		while (string.colors.length(str) > 0) {
			if (rows.length > 0)
				str = indent + str;
			index = getLastBreak(str, this.consoleWidth-1, this.wordBreak) + 1;
			let row;
			row = string.colors.slice(str, indent.length, index);
			row = string.colors.apply(row, this.colors);
			row = string.colors.slice(str, 0, indent.length) + row;
			rows.push(row);
			str = string.colors.slice(str, index);
		}
		console.log(rows.join("\n") + str);
	}

	/*
	 * Set the log function (for instance, to console.log)
	 */
	setLogFunction (fn) {
		if (!(fn instanceof Function))
			throw new Error("Argument is not a function");
		this.logFunction = fn;
	}

	/*
	 * Set the log function to default (formattedOutput)
	 */
	resetLogFunction () {
		this.logFunction = this.formattedOutput.bind(this);
	}

	/*
	 * Check if a level should be displayed or ignored
	 */
	isActiveLevel (level) {
		// we change this once we reach the min level goint through all levels
		// we return this once we reach the inquired level
		let ret = false;
		for (let i in this.levels) {
			if (i === this.level)
				ret = true;
			if (i === level)
				return ret;
		}
		// if we get here, something is not right and we should probably not display anything
		return false;
	}

	/*
	 * Automagically generate logging methods for each level
	 */
	setupLoggingMethods () {
		for (let i in this.levels) {
			this[i] = function(text, cls, service, id) {
				if (!this.isActiveLevel(i))
					return false;
				let format = this.levels[i][1];
				if (format === undefined)
					format = [];
				// build a string: timestamp [ level ] service.cls: text
				let str = (new Date()).toISOString();
				str += " [" + this.levels[i][0] + "] ";
				if (id)
					str += "<" + id + "> ";
				let a = [];
				if (service)
					a.push(service);
				if (cls)
					a.push(cls);
				if (a.length)
					str += string.colors.apply(a.join(".") + ": ", format);
				str += string.colors.apply(text, format);
				this.logFunction(str);
			};
		}
	}

	/*
	 * Get a module binding for this object
	 */
	moduleBinding (bindingCls, bindingService) {
		let ret = {};
		let self = this;
		for (let i in this.levels) {
			ret[i] = function(text, cls, service, id) {
				let callingService = service;
				let callingCls = cls;
				if (bindingService) {
					if (service)
						callingService = bindingService + "." + service;
					else
						callingService = bindingService;
				}
				if (bindingCls) {
					if (cls)
						callingCls = bindingCls + "." + cls;
					else
						callingCls = bindingCls;
				}
				self[i](text, callingCls, callingService, id);
			};
		}
		return ret;
	}

}

// static functions

/*
 * Expand object properties and log them using specified function
 */
Logger.expand = function (fn, obj, name, cls, service, id) {
	object.map(obj, (path, value) => {
		if (value === undefined)
			return;
		let str = "";
		if (value instanceof Array)
			str = "[ Array ]";
		else if (value === "[ Object ]")
			str = "[ Object ]";
		else
			str = JSON.stringify(value);
		fn("  " + name + "." + path.join(".") + ": " + str, cls, service, id);
	}, 3);
}

/*
 * Map an int bitmap to int values as specified in object
 */
Logger.mapInt = function (fn, value, obj, name, cls, service, id) {
	for (let i in obj) {
		if (typeof(obj[i]) !== "number" || obj[i] === 0 || obj[i] !== parseInt(obj[i]))
			continue;
		fn("  " + name + "." + i + ": " + ((value & obj[i]) === obj[i]), cls, service, id);
	}
}


// singleton instance
let instance = null;

// singleton getInstance call
Logger.getInstance = function () {
	if (instance === null)
		instance = new Logger();
	return instance;
}

module.exports = Logger;
