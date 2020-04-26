/*
 * Model Loader Base Class
 */

const inflection = require("inflection");

const object = require("util-one").object;

const logger = require("./logger.js").getInstance().moduleBinding("ModelLoader", "db-one");

const DBCore = require("./dbcore");
const DBError = require("./dberror");

class ModelLoader {

	constructor (dbCore) {
		logger.info("Creating ModelLoader Object");
		if (dbCore instanceof DBCore) {
			this.dbCore = dbCore;
			this.models = {};
			this.associations = {};
			this.ownershipModel = {
				owner: null,
				group: null
			};
		}
		// try a copy-like constructor
		else if (dbCore.dbCore instanceof DBCore) {
			this.dbCore = dbCore.dbCore;
			this.models = object.deepCopy(dbCore.models);
			this.associations = object.deepCopy(dbCore.associations);
			this.ownershipModel = object.deepCopy(dbCore.ownershipModel);
		}
	}

	loadModels (models) {
		logger.info("Load Models, count = " + models.length, "loadModels");
		// create models
		for (let i in models) {
			this.models[models[i].name] = object.deepCopy(models[i]);
			this.models[models[i].name].loaded = false;
			this.associations[models[i].name] = {};
		}
		// create associations
		for (let i in models) {
			if (!models[i].associations)
				continue;
			for (let j=0; j<models[i].associations.length; j++) {
				let toPush = {
					loaded: false,
					type: models[i].associations[j].type,
					source: models[i].name,
					target: models[i].associations[j].target
				};
				if (models[i].associations[j].through)
					toPush.through = models[i].associations[j].through;
				this.associations[models[i].name][models[i].associations[j].target] = toPush;
			}
		}
	}

	setOwnerModel (name) {
		logger.info("Setting Owner Model Name to " + name, "setOwnerModel");
		if (this.models[name] === undefined)
			throw new DBError("No such model " + name);
		this.ownershipModel.owner = name;
	}

	getOwnerModel () {
		return this.ownershipModel.owner;
	}

	setGroupModel (name) {
		logger.info("Setting Owner Group Model Name to " + name, "setGroupModel");
		if (this.models[name] === undefined)
			throw new DBError("No such model " + name);
		this.ownershipModel.group = name;
	}

	getGroupModel (name) {
		return this.ownershipModel.group;
	}

	getModelFieldNames (model) {
		if (this.models[model] === undefined)
			throw new DBError("No such model " + model);
		let ret = [];
		for (let i in this.models[model].attributes)
			ret.push(i);
		return ret;
	}

	getModelAssociations (model) {
		if (this.associations[model] === undefined)
			throw new DBError("No such model in associations table " + model);
		let ret = [];
		for (let i in this.associations[model])
			ret.push(this.associations[model][i]);
		return ret;
	}

	getModelAssociationNames (model) {
		let assocs = this.getModelAssociations(model);
		let ret = {};
		for (let i=0; i<assocs.length; i++) {
			let noun = assocs[i].target;
			if (noun === model)
				noun = assocs[i].source;
			let target = noun;
			if (assocs[i].type === "belongsToMany" || assocs[i].type === "hasMany")
				noun = inflection.pluralize(noun);
			ret[noun] = target;
		}
		return ret;
	}

	isModelInitialised (model) {
		if (this.models[model] === undefined)
			throw new DBError("No such model " + model);
		return (this.models[model].loaded === true);
	}

	isAssociationInitialised (source, target) {
		if (this.associations[source] === undefined || this.association[source][target] === undefined)
			throw new DBError("No association found between " + source + " and " + target);
		return (this.associations[source][target].loaded === true);
	}

	dbInit (force) {
		logger.info("Setting up Database force=" + force, "dbInit");
		for (let i in this.models) {
			if (this.models[i].loaded)
				continue;
			this.dbCore.createEntity(i, this.models[i].attributes, this.models[i].options);
		}
		for (let i in this.associations) {
			for (let j in this.associations[i]) {
				if (this.associations[i][j].loaded)
					continue;
				this.dbCore.createAssociation(this.associations[i][j].type, this.associations[i][j].source,
					this.associations[i][j].target, this.associations[i][j].through);
			}
		}
		return new Promise((resolve, reject) => {
			this.dbCore.initialise(force,
				(model) => { this.models[model].loaded = true; },
				(source, target) => { this.associations[source][target].loaded = true; }
			).then(resolve).catch(reject);
		});
	}

	dbSync () {
		logger.info("Syncing Database", "dbSync");
		return this.dbInit(false);
	}

}

module.exports = ModelLoader;
