/*
 * Live Context Class - Context with DB Operations
 */

const DBLiveContext = require("./dblivecontext.js");

const Logger = require("./logger.js");
const logger = Logger.getInstance().moduleBinding("DBInitContext", "db-one");

class DBInitContext extends DBLiveContext {

	// DBEnv		env
	// DBConnector	connector
	// DataLoader	dataLoader

	init () {
		return new Promise(async (resolve, reject) => {
			logger.info("Initializing database structure", "init");
			await this.connector.dbInit(true).catch(reject);
			logger.info("Inserting loaded data", "init");
			await this.dataLoader.insertLoadedData().catch(reject);
			logger.info("Init completed");
			resolve();
		});
	}

}

module.exports = DBInitContext;
