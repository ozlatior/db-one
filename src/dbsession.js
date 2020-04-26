/*
 * Database Session Base Class
 */

const logger = require("./logger.js").getInstance().moduleBinding("DBSession", "db-one");

const DBError = require("./dberror.js");

class DBSession {

	constructor (dbConnector, sessionId, ownerId, options, state) {
		logger.info("Creating DBSession Object, sessionId=" + sessionId + ", ownerId=" + ownerId);
		this.dbConnector = dbConnector;
		this.sessionId = sessionId;
		this.ownerId = ownerId;
		this.options = options;
		this.state = state;
	}

	getSessionId () {
		return this.sessionId;
	}

	getOwnerId () {
		return this.ownerId;
	}

	getConnector () {
		return this.dbConnector;
	}

	setState (values) {
		logger.info("Setting session state for sessionId = " + this.sessionId, "setState");
		logger.detail("  values = " + JSON.stringify(values), "setState");
		// TODO: object deep copy maybe for nested state?
		for (let i in values) {
			this.state[i] = values[i];
		}
		return new Promise((resolve, reject) => {
			if (!DBSession.modelName) {
				resolve(this.state);
				return;
			}
			this.dbConnector.updateEntry(DBSession.modelName, this.sessionId, { state: JSON.stringify(this.state) })
				.then((result) => { resolve(this.state) }).catch(reject);
		});
	}

	getState () {
		logger.info("Getting session state for sessionId = " + this.sessionId, "getState");
		return new Promise((resolve, reject) => {
			if (!DBSession.modelName) {
				logger.detail("  memory values = " + JSON.stringify(values), "getState");
				resolve(this.state);
				return;
			}
			this.dbConnector.listEntries(DBSession.modelName, { id: this.sessionId }).then((result) => {
				if (result.length === 0)
					throw new DBError("No such session id " + this.sessionId);
				this.state = JSON.parse(result[0].state);
				logger.detail("  database values = " + JSON.stringify(this.state), "getState");
				resolve(this.state);
			}).catch(reject);
		});
	}
}

DBSession.modelName = null;

module.exports = DBSession;
