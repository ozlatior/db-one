/*
 * Database Session Class Generator Base Class
 */

const inflection = require("inflection");
const vm = require("vm");

const string = require("util-one").string;

const logger = require("./logger.js").getInstance().moduleBinding("DBGenerator", "db-one");

const ModelLoader = require("./modelloader.js");
const DBSession = require("./dbsession.js");

const DBError = require("./dberror.js");
const GeneratorError = require("./generatorerror.js");

const TEMPLATES = {

	// TODO: hooks
	// TODO: logging
	// TODO: associations
	// TODO: options
	// TODO: error handling?

	create: function (__MODELCC__Data) {
		return new Promise((resolve, reject) => {
			this.dbConnector.createEntry("__MODEL__", __MODELCC__Data).then((result) => {
				resolve(result);
			}).catch(reject);
		});
	},

	createByArgs: function (__MODELARGS__) {
		let data;
		if (typeof(__MODELFA__) === "object")
			data = __MODELFA__;
		else
			data = __MODELDO__;
		return new Promise((resolve, reject) => {
			this.dbConnector.createEntry("__MODEL__", data).then((result) => {
				resolve(result);
			}).catch(reject);
		});
	},

	retrieve: function (__MODELCC__Id, options) {
		return new Promise((resolve, reject) => {
			this.dbConnector.listEntries("__MODEL__", { id: __MODELCC__Id }).then((result) => {
				if (result.length === 0)
					throw new DBError("No __MODEL__ with id " + __MODELCC__Id + " found");
				resolve(result[0]);
			}).catch(reject);
		});
	},

	update: function (__MODELCC__Id, __MODELCC__Data) {
		return new Promise((resolve, reject) => {
			this.dbConnector.updateEntry("__MODEL__", __MODELCC__Id, __MODELCC__Data).then((result) => {
				resolve(result);
			}).catch(reject);
		});
	},

	updateByArgs: function (__MODELCC__Id, __MODELARGS__) {
		let data;
		if (typeof(__MODELFA__) === "object")
			data = __MODELFA__;
		else
			data = __MODELDO__;
		return new Promise((resolve, reject) => {
			this.dbConnector.updateEntry("__MODEL__", __MODELCC__Id, data).then((result) => {
				resolve(result);
			}).catch(reject);
		});
	},

	delete: function (__MODELCC__Id) {
		return new Promise((resolve, reject) => {
			this.dbConnector.deleteEntry("__MODEL__", __MODELCC__Id).then((result) => {
				resolve(result);
			}).catch(reject);
		});
	},

	// TODO: filters
	list: function (filter, options) {
		return new Promise((resolve, reject) => {
			this.dbConnector.listEntries("__MODEL__", {}).then((result) => {
				resolve(result);
			}).catch(reject);
		});
	},

	associationSet: function (__MODELCC__Id, __TARGETCC__Id) {
		return new Promise((resolve, reject) => {
			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", __TARGETCC__Id, "__OP__")
				.then(resolve).catch(reject);
		});
	},

	associationGet: function (__MODELCC__Id) {
		return new Promise((resolve, reject) => {
			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "__OP__")
				.then(resolve).catch(reject);
		});
	},

	associationUnset: function (__MODELCC__Id) {
		return new Promise((resolve, reject) => {
			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "set")
				.then(resolve).catch(reject);
		});
	},

	associationCompare: function (__MODELCC__Id, __TARGETCC__Id) {
		return new Promise((resolve, reject) => {
			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "get").then((result) => {
				if (result === null)
					resolve(__TARGETCC__Id === null)
				else
					resolve(__TARGETCC__Id === result.id);
			}).catch(reject);
		});
	},

	associationIsSet: function (__MODELCC__Id) {
		return new Promise((resolve, reject) => {
			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "get").then((result) => {
				resolve(!!result && !!result.id);
			}).catch(reject);
		});
	}

};

