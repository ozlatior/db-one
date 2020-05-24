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
		if (dbCore instanceof DBCore || dbCore === null) {
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
				let source = models[i].name;
				let target = models[i].associations[j].target;
				let as = models[i].associations[j].target;
				if (models[i].associations[j].as) {
					toPush.as = models[i].associations[j].as;
					as = models[i].associations[j].as;
				}
				if (this.associations[source][target] === undefined)
					this.associations[source][target] = {};
				this.associations[source][target][as] = toPush;
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
			for (let j in this.associations[model][i])
				ret = ret.concat(this.associations[model][i][j]);
		return ret;
	}

	getModelAssociationNames (model) {
		let assocs = this.getModelAssociations(model);
		let ret = {};
		for (let i=0; i<assocs.length; i++) {
			let noun = assocs[i].target;
			if (assocs[i].as)
				noun = assocs[i].as;
			if (noun === model)
				noun = assocs[i].source;
			let target = noun;
			if (assocs[i].type === "belongsToMany" || assocs[i].type === "hasMany")
				noun = inflection.pluralize(noun);
			ret[noun] = target;
		}
		return ret;
	}

	getModelAssociationTarget (model, as) {
		if (!this.associations[model])
			throw new DBError("No associations registered for " + model);
		for (let i in this.associations[model])
			for (let j in this.associations[model][i])
				if (this.associations[model][i][as])
					return i;
		return null;
	}

	getModelAssociationTree (model, paths, node, path) {
		if (node === undefined)
			node = {};
		if (paths === undefined)
			paths = [];
		if (path === undefined)
			path = [];
		path = path.concat(model);
		let entity = model.split("/")[0];
		// run through all associations for this model
		// eg resource has user as owner (ownerId) -> user/owner
		if (this.associations[entity]) {
			for (let i in this.associations[entity]) {
				for (let j in this.associations[entity][i]) {
					if (path.indexOf(i+"/"+j) !== -1)
						continue;
					if (node.children === undefined)
						node.children = {};
					node.children[i+"/"+j] = {
						source: entity,
						target: i,
						as: j,
						type: this.associations[entity][i][j].type,
						reversed: false
					};
					this.getModelAssociationTree(i+"/"+j, paths, node.children[i+"/"+j], path);
				}
			}
		}
		// run through all reversed associations
		// eg user has group as owner (group/group)
		// but user has group as member (group/group)
		for (let i in this.associations) {
			if (this.associations[i][entity]) {
				for (let j in this.associations[i][entity]) {
					if (path.indexOf(i+"/"+i) !== -1)
						continue;
					if (node.children === undefined)
						node.children = {};
					if (node.children[i+"/"+i] !== undefined)
						continue;
					node.children[i+"/"+i] = {
						source: entity,
						target: i,
						as: i,
						type: this.associations[i][entity][j].type,
						reversed: true
					};
					this.getModelAssociationTree(i+"/"+i, paths, node.children[i+"/"+i], path);
				}
			}
		}
		// leaf node, save path
		if (node.children === undefined)
			paths.push(path);
		return node;
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
		if (!this.dbCore)
			throw new Error("No dbCore object specified, cannnot initialize database");
		for (let i in this.models) {
			if (this.models[i].loaded)
				continue;
			this.dbCore.createEntity(i, this.models[i].attributes, this.models[i].options);
		}
		for (let i in this.associations) {
			for (let j in this.associations[i]) {
				for (let k in this.associations[i][j]) {
					if (this.associations[i][j][k].loaded)
						continue;
					let a = this.associations[i][j][k];
					this.dbCore.createAssociation(a.type, a.source, a.target, a.through, a.as);
				}
			}
		}
		return new Promise((resolve, reject) => {
			this.dbCore.initialise(force,
				(model) => { this.models[model].loaded = true; },
				(source, target, as) => { this.associations[source][target][as].loaded = true; }
			).then(resolve).catch(reject);
		});
	}

	dbSync () {
		logger.info("Syncing Database", "dbSync");
		return this.dbInit(false);
	}

}

module.exports = ModelLoader;
