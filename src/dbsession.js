/*
 * Database Session Base Class
 */

const inflection = require("inflection");

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
		this.hooks = null;
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

	attachHooks (hooks) {
		this.hooks = hooks;
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

	getAssociatedEntries (source, target, sourceList, targetList, completeObject) {
		logger.sess("Getting associated " + target + " entries for all " + source + " entries", "getAssociatedEntries");
		sourceList = sourceList.slice(0);
		let sourceIds;
		// we have to use "map" to check if it's an array or not because instanceof does not work when called from the
		// dynamically generated functions - I have a suspicion it has to do with the context being different, so maybe
		// the references to the Array prototype are different... this is the next best thing
		if (sourceList.map)
			sourceIds = sourceList.map((item) => item.id);
		else
			sourceIds = [ sourceList.id ];
		logger.detail("  source IDs: " + sourceIds.join(", "));
		return new Promise((resolve, reject) => {
			this.dbConnector.getAllAssociated(source, target, sourceIds, completeObject).then((result) => {
				// the result contains an object with source ids as keys and target data as values, either in an array
				// for multiple associations or as a single object for single associations
				// we have to update all objects in the source list and create a target list with unique entries
				let targetPlural = inflection.pluralize(target);
				let entries = 0;
				for (let i=0; i<sourceList.length; i++) {
					let id = sourceList[i].id;
					if (result[id] instanceof Array) {
						sourceList[i][targetPlural] = result[id];
						for (let j=0; j<result[id].length; j++) {
							if (targetList.indexOf(result[id][j]) === -1)
								targetList.push(result[id][j]);
						}
						entries += result[id].length;
					}
					else {
						sourceList[i][target] = result[id];
						if (targetList.indexOf(result[id]) === -1)
							targetList.push(result[id]);
						entries ++;
					}
				}
				console.log(targetList);
				resolve(entries);
			});
		});
	}

}

DBSession.modelName = null;

module.exports = DBSession;
