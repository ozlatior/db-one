/*
 * Model Loader Base Class
 */

const inflection = require("inflection");

const logger = require("./logger.js").getInstance().moduleBinding("ModelLoader", "db-one");

const DBError = require("./dberror");

class ModelLoader {

	constructor (dbCore) {
		logger.info("Creating ModelLoader Object");
		this.dbCore = dbCore;
		this.models = {};
		this.associations = {};
		this.ownershipModel = {
			owner: null,
			group: null
		};
	}

	loadModels (models) {
		logger.info("Load Models, count = " + models.length, "loadModels");
		// create models
		for (let i in models) {
			this.models[models[i].name] = models[i];
			this.associations[models[i].name] = {};
		}
		// create associations
		for (let i in models) {
			if (!models[i].associations)
				continue;
			for (let j=0; j<models[i].associations.length; j++) {
				let toPush = {
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

	dbInit (force) {
		logger.info("Setting up Database force=" + force, "dbInit");
		for (let i in this.models)
			this.dbCore.createEntity(i, this.models[i].attributes, this.models[i].options);
		for (let i in this.associations) {
			for (let j in this.associations[i]) {
				this.dbCore.createAssociation(this.associations[i][j].type, this.associations[i][j].source,
					this.associations[i][j].target, this.associations[i][j].through);
			}
		}
		return new Promise((resolve, reject) => {
			this.dbCore.initialise(force).then(resolve).catch(reject);
		});
	}

}

module.exports = ModelLoader;
