/*
 * DB One Environment Class
 *
 * The Evironment Class Provides an integrated environment object that can be
 * configured either through a configuration file or by calling its methods
 * and provides ready-to-go access to all objects and methods, generates the
 * session classes and initializes the database if needed
 *
 * An environment comprises multiple contexts - contexts contain the DBOne
 * specific classes for different aspects of the application - maybe user, admin,
 * access, system etc.
 */

const fs = require("fs");
const path = require("path");
const upath = require("util-one").path;

const Sequelize = require("sequelize");

const u1 = require("util-one");

const DBCore = require("./dbcore.js");
const DBConnector = require("./dbconnector.js");
const DataLoader = require("./dataloader.js");

const DBGeneratorContext = require("./dbgeneratorcontext.js");
const DBInitContext = require("./dbinitcontext.js");
const DBLiveContext = require("./dblivecontext.js");

const DBError = require("./dberror.js");

const Logger = require("./logger.js");
const logger = Logger.getInstance().moduleBinding("DBEnv", "db-one");

// default password functions
//const password = require("./access/password.js").password1;

// default configuration file
const defaultConfig = require("./../defaultconfig.js");

// default access models and data
const accessModels = require("./../models/access/models.js");
const accessData = require("./../data/access/data.js");

// default user models and data
const userModels = require("./../models/models.js");
const userData = require("./../data/data.js");

class DBEnv {

	constructor (config, options) {
		if (!options)
			options = {};
		let init = !!options.init;
		let generate = !!options.generate;
		config = config ? config : DBEnv.DEFAULTS;
		logger.module("Creating DBOne Environment, init = " + init + ", generate = " + generate, "constructor");
		if (typeof(config) === "object")
			Logger.expand(logger.detail, config, "config", "constructor");
		if (typeof(config) === "number")
			Logger.mapInt(logger.detail, config, DBEnv, "config", "constructor");

		this.sql = null;
		this.core = null;

		// execution contexts
		this.ctx = {
			_system: null,
			_access: null,
			_user: null
		};

		// generator contexts
		this.gen = {
			_system: null,
			_access: null,
			_user: null
		};

		// dynamically generated classes
		this.cls = null;
		if (generate) {
			this.cls = {
				_system: null,
				_access: null,
				_user: null
			};
		}

		// is this an init environment
		this.init = init;
		// is this a generator environment
		this.generator = generate;

		if (typeof(config) === "object")
			this.applyConfig(config);
		else {
			this.config = u1.object.fromIntMap(config, DBEnv);
			this.applyConfig(defaultConfig);
		}
	}

	/*
	 * Clear configuration
	 */
	clearConfig (config) {
		this.config = null;
	}

	/*
	 * Apply configuration settings from a config object
	 */
	applyConfig (config) {
		if (!this.config)
			this.config = {};
		[
			[ "DEFAULT_OBJECTS",			"defaultObjects" ],
			[ "DEFAULT_ACCESS_MODELS",		"defaultAccessModels" ],
			[ "DEFAULT_ACCESS_DATA",		"defaultAccessData" ],
			[ "DEFAULT_USER_MODELS",		"defaultUserModels" ],
			[ "DEFAULT_USER_DATA",			"defaultUserData" ]
		].map((item) => {
			if (this.config[item[0]] === undefined)
				this.config[item[1]] = config[item[1]];
		});

		this.config.codePath = ".";
		if (config.codePath)
			this.config.codePath = config.codePath;

		this.config.contexts = {};
		if (config.contexts)
			this.config.contexts = JSON.parse(JSON.stringify(config.contexts));
	}

	/*
	 * Setup Sequelize object, dbCore and other objects either by direct reference or by config values
	 */
	setup (name, username, password, host, dialect) {
		if (name instanceof Sequelize) {
			logger.module("Setting up Sequelize SQL (by object reference)", "setup");
			this.sql = name;
		}
		else {
			let sqlLogger = Logger.getInstance().moduleBinding("query", "db-one");
			let logging = (msg) => sqlLogger.sql(msg);
			if (typeof(name) === "object") {
				username = name.username;
				password = name.password;
				host = name.host;
				dialect = name.dialect;
				if (name.logging)
					logging = name.logging;
				name = name.name;
			}
			logger.module("Setting up Sequelize SQL", "setup");
			logger.detail(JSON.stringify({name: name, username: username, host: host, dialect: dialect}), "setup");
			this.sql = new Sequelize(name, username, password, { host: host, dialect: dialect, logging: logging });
		}
		logger.module("Setting up DBCore", "setup");
		this.core = new DBCore(this.sql);
		this.createConfiguredObjects();
		if (this.generator)
			this.runAutomaticGenerators();
		this.setSessionClasses();
		return this;
	}

