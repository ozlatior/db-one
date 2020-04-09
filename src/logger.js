/*
 * Console Logger Class
 */

const colors = require("colors");

class Logger {

	constructor () {
		// all possible levels and their output
		this.levels = {
			detail: [ "detail".gray ],
			info:	[ " INFO ".green ],
			warn:	[ " WARN ".yellow ],
			error:	[ " ERROR ".red ]
		};
		// currently active level
		this.level = "detail";
		// what to use for logging (default: console.log)
		this.setLogFunction(console.log);
		// generate logging methods for each level
		this.setupLoggingMethods();
		// report logger instance
		this.info("Logger Instance Initialized", "Logger", "db-one");
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
	 * Set the log function (for instance, to console.log)
	 */
	setLogFunction (fn) {
		if (!(fn instanceof Function))
			throw new Error("Argument is not a function");
		this.logFunction = fn;
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
			this[i] = function(text, cls, service) {
				if (!this.isActiveLevel(i))
					return false;
				// build a string: timestamp [ level ] service.cls: text
				let str = (new Date()).toISOString();
				str += " [" + this.levels[i] + "] ";
				let a = [];
				if (service)
					a.push(service);
				if (cls)
					a.push(cls);
				if (a.length)
					str += a.join(".") + ": ";
				str += text;
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
			ret[i] = function(text, cls, service) {
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
				self[i](text, callingCls, callingService);
			};
		}
		return ret;
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