class DBGenerator extends ModelLoader {

	constructor (dbCore, className) {
		if (!className)
			className = "DBGeneratedSession";
		logger.info("Creating DGGenerator Object, className = " + className);
		super(dbCore);
		this.className = className;
		this.ctx = Object.create(null);
		this.ctx.DBSession = DBSession;
		this.ctx.DBError = DBError;
	}

	processFunctionTemplate (str, tokens) {
		if (str instanceof Function)
			str = str.toString();
		if (!tokens)
			tokens = {};
		let ret = {};
		let l = str.indexOf("{");
		let r = str.lastIndexOf("}");
		ret.header = str.slice(0, l);
		ret.body = str.slice(l+1, r);
		for (let i in tokens) {
			let r = new RegExp(i, "g");
			ret.header = ret.header.replace(r, tokens[i]);
			ret.body = ret.body.replace(r, tokens[i]);
		}
		l = ret.header.indexOf("(");
		r = ret.header.lastIndexOf(")");
		ret.args = ret.header.slice(l+1, r).replace(/ +/g, "").split(",");
		return ret;
	}

	getFunctionName (operation, entity, target, field) {
		if (entity)
			entity = string.changeCase.snakeToCapital(entity, true);
		if (target)
			target = string.changeCase.snakeToCapital(target, true);
		if (field)
			field = string.changeCase.snakeToCapital(field, true);

		switch (operation) {
			case "create":
			case "retrieve":
			case "update":
			case "delete":
				return operation + entity;
			case "list":
				return operation + inflection.pluralize(entity);
			case "set":
			case "get":
			case "unset":
			case "add":
			case "remove":
			case "is":
			case "isSet":
			case "has":
				return operation + entity + target;
			case "setMany":
			case "getMany":
			case "count":
				return operation.replace("Many", "") + entity + inflection.pluralize(target);
		}
	}

	getArgumentList (entityName) {
		if (this.models[entityName] === undefined)
			throw new DBGeneratorError("No such model " + entityName);
		let entity = this.models[entityName];
		let idField;
		if (entity.meta && entity.meta.idField)
			idField = entity.meta.idField;
		let ret = [];
		for (let i in entity.attributes) {
			if (i === idField)
				continue;
			ret.push(i);
		}
		if (!this.associations[entityName])
			return ret;
		let assoc = this.associations[entityName];
		for (let i in assoc) {
			if (assoc[i].type === "hasMany" || assoc[i].type === "belongsToMany")
				continue;
			ret.push(string.changeCase.snakeToCamel(assoc[i].target, true) + "Id");
		}
		return ret;
	}

