/*
 * Live Context Class - Context with DB Operations
 */

const DBContext = require("./dbcontext.js");
const DBSessionFactory = require("./dbsessionfactory.js");

const DBError = require("./dberror.js");

const Logger = require("./logger.js");
const logger = Logger.getInstance().moduleBinding("DBLiveContext", "db-one");

class DBLiveContext extends DBContext {

	// DBEnv		env
	// DBConnector	connector
	// DataLoader	dataLoader

	constructor (env, config) {
		logger.info("Initializing object", "constructor");
		super(env, config);

		this.sessionClass = null;
		this.factory = null;
	}

	applyConfig (config) {
		logger.info("Apply config " + JSON.stringify(config));
		super.applyConfig(config);

		if (config && config.factory)
			this.config.factory = JSON.parse(JSON.stringify(factory));
	}

	setSessionClass (cls) {
		this.sessionClass = cls;
	}

	initFactory () {
		logger.info("Initialising factory object", "initFactory");
		if (!this.connector)
			throw new DBError("DBConnector not intialized for this context", "initFactory");
		if (!this.sessionClass)
			throw new DBError("Session Class not set for this context", "initFactory");
		if (this.factory)
			logger.warn("There is a Factory instance for this context already");
		this.factory = new DBSessionFactory(this.connector, this.sessionClass);
	}

	setup () {
		super.setup();
		if (this.sessionClass)
			this.initFactory();
		else
			logger.info("Session Class not set for this object, not running initFactory", "setup");
	}

	getFactory () {
		return this.factory;
	}

}

module.exports = DBLiveContext;
