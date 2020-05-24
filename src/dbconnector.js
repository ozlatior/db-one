/*
 * Database Connector Class
 */

const inflection = require("inflection");
const string = require("util-one").string;
const object = require("util-one").object;

const logger = require("./logger.js").getInstance().moduleBinding("DBConnector", "db-one");

const DBError = require("./dberror");

const ModelLoader = require("./modelloader.js");

class DBConnector extends ModelLoader {

	constructor (dbCore) {
		logger.info("Creating DBConnector Object");
		super(dbCore);
		this.functions = {};
		this.constants = {};

		this.addFunction("now", function() { return (new Date()); });
	}

	addConstant (name, value) {
		this.constants[name] = value;
	}

	addFunction (name, fn) {
		logger.info("Adding function " + name, "addFunction");
		this.functions[name] = fn;
	}

	callFunction (name, args, obj) {
		if (!args)
			args = [];
		logger.info("Calling function " + name + " with args [ " + args.join(", ") + " ]", "callFunction");
		for (let i=0; i<args.length; i++) {
			// is it a constant?
			if (args[i][0] === "#") {
				let name = args[i].slice(1);
				if (this.constants[name] === undefined)
					throw new Error("No such constant " + name);
				args[i] = this.constants[name];
			}
			// is it an object value?
			else if (args[i][0] === "$") {
				let path = args[i].slice(1).split(".");
				let value = object.deepRead(obj, path);
				if (value === undefined)
					throw new Error("No such path in object " + args[i]);
				args[i] = value;
			}
		}
		return this.functions[name].apply(null, args);
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

	associateEntry (model, id, target, targetId, as, operation) {
		if (!operation)
			operation = "add";
		logger.info("Association " + operation + " for " + model + " entry id = " + id + " of " +
			target + " (" + as + ") entry id = " + targetId, "associateEntry");
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
				let fn = this.associationFunctionName(operation, model, target, as, plural);
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
	associateEntryReversed (model, id, target, targetId, as, operation) {
		logger.info("Association " + operation + " for " + target + " entry id = " + targetId + " of " +
			model + " (" + as + ") entry id = " + id, "associateEntryReversed");
		if (this.associations[target] === undefined)
			throw new DBError("No associations registered for " + target);
		if (this.associations[target][model] === undefined || this.associations[target][model][as])
			throw new DBError("No reverse association between " + model + " (" + as + ") and " + target);
		let type = this.associations[target][model][as].type;
		// normalize targetId
		if (targetId === null)
			targetId = [];
		if (!(targetId instanceof Array))
			targetId = [ targetId ];
		// if it's a many to many we have to run queries on the association table
		// normally the "as" setting should not be defined for many to many, if it is this will
		// cause issues and not work; for now nothing is implemented in this regard
		// TODO: handle "as" setting
		if (type === "hasMany" || type === "belongsToMany") {
			let tableName = this.associations[target][model][as].through;
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
			let colName = string.changeCase.snakeToCamel(as) + "Id";
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
						this.associateEntryReversed(model, id, target, null, as, "clear").then((result) => {
							this.associateEntryReversed(model, id, target, targetId, as, "add").then(resolve).catch(reject);
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
	associationFunctionName (fn, source, target, as, plural) {
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
		if (!as)
			as = target;
		if (this.associations[source] === undefined)
			throw new DBError("No associations registered for " + source);
		if (this.associations[source][target] === undefined || this.associations[source][target][as] === undefined)
			throw new DBError("No association between " + source + " and " + target + " as " + as);
		let type = this.associations[source][target][as].type;
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
			as = inflection.pluralize(as);
		return actualFn + as.slice(0, 1).toUpperCase() + as.slice(1);
	}

	/*
	 * Optimized function for returning all associations for a list of entries
	 * Since this will be called a lot and it can be called on multiple associated entries with
	 * multiple sources and targets, it uses raw queries to improve performance (instead of calling
	 * the association functions for each source entry)
	 * Returns a promise, the result of this promise will be an object containing all associations for
	 * each source key
	 */
	getAllAssociated(source, target, sourceIds, fullData) {
		logger.info("Getting all associated entries for " + source + " and " + target, "getAllAssociated");
		// we have to use "map" to check if it's an array or not because instanceof does not work when called from the
		// dynamically generated functions - I have a suspicion it has to do with the context being different, so maybe
		// the references to the Array prototype are different... this is the next best thing
		if (sourceIds && !(sourceIds.map))
			sourceIds = [ sourceIds ];
		logger.detail("  source ids: " + sourceIds.join(", "), "getAllAssociated");

		let type, through;
		if (this.associations[target] !== undefined && this.associations[target][source] !== undefined) {
			type = this.associations[target][source].type + " reversed";
			through = this.associations[target][source].through;
		}
		if (this.associations[source] !== undefined && this.associations[source][target] !== undefined) {
			type = this.associations[source][target].type;
			through = this.associations[source][target].through;
		}
		logger.detail("  association: " + type, "getAllAssociated");

		// based on association types we have two possibilities for table layout and two for source and
		// target positioning, which are handled here
		let sourceTable = inflection.pluralize(source);
		let targetTable = inflection.pluralize(target);
		let condition = "";
		if (sourceIds) {
			if (sourceIds.length === 1)
				condition = " = '" + sourceIds[0] + "'";
			else
				condition = " IN ('" + sourceIds.join("', '") + "')";
		}
		let query = null;
		let multiple;
		switch (type) {
			case "hasOne":
			case "belongsTo":					// user, role
				multiple = false;
				target = as;
				if (condition !== "")
					condition = ' WHERE "' + sourceTable + '"."id"' + condition;
				if (fullData)
					query = 'SELECT "' + sourceTable + '"."id" AS "' + source + 'Id", "' +
						targetTable + '"."id" AS "' + target + 'Id", "' + targetTable + '".* FROM "' +
						sourceTable + '" JOIN "' + targetTable + '" ON "' +
						sourceTable + '"."' + target + 'Id" = "' + targetTable + '"."id"' + condition + ";";
				else
					query = 'SELECT "id" AS "' + source + 'Id", "' + target + 'Id" FROM "' + sourceTable + '"' + condition + ";";
				break;
			case "hasOne reversed":
			case "belongsTo reversed":			// role, user
				multiple = true;
				target = as;
				if (condition !== "")
					condition = ' WHERE "' + targetTable + '"."' + source + 'Id"' + condition;
				if (fullData)
					query = 'SELECT "id" AS "' + target + 'Id", * FROM "' + targetTable + '"' + condition + ";";
				else
					query = 'SELECT "id" AS "' + target + 'Id", "' + source + 'Id" FROM "' + targetTable + '"' + condition + ";";
				break;
			case "hasMany":
			case "belongsToMany":				// role, permission
			case "hasMany reversed":
			case "belongsToMany reversed":		// permission, role
				multiple = true;
				if (condition !== "")
					condition = ' WHERE "' + through + '"."' + source + 'Id"' + condition;
				if (fullData)
					query = 'SELECT "' + through + '"."' + source + 'Id" AS "' + source + 'Id", "' +
						through + '"."' + target + 'Id" AS "' + target + 'Id", "' + targetTable + '".* FROM "' +
						through + '" JOIN "' + targetTable + '" ON "' +
						through + '"."' + target + 'Id" = "' + targetTable + '"."id"' + condition + ";";
				else
					query = 'SELECT "' + through + '"."' + source + 'Id" AS "' + source + 'Id", "' +
						through + '"."' + target + 'Id" AS "' + target + 'Id" FROM "' + through + '" ' + condition + ";";
				break;
			default:
				throw new Error("Unknown association type " + type);
		}

		// run the query
		return new Promise((resolve, reject) => {
			this.dbCore.rawQuery(query).then((result) => {
				result = result[0];
				if (result === undefined || !(result instanceof Array))
					throw new Error("Query failed");
				// we want unique objects for each ID for optimisation, so we create two objects
				// the first will store source and target id associations and the second will store the actual
				// data for each target id
				let sources = {};
				let targets = {};
				// build sources object frame
				for (let i=0; i<sourceIds.length; i++) {
					if (multiple)
						sources[sourceIds[i]] = [];
					else
						sources[sourceIds[i]] = null;
				}
				// build targets object to keep unique instances and merge them to source object
				for (let i=0; i<result.length; i++) {
					let sourceId = result[i][source + "Id"];
					let targetId = result[i][target + "Id"];
					if (targets[targetId] === undefined) {
						targets[targetId] = { id: targetId };
						if (fullData) {
							for (let j in result[i]) {
								if (j === source + "Id" && type !== "hasOne reversed" && type !== "belongsTo reversed")
									continue;
								if (j === target + "Id")
									continue;
								targets[targetId][j] = result[i][j];
							}
						}
					}
					if (multiple)
						sources[sourceId].push(targets[targetId]);
					else
						sources[sourceId] = targets[targetId];
				}
				resolve(sources);
			}).catch(reject);
		});
	}

}

module.exports = DBConnector;
