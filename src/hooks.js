/*
 * Generic Hooks Class
 *
 * Hooks are handlers that return a promise (can be used with async / await pattern)
 * The recommended usage is to pass an object to the hooks that the hooks can manipulate
 * and throw an error in case there is a reason for execution to be halted
 * Alternately, the error status could be passed back to the caller in the hook argument
 *
 * Hooks have "names" - describing when the hook was triggered, eg "before", "created" etc
 * There are also generic hooks which will be called whenever another hook is called, with
 * some exceptions to this rule (see `registerHook`)
 *
 */

class Hooks {

	constructor () {
		this.hooks = {
			__ANY__: {
				name: null,
				excludeGeneric: true,
				handlers: []
			}
		};
	}

	/*
	 * General handler for a specific hook
	 */
	handle (hook, data) {
		if (this.hooks[hook] === undefined)
			throw new Error("No such hook name " + hook);
		return new Promise(async (resolve, reject) => {
			let ret = 0;
			for (let handler of this.hooks[hook].handlers) {
				let caught = false;
				await handler(data).catch((e) => {
					caught = true;
					reject(e);
				});
				if (caught)
					break;
			}
			if (this.hooks[hook].excludeGeneric) {
				resolve(ret);
				return;
			}
			this.handleGeneric(data).then((result) => {
				ret += result;
				resolve(ret);
			}).catch(reject);
		});
	}

	/*
	 * Handler for the generic hook
	 */
	handleGeneric (data) {
		return this.handle("__ANY__", data);
	}

	/*
	 * Get Hook Handler Name
	 */
	getHandlerName (hook) {
		return "handle" + hook.slice(0, 1).toUpperCase() + hook.slice(1);
	}

	/*
	 * Register a hook by name
	 */
	registerHook (name, excludeGeneric) {
		if (this.hooks[name] !== undefined)
			throw new Error("Hook name " + name + " already registered");
		let hook = {
			name: name,
			excludeGeneric: false,
			handlers: []
		};
		if (excludeGeneric)
			hook.excludeGeneric = true;
		this.hooks[name] = hook;
		this[this.getHandlerName(name)] = function (data) {
			return this.handle(name, data);
		};
	}

	/*
	 * Deregister a previously registered hook; returns the number of handlers registered for removed hook
	 */
	deregisterHook (name) {
		if (name === "__ANY__" || this.hooks[name] === undefined)
			throw new Error("No such hook name " + name + " registered");
		let ret = this.hooks[name].handlers.length;
		delete this.hooks[name];
		delete this[this.getHandlerName(name)];
		return ret;
	}

	/*
	 * Register a hook handler function to a hook
	 */
	registerHandler (hook, fn) {
		if (this.hooks[hook] === undefined)
			throw new Error("No such hook name " + hook);
		if (typeof(fn) !== "function")
			throw new Error("Bad type for fn, expected function");
		this.hooks[hook].handlers.push(fn);
	}

	/*
	 * Deregister a hook handler from a hook, return 0 if not found, 1 if found
	 */
	deregisterHandler (hook, fn) {
		if (this.hooks[hook] === undefined)
			throw new Error("No such hook name " + hook);
		if (typeof(fn) !== "function")
			throw new Error("Bad type for fn, expected function");
		let index = this.hooks[hook].handlers.indexOf(fn);
		if (index === -1)
			return 0;
		this.hooks[hook].splice(index, 1);
		return 1;
	}

	/*
	 * Register a generic handler
	 */
	registerGenericHandler (fn) {
		this.registerHandler("__ANY__", fn);
	}

	/*
	 * Deregsiter a generic handler
	 */
	deregisterGenericHandler (fn) {
		this.deregisterHandler("__ANY__", fn);
	}

	/*
	 * Deregister all handlers, either by hook name or by function
	 * No argument -> deregister all handlers from all hooks
	 * Returns number of deregistered handlers
	 */
	deregisterAllHandlers (arg) {
		let ret = 0;
		if (typeof(arg) === "string") {
			if (this.hooks[arg] === undefined)
				throw new Error("No such hook name " + arg);
			ret = this.hooks[arg].handlers.length;
			this.hooks[arg].handlers = [];
			return ret;
		}
		if (typeof(arg) === "function") {
			for (let i in this.hooks)
				ret += this.deregisterHandler(i, arg);
			return ret;
		}
		if (arg === undefined) {
			for (let i in this.hooks)
				ret += this.deregisterAllHandlers(i, arg);
			return ret;
		}
		throw new Error("Bad type for arg, expected string or function");
	}

}

module.exports = Hooks;