	/*
	 * Setup default objects
	 */
	setDefaultCore () {
		logger.info("Creating default DBCore", "setDefaultCore");
		this.core = new DBCore(this.sql);
	}

	setDefaultContexts (init) {
		logger.info("Creating default contexts, init = " + init, "setDefaultContexts");
		if (init)
			this.ctx._system = new DBInitContext(this);
		else
			this.ctx._system = new DBLiveContext(this);
		this.ctx._access = new DBLiveContext(this);
		this.ctx._user = new DBLiveContext(this);
		this.ctx._system.setup();
		this.ctx._access.setup();
		this.ctx._user.setup();
	}

	setDefaultGenerators () {
		logger.info("Creating default generator contextx", "setDefaultGenerators");
		let config = {};
		if (this.config && this.config.contexts && this.config.contexts._system)
			config = { generator: this.config.contexts._system.generator };
		this.gen._system = new DBGeneratorContext(this, config);
		config = {};
		if (this.config && this.config.contexts && this.config.contexts._access)
			config = { generator: this.config.contexts._access.generator };
		this.gen._access = new DBGeneratorContext(this, config);
		config = {};
		if (this.config && this.config.contexts && this.config.contexts._access)
			config = { generator: this.config.contexts._user.generator };
		this.gen._user = new DBGeneratorContext(this, config);
		this.gen._system.setup();
		this.gen._access.setup();
		this.gen._user.setup();
	}

	setDefaultObjects (options) {
		if (!options)
			options = {};
		logger.info("Setting up default objects, " + JSON.stringify(options), "setDefaultObjects");
		this.setDefaultCore();
		this.setDefaultContexts(options.init);
	}

	/*
	 * Setup configured objects
	 */
	createConfiguredObjects () {
		logger.module("Creating configured objects", "createConfiguredObjects");
		Logger.expand(logger.detail, this.config, "config", "createConfiguredObjects");

		if (this.config.defaultObjects || this.config.DEFAULT_OBJECTS) {
			this.setDefaultObjects({ init: this.init });
			if (this.generator)
				this.setDefaultGenerators();
		}
		if (this.config.defaultAccessModels || this.config.DEFAULT_ACCESS_MODELS) {
			this.loadAccessModels(accessModels);
		}
		if (this.config.defaultUserModels || this.config.DEFAULT_USER_MODELS) {
			this.loadUserModels(userModels);
		}

		logger.module("Loading configured data", "createConfiguredObjects");
		if (this.config.defaultAccessData || this.config.DEFAULT_ACCESS_DATA) {
			this.loadData(accessData);
		}
		if (this.config.defaultUserData || this.config.DEFAULT_USER_DATA) {
			this.loadData(userData);
		}
	}

	/*
	 * Generators
	 */
	generateSessionClass (context) {
		if (!this.generator)
			throw new DBError("Not a generator environment. Call constructor with generator option to use this feature");
		logger.module("Generating session class for context " + context);
		this.cls[context] = this.gen[context].generateClass();
		return this.cls[context];
	}

	generateAccessSessionClass () {
		return this.generateSessionClass("_access");
	}

	generateUserSessionClass () {
		return this.generateSessionClass("_user");
	}

	generateSessionCode (context) {
		if (!this.generator)
			throw new DBError("Not a generator environment. Call constructor with generator option to use this feature");
		logger.module("Generating session class code for context " + context);
		this.cls[context] = this.gen[context].generateCode();
		return this.cls[context];
	}

	generateAccessSessionCode () {
		return this.generateSessionCode("_access");
	}

	generateUserSessionCode () {
		return this.generateSessionCode("_user");
	}

	runAutomaticGenerators () {
		if (!this.generator)
			throw new DBError("Not a generator environment. Call constructor with generator option to use this feature");
		logger.module("Running automatic generation");
		let any = false;
		for (let i in this.gen) {
			if (!this.config.contexts[i] || !this.config.contexts[i].generator)
				continue;
			let config = this.config.contexts[i].generator;
			if (config.mode === "runtime") {
				this.generateSessionClass(i);
				logger.module("Generated session class object for " + i + ": " + this.config.contexts[i].generator.className);
			}
			else if (config.mode === "startup") {
				this.generateSessionCode(i);
				let name = i;
				if (this.config.contexts[i].generator.className)
					name = this.config.contexts[i].generator.className;
				name = path.join(this.config.codePath, name) + ".js";
				fs.writeFileSync(name, this.cls[i]);
				logger.module("Written class code for " + i + " (" + this.cls[i].length + " bytes) to " + name);
			}
		}
	}

	getGeneratedClass (context) {
		if (!this.generator)
			throw new DBError("Not a generator environment. Call constructor with generator option to use this feature");
		return this.cls[context];
	}

