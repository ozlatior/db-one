/*
 * Container Class for Context specific elements, such as models, DB Core Objects etc
 */

const DBConnector = require("./dbconnector.js");
const DataLoader = require("./dataloader.js");

const DBError = require("./dberror.js");

const Logger = require("./logger.js");
const logger = Logger.getInstance().moduleBinding("DBContext", "db-one");

class DBContext {

	// Passing the environment creates a tight coupling between the two, but that can be easily
	// fixed by having a non-environment constructor where the core is passed instead
	// For now we'll leave it as it is since the scope of this class is coupled to the env anyway
	constructor (env, config) {
		logger.info("Initializing object", "constructor");
		if (config)
			logger.detail("config: " + JSON.stringify(config));

		// reference to "parent" environment object
		this.env = env;

		// DB Objects
		this.connector = null;
		this.dataLoader = null;

		if (config) {
			this.applyConfig(config);
		}
	}

	getConnector () {
		return this.connector;
	}

	getDataLoader () {
		return this.dataLoader;
	}

	applyConfig(config) {
		this.config = {};
	}

	initConnector () {
		logger.info("Initializing connector", "initConnector");
		let core = this.env.getCore();
		if (!core)
			throw new DBError("Environment DBCore not initialized", "initConnector");
		if (this.connector)
			logger.warn("There is a DBConnector instance for this context already");
		this.connector = new DBConnector(core);
	}

	initDataLoader () {
		logger.info("Initialising Data Loader", "initDataLoader");
		if (!this.connector)
			throw new DBError("DBConnector not intialized for this context", "initDataLoader");
		if (this.dataLoader)
			logger.warn("There is a DataLoader instance for this context already");
		this.dataLoader = new DataLoader(this.connector);
	}

	setup () {
		this.initConnector();
		this.initDataLoader();
	}

	loadModels (models) {
		logger.info("Loading Models", "loadModels");
		this.connector.loadModels(models);
	}

	loadData (data) {
		logger.info("Loading Data", "loadData");
		for (let i in data) {
			this.dataLoader.loadData(i, data[i]);
		}
	}

}

module.exports = DBContext;
