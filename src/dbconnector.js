/*
 * Database Connector Class
 */

const inflection = require("inflection");
const string = require("util-one").string;

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
		return new Promise((resolve, reject) => {
			if (entity === undefined)
				throw new DBError("No such model/entity " + model);
			entity.update(data, { where: { id : id } }).then((result) => {
				resolve(result[0]);
			}).catch(reject);
		});
	}

	deleteEntry (model, id) {
		logger.info("Deleting " + model + " entry id = " + id, "deleteEntry");
		let entity = this.dbCore.getEntity(model);
		return new Promise((resolve, reject) => {
			if (entity === undefined)
				throw new DBError("No such model/entity " + model);
			entity.destroy({ where: { id: id } }).then((result) => {
				if (result === 0)
					logger.warn("Entry not found for deletion (id = " + id + ")", "deleteEntry");
				resolve(result === 1);
			}).catch(reject);
		});
	}

	associateEntry (model, id, target, targetId, operation) {
		if (!operation)
			operation = "add";
		logger.info("Association " + operation + " for " + model + " entry id = " + id + " of " +
			target + " entry id = " + targetId, "associateEntry");
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
				let plural = false;
				if (targetId && targetId instanceof Array)
					plural = true;
				let fn = this.associationFunctionName(operation, model, target, plural);
				result[0][fn](targetId).then((result) => {
					if (result instanceof Array) {
						let ret = [];
						result.map((item) => {
							if (item.dataValues)
								ret.push(item.dataValues);
							else
								ret.push(item);
						});
						resolve(ret);
						return;
					}
					if (result && result.dataValues) {
						resolve(result.dataValues);
						return;
					}
					resolve(result);
				}).catch(reject);
			}).catch(reject);
		});
	}

	// reverse associations - for reverse associations the target has to be associated to the entity
	// and we define the following operations
	// clear = (targets).is(entityId).set(null)
	// set = clear + add
	// get = (targets).is(entityId)
	// add = (targets).where(targetId).set(entityId)
	// remove = (targets).where(targetId).is(entityId).set(null)
	// has = (targets).where(targetId).is(entityId) (AND)
	// count = (targets).is(entityId) (count++)
	// for one to many associations we can do this using queries on the entity objects in the database
	// for many to many associations we have to run queries directly on the association table, unless
	// the user has defined the association both ways, in which case we can simply run the reverse functions
	// (in that case this code will not be executed, but the one for regular associations)
	associateEntryReversed (model, id, target, targetId, operation) {
		logger.info("Association " + operation + " for " + target + " entry id = " + targetId + " of " +
			model + " entry id = " + id, "associateEntryReversed");
		if (this.associations[target] === undefined || this.associations[target][model] === undefined)
			throw new DBError("No reverse association between " + model + " and " + target);
		let type = this.associations[target][model].type;
		// normalize targetId
		if (targetId === null)
			targetId = [];
		if (!(targetId instanceof Array))
			targetId = [ targetId ];
		// it's a many to many, these are symmetrical so we should be able to just call
		// the regular function with mirrored arguments
		if (type === "hasMany" || type === "belongsToMany") {
			let tableName = this.associations[target][model].through;
			let sourceCol = string.changeCase.snakeToCamel(model) + "Id";
			let targetCol = string.changeCase.snakeToCamel(target) + "Id";
			let targetTableName = inflection.pluralize(target);
			let query = null;
			let values;
			switch (operation) {
				case "clear":
					query = "DELETE FROM \"" + tableName + "\" WHERE \"" + sourceCol + "\" = '" + id + "'";
					break;
				case "add":
					if (targetId.length === 0)
						break;
					values = targetId.map((item) => "(CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), '" + id + "', '" + item + "')");
					values = values.join(", ");
					query = "INSERT INTO \"" + tableName + "\" (\"createdAt\", \"updatedAt\", \"" + sourceCol + "\", \"" + targetCol + "\") ";
					query += "VALUES " + values;
					break;
				case "remove":
					if (targetId.length === 0)
						break;
					values = targetId.map((item) => "'" + item + "'");
					values = values.join(", ");
					query = "DELETE FROM \"" + tableName + "\" WHERE \"" + sourceCol + "\" = '" + id + "'";
					if (targetId.length === 1)
						query += " AND \"" + targetCol + "\" = " + values;
					else
						query += " AND \"" + targetCol + "\" IN (" + values + ")";
					break;
				case "set":
					return new Promise((resolve, reject) => {
						this.associateEntryReversed(model, id, target, null, "clear").then((result) => {
							this.associateEntryReversed(model, id, target, targetId, "add").then(resolve).catch(reject);
						}).catch(reject);
					});
				case "has":
					if (targetId.length === 0) {
						query = false;
						break;
					}
					values = targetId.map((item) => "'" + item + "'");
					values = values.join(", ");
					query = "SELECT COUNT(DISTINCT \"" + targetCol + "\") FROM \"" + tableName +
						"\" WHERE \"" + sourceCol + "\"='" + id + "'";
					if (targetId.length === 1)
						query += " AND \"" + targetCol + "\" = " + values;
					else
						query += " AND \"" + targetCol + "\" IN (" + values + ")";
					break;
				case "get":
					query = "SELECT \"" + targetTableName + "\".* FROM \"" + tableName + "\"";
					query += " LEFT JOIN \"" + targetTableName + "\" ON \"" +
						tableName + "\".\"" + targetCol +"\"=\"" + targetTableName + "\".id";
					query += " WHERE \"" + tableName + "\".\"" + sourceCol + "\"='" + id + "'";
					break;
				case "count":
					query = "SELECT COUNT(*) FROM \"" + tableName + "\" WHERE \"" + sourceCol + "\"='" + id + "'";
					break;
			}
			if (typeof(query) === "string")
				query += ";";
			return new Promise((resolve, reject) => {
				if (query === null) {
					resolve([]);
					return;
				}
				if (typeof(query) === "boolean") {
					resolve(query);
					return;
				}
				this.dbCore.rawQuery(query).then((result) => {
					switch (operation) {
						case "clear":
							resolve(result[1].rowCount);
							return;
						case "add":
							resolve(result[1]);
							return;
						case "remove":
							resolve(result[1].rowCount);
							return;
						case "has":
							resolve(parseInt(result[0][0].count) === targetId.length);
							return;
						case "get":
							resolve(result[0]);
							return;
						case "count":
							resolve(parseInt(result[0][0].count));
							return;
					}
				}).catch(reject);
			});
		}
		else {
			let entity = this.dbCore.getEntity(target);
			let colName = string.changeCase.snakeToCamel(model) + "Id";
			let set = {};
			let where = {};
			switch (operation) {
				case "clear":
					where[colName] = id;
					set[colName] = null;
					break;
				case "add":
					where.id = targetId;
					set[colName] = id;
					break;
				case "remove":
					where.id = targetId;
					where[colName] = id;
					set[colName] = null;
					break;
				case "set":
					return new Promise((resolve, reject) => {
						this.associateEntryReversed(model, id, target, null, "clear").then((result) => {
							this.associateEntryReversed(model, id, target, targetId, "add").then(resolve).catch(reject);
						}).catch(reject);
					});
				case "has":
					where.id = targetId;
				case "get":
				case "count":
					where[colName] = id;
					return new Promise((resolve, reject) => {
						this.getEntries(target, where).then((result) => {
							if (operation === "get")
								resolve(result.map((item) => item.dataValues));
							else if (operation === "count")
								resolve(result.length);
							else
								resolve(result.length === targetId.length);
						}).catch(reject);
					});
				default:
					throw new Error("Not implemented (1:n)");
			}
			return new Promise((resolve, reject) => {
				entity.update(set, { where: where }).then((result) => {
					resolve(result);
				}).catch(reject);
			});
		}
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
