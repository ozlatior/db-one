/*
 * DBSessionFactory Class
 */

const uuid = require("uuid").v4;

const Sequelize = require("sequelize");

const object = require("util-one").object;

const logger = require("./logger.js").getInstance().moduleBinding("DBSessionFactory", "db-one");

const DBSession = require("./dbsession.js");
const Hooks = require("./hooks.js");

const DBError = require("./dberror.js");

const SESSION_MODEL = {
	name: "db_one_session",
	attributes: {
		id: {
			type: Sequelize.UUID,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		options: {
			type: Sequelize.TEXT
		},
		state: {
			type: Sequelize.TEXT
		},
		active: {
			type: Sequelize.BOOLEAN,
			allowNull: false
		}
	},
	associations: [
		{
			type: "belongsTo",
			target: "user"
		}
	]
};


class DBSessionFactory {

	constructor(dbConnector, dbSessionClass, sessionModel) {
		logger.info("Creating DBSessionFactory Object");
		this.dbConnector = dbConnector;
		this.dbSessionClass = dbSessionClass;
		this.sessionModel = sessionModel;
		this.sessions = {};
		if (this.sessionModel === undefined)
			this.sessionModel = object.deepCopy(SESSION_MODEL);
		DBSession.modelName = this.sessionModel.name;

		// hooks set-up
		this.hooks = new Hooks();
		this.hooks.registerHook("createSession");
		this.hooks.registerHook("destroySession");
		this.hooks.registerHook("dbOperationRequest");
		this.hooks.registerHook("dbOperationResponse");
	}

	getSessionModel () {
		return this.sessionModel;
	}

	getSessionModelName () {
		return this.sessionModel.name;
	}

	setSessionModel (modelDefinition) {
		logger.info("Setting Session Model to " + JSON.stringify(modelDefinition), "setOwnerModel");
		this.sessionModel = modelDefinition;
		this.dbConnector.setOwnerModel(this.getOwnerModel());
		DBSession.modelName = this.sessionModel.name;
	}

	setSessionModelName (name) {
		this.sessionModel.name = name;
	}

	getOwnerModel () {
		if (this.sessionModel)
			return this.sessionModel.associations[0].target;
		return null;
	}

	setOwnerModel (modelName) {
		logger.info("Setting Owner Model Name to " + name, "setOwnerModel");
		if (this.sessionModel)
			this.sessionModel.associations[0].target = modelName;
		this.dbConnector.setOwnerModel(this.getOwnerModel());
	}

	initialise () {
		this.dbConnector.loadModels([ this.sessionModel ]);
		return new Promise((resolve, reject) => {
			this.dbConnector.dbSync().then(resolve).catch(reject);
		});
	}

	createInstance (ownerId, options, state) {
		if (!options)
			options = {};
		if (!state)
			state = {};
		logger.info("Creating new session instance for owner " + ownerId, "createInstance");
		logger.detail("  options = " + JSON.stringify(options), "createInstance");
		logger.detail("  state = " + JSON.stringify(state), "createInstance");
		return new Promise(async (resolve, reject) => {
			let caught = false;
			if (this.hooks && this.hooks.handleCreateSession)
				await this.hooks.handleCreateSession({ source: this, ownerId: ownerId, options: options, state: state })
					.catch((e) => { caught = true; reject(e) });
			if (caught)
				return;
			this.dbConnector.createEntry(this.sessionModel.name, {
				options: JSON.stringify(options),
				state: JSON.stringify(state),
				active: true,
				userId: ownerId
			}).then((result) => {
				let instance = new this.dbSessionClass(this.dbConnector, result.id, ownerId, options, state);
				logger.info("Created new session instance for owner " + ownerId + ", id = " + result.id, "createInstance");
				instance.attachHooks(this.hooks);
				this.sessions[result.id] = instance;
				resolve(instance);
			}).catch(reject);
		});
	}

	retrieveInstance (sessionId, options) {
		logger.info("Retrieving session isntance with id = " + sessionId, "retrieveInstance");
		return new Promise((resolve, reject) => {
			if (this.sessions[sessionId]) {
				resolve(this.sessions[sessionId]);
				return;
			}
			this.dbConnector.listEntries(this.sessionModel.name, { id: sessionId }).then((result) => {
				if (!result || result.length === 0) {
					logger.error("No such active session id " + sessionId, "retrieveInstance");
					throw new DBError("No such active session id " + sessionId);
				}
				let instance = new this.dbSessionClass(this.dbConnector, result[0].id, result[0].userId,
					JSON.parse(result[0].options), JSON.parse(result[0].state));
				this.sessions[result[0].id] = instance;
				resolve(instance);
			}).catch(reject);
		});
	}

	removeInstance (sessionId, options) {
		logger.info("Removing session instance with id = " + sessionId, "removeInstance");
		return new Promise(async (resolve, reject) => {
			let caught = false;
			if (this.hooks && this.hooks.handleDestroySession)
				await this.hooks.handleDestroySession({ source: this, sessionId: sessionId, options: options })
					.catch((e) => { caught = true; reject(e) });
			if (caught)
				return;
			this.dbConnector.deleteEntry(this.sessionModel.name, sessionId).then((result) => {
				if (!result)
					logger.warn("Session not found for removal, id = " + sessionId, "removeInstance");
				resolve(result);
			}).catch(reject);
		});
	}

	registerCreateSessionHandler (fn) {
		logger.info("Registering create instance handler", "registerCreateInstanceHandler");
		this.hooks.registerHandler("createSession", fn);
	}

	registerDestroySessionHandler (fn) {
		logger.info("Registering destroy instance handler", "registerDestroyInstanceHandler");
		this.hooks.registerHandler("destroySession", fn);
	}

	registerDbOperationRequestHandler (fn) {
		logger.info("Registering database operation request handler", "registerDbOperationRequestHandler");
		this.hooks.registerHandler("dbOperationRequest", fn);
	}

	registerDbOperationResponseHandler (fn) {
		logger.info("Registering database operation response handler", "registerDbOperationResponseHandler");
		this.hooks.registerHandler("dbOperationResponse", fn);
	}

}

DBSessionFactory.SESSION_MODEL = SESSION_MODEL;

module.exports = DBSessionFactory;
