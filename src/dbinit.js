/*
 * Initializer class
 */

const Sequelize = require("sequelize");

const DBCore = require("./dbcore.js");
const DBConnector = require("./dbconnector.js");
const DataLoader = require("./dataloader.js");

const Logger = require("./logger.js");

const logger = Logger.getInstance().moduleBinding("DBInit", "db-one");

const password = require("./access/password.js").password1;

const accessModels = require("./../models/access/models.js");
const accessData = require("./../data/access/data.js");

class DBInit {

	constructor (config) {
		logger.module("Init object setup", "constructor");
		this.sql = new Sequelize(config.database.name, config.database.username, config.database.password,
			{ host: config.database.host, dialect: config.database.dialect, logging: (msg) => logger.sql(msg) });
		this.access = config.access;

		logger.module("Setting up database access", "constructor");
		this.dbCore = new DBCore(this.sql);
		this.dbConnector = new DBConnector(this.dbCore);
		this.dataLoader = new DataLoader(this.dbConnector);

		this.dbConnector.addFunction("password", password.get);
		this.dbConnector.addConstant("staticSalt", this.access.staticSalt);
	}

	loadDefaultAccessModels () {
		logger.module("Loading default user management models", "loadDefaultAccessModels");
		this.dbConnector.loadModels(accessModels);
	}

	loadDefaultAccessData () {
		logger.module("Loading default user management data", "loadDefaultAccessData");
		for (let i in accessData) {
			this.dataLoader.loadData(i, accessData[i]);
		}
	}

	loadModels (models) {
		logger.module("Loading models", "loadModels");
		this.dbConnector.loadModels(models);
	}

	loadData (data) {
		logger.module("Loading data", "loadData");
		for (let i in data) {
			this.dataLoader.loadData(i, data[i]);
		}
	}

	init () {
		return new Promise(async (resolve, reject) => {
			logger.module("Initializing database structure", "init");
			await this.dbConnector.dbInit(true).catch(reject);

			logger.module("Initializing database data", "init");
			await this.dataLoader.insertLoadedData().catch(reject);

			logger.module("Init script completed");

			resolve();
		});
	};

}

module.exports = DBInit;