	attachEntityMethods (proto, entity, doc) {
		logger.info("Attaching entity methods for " + entity, "attachEntityMethods");
		let res;
		let fn;
		let args = this.getArgumentList(entity);
		let tokens = {
			__MODEL__: entity,
			__MODELCC__: string.changeCase.snakeToCamel(entity, true),
			__MODELARGS__: args.join(", "),
			__MODELFA__: args[0],
			__MODELDO__: "{\n" + args.map((item) => { return "\t\t\t\t" + item + ": " + item }).join(",\n") + "\n\t\t\t}"
		};
		// create entity
		res = this.processFunctionTemplate(TEMPLATES.create, tokens);
		fn = this.getFunctionName("create", entity);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "create", entity);
		// create entity by arguments
		res = this.processFunctionTemplate(TEMPLATES.createByArgs, tokens);
		fn = this.getFunctionName("create", entity);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "create", entity);
		// retrieve entity
		res = this.processFunctionTemplate(TEMPLATES.retrieve, tokens);
		fn = this.getFunctionName("retrieve", entity);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "retrieve", entity);
		// update entity
		res = this.processFunctionTemplate(TEMPLATES.update, tokens);
		fn = this.getFunctionName("update", entity);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "update", entity);
		// delete entity
		res = this.processFunctionTemplate(TEMPLATES.delete, tokens);
		fn = this.getFunctionName("delete", entity);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "delete", entity);
		// list entities
		res = this.processFunctionTemplate(TEMPLATES.list, tokens);
		fn = this.getFunctionName("list", entity);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "list", entity);
	}

	attachOneToManyMethods (proto, entity, target, doc) {
		logger.info("Attaching one to many methods for " + entity + ", " + target, "attachOneToManyMethods");
		let res;
		let fn;
		let tokens = {
			__MODEL__: entity,
			__MODELCC__: string.changeCase.snakeToCamel(entity, true),
			__TARGET__: target,
			__TARGETCC__: string.changeCase.snakeToCamel(target, true)
		};
		// set association
		tokens.__OP__ = "set";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("set", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "set", entity, target);
		// get association
		tokens.__OP__ = "get";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("get", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "get", entity, target);
		// unset association
		res = this.processFunctionTemplate(TEMPLATES.associationUnset, tokens);
		fn = this.getFunctionName("unset", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "set", entity, target);
		// isSet association
		res = this.processFunctionTemplate(TEMPLATES.associationIsSet, tokens);
		fn = this.getFunctionName("isSet", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "set", entity, target);
		// check that target is associated
		res = this.processFunctionTemplate(TEMPLATES.associationCompare, tokens);
		fn = this.getFunctionName("is", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "is", entity, target);
	}

	attachManyToManyMethods (proto, entity, target, doc) {
		logger.info("Attaching many to many methods for " + entity + ", " + target, "attachManyToManyMethods");
		let res;
		let fn;
		let tokens = {
			__MODEL__: entity,
			__MODELCC__: string.changeCase.snakeToCamel(entity, true),
			__TARGET__: target,
			__TARGETCC__: string.changeCase.snakeToCamel(target, true)
		};
		// add association
		tokens.__OP__ = "add";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("add", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "add", entity, target);
		// remove association
		tokens.__OP__ = "remove";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("remove", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "remove", entity, target);
		// set all associations
		tokens.__OP__ = "set";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("setMany", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "setMany", entity, target);
		// get all associations
		tokens.__OP__ = "get";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("getMany", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "getMany", entity, target);
		// check that target is associated
		tokens.__OP__ = "has";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("has", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "has", entity, target);
		// count associated target entities
		tokens.__OP__ = "count";
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		fn = this.getFunctionName("count", entity, target);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "count", entity, target);
	}

	attachAssociationMethods (proto, association, doc) {
		logger.info("Attaching association methods for " + JSON.stringify(association), "attachAssociationMethods");
		if (association.type === "hasMany" || association.type === "belongsToMany")
			this.attachManyToManyMethods(proto, association.source, association.target, doc);
		else
			this.attachOneToManyMethods(proto, association.source, association.target, doc);
	}

	attachReverseAssociationMethods (proto, association) {
		logger.info("Attaching reverse association methods for " + JSON.stringify(association), "attachReverseAssociationMethods");
	}

	generateSessionClass (doc) {
		logger.info("Generating session class, className = " + this.className);
		if (!doc)
			doc = { push: () => {} };
		let ret;
		try {
			vm.runInNewContext("cls = class " + this.className + " extends DBSession {}", this.ctx);
			ret = this.ctx.cls;
		}
		catch (e) {
			logger.error(e);
			return null;
		}
		// model CRUD methods
		for (let i in this.models)
			this.attachEntityMethods(ret.prototype, i, doc);
		// association methods (direct)
		for (let i in this.associations)
			for (let j in this.associations[i])
				this.attachAssociationMethods(ret.prototype, this.associations[i][j], doc);
		// association methods (reverse)
		for (let i in this.associations)
			for (let j in this.associations[i])
				this.attachReverseAssociationMethods(ret.prototype, this.associations[i][j], doc);
		return ret;
	}

}

module.exports = DBGenerator;
