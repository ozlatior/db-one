/*
 * Database Connector Class
 */

const inflection = require("inflection");

const logger = require("./logger.js").getInstance().moduleBinding("DBConnector", "db-one");

const DBError = require("./dberror");

const ModelLoader = require("./modelloader.js");

class DBConnector extends ModelLoader {

	constructor (dbCore) {
		logger.info("Creating DBConnector Object");
		super(dbCore);
	}

	getEntries (model, condition) {
		logger.info("Getting " + model + " entry objects ", "getEntries");
		logger.detail("  condition = " + JSON.stringify(condition), "getEntries");
		let entity = this.dbCore.getEntity(model);
		return new Promise((resolve, reject) => {
			if (entity === undefined)
				throw new DBError("No such model/entity " + model);
			entity.findAll({ where: condition }).then(resolve).catch(reject);
		});
	}

	listEntries (model, condition, associations) {
		logger.info("Listing " + model + " entries ", "listEntries");
		logger.detail("     condition = " + JSON.stringify(condition), "listEntries");
		logger.detail("  associations = " + JSON.stringify(associations), "listEntries");
		let entity = this.dbCore.getEntity(model);
		return new Promise((resolve, reject) => {
			if (entity === undefined)
				throw new DBError("No such model/entity " + model);
			entity.findAll({ where: condition }).then((data) => {
				let ret = [];
				data.map((entry) => ret.push(entry.dataValues));
				resolve(ret);
			}).catch(reject);
		});
	}

	bulkCreateEntry (model, data) {
		logger.info("Creating " + data.length + " " + model + " entries in bulk", "createEntry");
		for (let i=0; i<data.length; i++)
			logger.detail("  data = " + JSON.stringify(data[i]), "createEntry");
		let entity = this.dbCore.getEntity(model);
		return new Promise((resolve, reject) => {
			if (entity === undefined)
				return reject(new DBError("No such model/entity " + model));
			entity.bulkCreate(data).then((data) => {
				let ret = [];
				data.map((entry) => ret.push(entry.dataValues));
				resolve(ret);
			}).catch(reject);
		});
	}

	createEntry (model, data) {
		logger.info("Creating " + model + " entry", "createEntry");
		logger.detail("  data = " + JSON.stringify(data), "createEntry");
		let entity = this.dbCore.getEntity(model);
		return new Promise((resolve, reject) => {
			if (entity === undefined)
				throw new DBError("No such model/entity " + model);
			entity.create(data).then((data) => resolve(data.dataValues)).catch(reject);
		});
	}

	updateEntry (model, id, data) {
		logger.info("Updating " + model + " entry id = " + id, "updateEntry");
		logger.detail("  data = " + JSON.stringify(data), "updateEntry");
		let entity = this.dbCore.getEntity(model);
		if (entity === undefined)
			throw new DBError("No such model/entity " + model);
		throw new DBError("Not implemented");
	}

	deleteEntry (model, id) {
		logger.info("Deleting " + model + " entry id = " + id, "deleteEntry");
		let entity = this.dbCore.getEntity(model);
		if (entity === undefined)
			throw new DBError("No such model/entity " + model);
		throw new DBError("Not implemented");
	}

	associateEntry (model, id, target, targetId) {
		logger.info("Associating " + model + " entry id = " + id + " and " + target + " entry id = " + targetId,
			"associateEntry");
		let entity = this.dbCore.getEntity(model);
		let targetEntity = this.dbCore.getEntity(target);
		return new Promise((resolve, reject) => {
			if (entity === undefined)
				throw new DBError("No such model/entity " + model);
			if (targetEntity === undefined)
				throw new DBError("No such model/entity " + target);
			this.getEntries(model, { id: id }).then((result) => {
				if (result.length === 0)
					throw new DBError("No such " + model + " entry " + id);
				let fn = this.associationFunctionName("add", model, target);
				result[0][fn](targetId).then(resolve).catch(reject);
			}).catch(reject);
		});
	}

	/*
	 * Get the function name for association operations
	 * fn - which function (get, set etc)
	 * source - associated model source
	 * target - associated model target
	 * plural - boolean (optional) - normally the singular is picked in case
	 *          both forms are available, set this to true to pick plural
	 */
	associationFunctionName (fn, source, target, plural) {
		let fallbacks = {
			add: "set"
		};
		let ops = {
			hasOne: {
				s: [ "get", "set", "create" ],
				p: []
			},
			belongsTo: {
				s: [ "get", "set", "create" ],
				p: []
			},
			hasMany: {
				s: [ "has", "add", "remove", "create" ],
				p: [ "get", "count", "has", "set", "add", "remove" ]
			},
			belongsToMany: {
				s: [ "has", "add", "remove", "create" ],
				p: [ "get", "count", "has", "set", "add", "remove" ]
			}
		};
		if (this.associations[source] === undefined || this.associations[source][target] === undefined)
			throw new DBError("No association between " + source + " and " + target);
		let type = this.associations[source][target].type;
		let isPlural;
		let actualFn = fn;
		// check if function name is valid at all, otherwise check for fallbacks
		if (ops[type].s.indexOf(fn) === -1 && ops[type].p.indexOf(fn) === -1) {
			if (fallbacks[fn] === undefined)
				throw new DBError("No " + fn + " function for " + type + " association and no fallback found");
			actualFn = fallbacks[fn];
		}
		if (ops[type].s.indexOf(actualFn) !== -1) {
			isPlural = false;
			if (ops[type].p.indexOf(actualFn) !== -1 && plural === true)
				isPlural = true;
		}
		else if (ops[type].p.indexOf(actualFn) !== -1)
			isPlural = true;
		if (isPlural === undefined)
			throw new DBError("No " + actualFn + " (" + fn + ") function for " + type + " association found");
		if (isPlural)
			target = inflection.pluralize(target);
		return actualFn + target.slice(0, 1).toUpperCase() + target.slice(1);
	}

}

module.exports = DBConnector;
