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

const TEMPLATES = require("./dbgeneratortemplates.js");

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
		this.ctx.logger = require("./logger.js").getInstance(className).moduleBinding(className, "db-one");
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
		fn = this.getFunctionName("create", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.create, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "create", entity);

		// create entity by arguments
		fn = this.getFunctionName("create", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.createByArgs, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "create", entity);

		// retrieve entity
		fn = this.getFunctionName("retrieve", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.retrieve, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "retrieve", entity);

		// update entity
		fn = this.getFunctionName("update", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.update, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "update", entity);

		// update entity by arguments
		fn = this.getFunctionName("update", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.updateByArgs, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "update", entity);

		// delete entity
		fn = this.getFunctionName("delete", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.delete, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "delete", entity);

		// list entities
		fn = this.getFunctionName("list", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.list, tokens);
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
		fn = this.getFunctionName("set", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "set", entity, target);

		// get association
		tokens.__OP__ = "get";
		fn = this.getFunctionName("get", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "get", entity, target);

		// unset association
		fn = this.getFunctionName("unset", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationUnset, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "set", entity, target);

		// isSet association
		fn = this.getFunctionName("isSet", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationIsSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "set", entity, target);

		// check that target is associated
		fn = this.getFunctionName("is", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationCompare, tokens);
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
		fn = this.getFunctionName("add", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "add", entity, target);

		// remove association
		tokens.__OP__ = "remove";
		fn = this.getFunctionName("remove", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "remove", entity, target);

		// set all associations
		tokens.__OP__ = "set";
		fn = this.getFunctionName("setMany", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "setMany", entity, target);

		// get all associations
		tokens.__OP__ = "get";
		fn = this.getFunctionName("getMany", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationGet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "getMany", entity, target);

		// check that target is associated
		tokens.__OP__ = "has";
		fn = this.getFunctionName("has", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
		doc.push(fn, res, "has", entity, target);

		// count associated target entities
		tokens.__OP__ = "count";
		fn = this.getFunctionName("count", entity, target);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationGet, tokens);
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

	attachReverseAssociationMethods (proto, association, doc) {
		logger.info("Attaching reverse association methods for " + JSON.stringify(association), "attachReverseAssociationMethods");
		let res;
		let fn;
		let entity = association.target;
		let target = association.source;
		let tokens = {
			__MODEL__: entity,
			__MODELCC__: string.changeCase.snakeToCamel(entity, true),
			__TARGET__: target,
			__TARGETCC__: string.changeCase.snakeToCamel(target, true)
		};

		// add association
		fn = this.getFunctionName("add", entity, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "add";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
			doc.push(fn, res, "add", entity, target);
		}

		// remove association
		fn = this.getFunctionName("remove", entity, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "remove";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
			doc.push(fn, res, "remove", entity, target);
		}

		// set all associations
		fn = this.getFunctionName("setMany", entity, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "set";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
			doc.push(fn, res, "setMany", entity, target);
		}

		// get all associations
		fn = this.getFunctionName("getMany", entity, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "get";
			res = this.processFunctionTemplate(TEMPLATES.associationGetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
			doc.push(fn, res, "getMany", entity, target);
		}

		// check that target is associated
		fn = this.getFunctionName("has", entity, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "has";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
			doc.push(fn, res, "has", entity, target);
		}

		// count associated target entities
		fn = this.getFunctionName("count", entity, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "count";
			res = this.processFunctionTemplate(TEMPLATES.associationGetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = vm.runInNewContext("new Function('" + res.args.join(",") + "', `" + res.body + "`);", this.ctx);
			doc.push(fn, res, "count", entity, target);
		}
	}

	/*
	 * proto could be a prototype object or just any object if we want to generate code instead
	 */
	attachMethods (proto, doc) {
		// model CRUD methods
		for (let i in this.models)
			this.attachEntityMethods(proto, i, doc);
		// association methods (direct)
		for (let i in this.associations)
			for (let j in this.associations[i])
				this.attachAssociationMethods(proto, this.associations[i][j], doc);
		// association methods (reverse)
		for (let i in this.associations)
			for (let j in this.associations[i])
				this.attachReverseAssociationMethods(proto, this.associations[i][j], doc);
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

		this.attachMethods(ret.prototype, doc);

		return ret;
	}

}

module.exports = DBGenerator;
