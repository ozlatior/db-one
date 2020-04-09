/*
 * DB Core Class
 */

const logger = require("./logger.js").getInstance().moduleBinding("DBCore", "db-one");

const DBError = require("./dberror");

class DBCore {

	constructor (sql) {
		logger.info("Creating DBCore Object");
		this.sql = sql;
		this.entities = {};
	}

	createEntity (name, attributes, options) {
		logger.info("Creating Entity " + name + ": " + Object.getOwnPropertyNames(attributes).join(", "),
			"createEntity");
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

	initialise (force) {
		logger.info("Initialising Database force=" + (!!force), "initialise");
		return new Promise((resolve, reject) => {
			this.sql.authenticate()
				.then(() => {
					logger.info(
						'Database connection to \'' + this.sql.config.host + '/' + this.sql.config.database + '\' successful',
						"initialise");
					this.sql.sync({force: force}).then(() => {
						logger.info('Sync succesful', "loadModels");
						resolve();
					}).catch(reject);
				})
				.catch(reject);
		});
	}

}

module.exports = DBCore;