	setSessionClasses () {
		logger.module("Setting session classes in session factory objects");
		let sessionModels = [];
		for (let i in this.ctx) {
			if (!this.config.contexts[i] || !this.config.contexts[i].factory)
				continue;
			let generatorConfig = this.config.contexts[i].generator;
			let config = this.config.contexts[i].factory;
			if (config.mode === "runtime") {
				if (!generatorConfig || generatorConfig.mode !== "runtime") {
					logger.error("Factory " + i + " set to runtime but generator not. This is not supported in current version",
						"setSessionClasses");
					continue;
				}
				this.ctx[i].setSessionClass(this.gen[i]);
			}
			if (config.mode === "code") {
				logger.error("Code mode is not supported in the current version (factory " + i + ")", "setSessionClasses");
				continue;
			}
			if (config.mode === "static") {
				let classPath = path.join(process.cwd(), config.path);
				let relative = upath.getRelative(__dirname, classPath);
				let cls = require(relative);
				this.ctx[i].setSessionClass(cls);
			}
			this.ctx[i].initFactory();
			// set specific model name for this context and load it via the system context
			let modelName = this.ctx[i].getFactory().setSessionModelName(i + "_session");
			sessionModels.push(this.ctx[i].getFactory().getSessionModel());
		}
		this.loadSystemModels(sessionModels);
	}

	/*
	 * Custom setters
	 */
	createContext (context) {
		logger.info("Creating live context " + context, "createContext");
		this.ctx[context] = new DBLiveContext(this);
		this.ctx[context].init();
	}

	setContext (context, value) {
		this.ctx[context] = value;
		this.ctx[context].init();
	}

	createGenerator (generator) {
		logger.info("Creating generator context " + context, "createGenerator");
		this.gen[generator] = new DBGeneratorContext(this);
		this.get[generator].init();
	}

	setGenerator (generator, value) {
		this.gen[generator] = value;
		this.get[generator].init();
	}

	/*
	 * Model Loading
	 */
	loadModels (models, context) {
		logger.info("Loading models for context " + context, "loadModels");
		if (!this.ctx[context])
			return false;
		this.ctx[context].loadModels(models);
		this.ctx._system.loadModels(models);
		if (this.generator)
			this.gen[context].loadModels(models);
		return true;
	}

	loadAccessModels (models) {
		return this.loadModels(models, "_access");
	}

	loadUserModels (models) {
		return this.loadModels(models, "_user");
	}

	loadSystemModels (models) {
		logger.info("Loading system specific models", "loadModels");
		this.ctx._system.loadModels(models);
		return true;
	}

	/*
	 * Data Loading
	 * The system context has a complete list of all models so we can use that for data loading
	 */
	loadModelData (model, data) {
		logger.info("Loading data for model " + model, "loadModelData");
		let d = {};
		d[model] = data;
		this.ctx._system.loadData(d);
	}

	loadData (data) {
		logger.info("Loading data", "loadData");
		this.ctx._system.loadData(data);
	}

	/*
	 * Getters
	 */
	getSql () {
		return this.sql;
	}

	getCore () {
		return this.core;
	}

	getSystemContext () {
		return this.ctx._system;
	}

	getAccessContext () {
		return this.ctx._access;
	}

	getUserContext () {
		return this.ctx._user;
	}

	getContext (context) {
		return this.ctx[context];
	}

	getAccessGenerator () {
		return this.gen._access;
	}

	getUserGenerator () {
		return this.gen._user;
	}

	getGenerator (generator) {
		return this.gen[generator];
	}

	isInit () {
		return this.init;
	}

	isGenerator () {
		return this.generator;
	}

	/*
	 * Actions
	 */
	connect () {
		logger.module("Connecting to database", "connect");
		return this.core.authenticate();
	}

	initDatabase () {
		logger.module("Initializing database structure", "initDatabase");
		if (!this.init)
			throw new DBError("Environment was not created with the init option, cannut run initDatabase");
		return this.ctx._system.init();
	}

}

DBEnv.DEFAULT_OBJECTS =			 1;
DBEnv.DEFAULT_ACCESS_MODELS =	 2;
DBEnv.DEFAULT_ACCESS_DATA =		 4;
DBEnv.DEFAULT_USER_MODELS =		 8;
DBEnv.DEFAULT_USER_DATA =		16;

DBEnv.DEFAULTS =
	DBEnv.DEFAULT_OBJECTS |
	DBEnv.DEFAULT_ACCESS_MODELS | DBEnv.DEFAULT_ACCESS_DATA |
	DBEnv.DEFAULT_USER_MODELS | DBEnv.DEFAULT_USER_DATA;

module.exports = DBEnv;
