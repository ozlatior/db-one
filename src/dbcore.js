/*
 * DB Core Class
 */

const inflection = require("inflection");
const pgsqlParser = require("pgsql-parser");

const logger = require("./logger.js").getInstance().moduleBinding("DBCore", "db-one");

const DBError = require("./dberror");

class DBCore {

	constructor (sql) {
		logger.info("Creating DBCore Object");
		this.sql = sql;
		this.entities = {};
		this.models = {};
		this.associations = {};
	}

	createEntity (name, attributes, options) {
		logger.info("Creating Entity " + name + ": " + Object.getOwnPropertyNames(attributes).join(", "),
			"createEntity");
		this.models[name] = {
			name: name,
			loaded: false,
			attributes: attributes,
			options: options
		};
		if (this.entities[name] !== undefined)
			throw new DBError("Entity " + name + " already defined");
		try {
			this.entities[name] = this.sql.define(name, attributes, options);
		}
		catch (e) {
			throw new DBError(e);
		}
		return true;
	}

	getEntity (name) {
		return this.entities[name];
	}

	createAssociation (type, source, target, through) {
		logger.info("Creating Association " + source + " " + type + " " + target + " " + through,
			"createAssociation");
		let sourceEntity = this.entities[source];
		let targetEntity = this.entities[target];
		let options = { through: through };
		if (this.associations[source] === undefined)
			this.associations[source] = {};
		this.associations[source][target] = {
			type: type,
			source: source,
			target: target,
			through: through,
			loaded: false
		};
		if (sourceEntity === undefined)
			throw new DBError("Source entity " + src + " not found");
		if (targetEntity === undefined)
			throw new DBError("Target entity " + src + " not found");
		switch (type) {
			case 'hasOne':
				sourceEntity.hasOne(targetEntity, options);
				break;
			case 'hasMany':
				sourceEntity.hasMany(targetEntity, options);
				break;
			case 'belongsTo':
				sourceEntity.belongsTo(targetEntity, options);
				break;
			case 'belongsToMany':
				if (options.through === undefined) {
					throw new DBError('Missing through argument for belongsToMany association');
				}
				sourceEntity.belongsToMany(targetEntity, options);
				break;
			default:
				throw new DBError('Unknown association type ' + type);
		}
		return true;
	}

	initialise (force, modelCb, associationCb) {
		logger.info("Initialising Database force=" + (!!force), "initialise");
		return new Promise((resolve, reject) => {
			this.sql.authenticate()
				.then(() => {
					logger.info(
						'Database connection to \'' + this.sql.config.host + '/' + this.sql.config.database + '\' successful',
						"initialise");
					this.sync(force, modelCb, associationCb).then(() => {
						logger.info('Sync succesful', "initialise");
						resolve();
					}).catch(reject);
				})
				.catch(reject);
		});
	}

	syncLogFn (modelCb, associationCb, msg) {
		logger.sql(msg, "sync");
		if (!modelCb && !associationCb)
			return;
		let query = msg.replace(/Executing \([^\(\)]*\): /, "");
		query = pgsqlParser.parse(query).query;
		let stmt = query[0].RawStmt.stmt.CreateStmt;
		if (!stmt)
			return;
		let relName = stmt.relation.RangeVar.relname;
		let modelName = inflection.singularize(relName);
		let cols = [];
		let assocs = [];
		stmt.tableElts.map((el) => {
			if (el && el.ColumnDef) {
				let colname = el.ColumnDef.colname;
				cols.push(colname);
				if (el.ColumnDef.constraints === undefined)
					return;
				for (let i=0; i<el.ColumnDef.constraints.length; i++) {
					if (el.ColumnDef.constraints[i].Constraint.contype === 8) { // foreign key
						let target = el.ColumnDef.constraints[i].Constraint.pktable.RangeVar.relname;
						target = inflection.singularize(target);
						if (this.models[target])
							assocs.push(target);
						else
							logger.warn("No model found for association target " + target, "sync.syncLogFn");
					}
				}
			}
		});
		// is it a model?
		if (this.models[modelName]) {
			this.models[modelName].loaded = true;
			modelCb(modelName);
			if (!associationCb)
				return;
			// check for associations
			if (this.associations[modelName]) {
				for (let i=0; i<assocs.length; i++) {
					if (this.associations[modelName][assocs[i]]) {
						this.associations[modelName][assocs[i]].loaded = true;
						associationCb(modelName, assocs[i]);
					}
					else
						logger.warn("No association between " + modelName + " and " + target, "sync.syncLogFn");
				}
			}
			else if (assocs.length)
				logger.warn("No association found for model " + modelName + " (" + assocs.join(", ") + ")", "sync.syncLogFn");
			return;
		}
		if (!associationCb)
			return;
		// is it a many-to-many association table?
		for (let i=0; i<assocs.length; i++) {
			for (let j=0; j<assocs.length; j++) {
				if (i === j)
					continue;
				if (this.associations[assocs[i]] && this.associations[assocs[i]][assocs[j]]) {
					this.associations[assocs[i]][assocs[j]].loaded = true;
					associationCb(assocs[i], assocs[j]);
				}
				else
					logger.warn("No association between " + assocs[i] + " and " + assocs[j], "sync.syncLogFn");
			}
		}
	}

	sync (force, modelCb, associationCb) {
		logger.info("Running sync", "sync");
		return new Promise((resolve, reject) => {
			this.sql.sync({
				force: force,
				logging: this.syncLogFn.bind(this, modelCb, associationCb)
			}).then(() => {
				logger.info('Sync succesful', "sync");
				resolve();
			}).catch(reject);
		});
	}

}

module.exports = DBCore;
