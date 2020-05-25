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

const DEFAULT_ASSOCIATION_FLAG_DEPTH = 2;

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

		this.settings = {
			associationFlagDepth: DEFAULT_ASSOCIATION_FLAG_DEPTH
		};
	}

	getAssociationFlagDepth () {
		return this.settings.associationFlagDepth;
	}

	setAssociationFlagDepth (depth) {
		this.settings.associationFlagDepth = depth;
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
			for (let j in assoc[i]) {
				if (assoc[i][j].type === "hasMany" || assoc[i][j].type === "belongsToMany")
					continue;
				ret.push(string.changeCase.snakeToCamel(j, true) + "Id");
			}
		}
		return ret;
	}

	generateFunctionObject (args, body, dynamic) {
		if (dynamic)
			return vm.runInNewContext("new Function('" + args.join(",") + "', `" + body + "`);", this.ctx);
		return { args: args, body: body };
	}

	getAssociationFlags (tree, paths, depth) {
		let ret = {};
		paths = JSON.parse(JSON.stringify(paths));
		for (let i=0; i<paths.length; i++) {
			paths[i] = paths[i].slice(1);
			for (let j=0; j<paths[i].length; j++) {
				if (depth && j >= depth)
					continue;
				let path = paths[i].slice(0, j+1);
				// copy path settings and push them to flag object
				let node = tree;
				let names = [];
				let plural = false;
				let chain = path.map((item) => {
					node = node.children[item];
					if (node.reversed || node.type === "hasMany" || node.type === "belongsToMany")
						plural = true;
					names.push(node.as);
					return {
						source: node.source,
						target: node.target,
						type: node.type,
						as: node.as,
						reversed: node.reversed
					};
				});
				let flag = "include" + string.changeCase.snakeToCapital(names.join("_"));
				if (plural)
					flag = inflection.pluralize(flag);
				ret[flag] = chain;
			}
		}
		return ret;
	}

	attachEntityMethods (proto, entity, doc, dynamic) {
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

		// get association tree for options
		let assocPaths = [];
		let assocTree = this.getModelAssociationTree(entity + "/" + entity, assocPaths);
		assocPaths.sort((a, b) => { return a.length - b.length; });
		let assocFlags = this.getAssociationFlags(assocTree, assocPaths, this.settings.associationFlagDepth);
		tokens.__ASSOC_BLOCK__ = TEMPLATES.ASSOC_BLOCK(assocFlags);

		// create entity
		fn = this.getFunctionName("create", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.create, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "create", entity);

		// create entity by arguments
		fn = this.getFunctionName("create", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.createByArgs, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "create", entity);

		// retrieve entity
		fn = this.getFunctionName("retrieve", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.retrieve, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		res.objects = { options: { associationFlags: assocFlags } };
		doc.push(fn, res, "retrieve", entity);

		// update entity
		fn = this.getFunctionName("update", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.update, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "update", entity);

		// update entity by arguments
		fn = this.getFunctionName("update", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.updateByArgs, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "update", entity);

		// delete entity
		fn = this.getFunctionName("delete", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.delete, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "delete", entity);

		// list entities
		fn = this.getFunctionName("list", entity);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.list, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachEntityMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		res.objects = { options: { associationFlags: assocFlags } };
		doc.push(fn, res, "list", entity);
	}

	attachOneToManyMethods (proto, entity, target, as, doc, dynamic) {
		logger.info("Attaching one to many methods for " + entity + ", " + target + " as " + as, "attachOneToManyMethods");
		let res;
		let fn;
		let tokens = {
			__MODEL__: entity,
			__MODELCC__: string.changeCase.snakeToCamel(entity, true),
			__TARGET__: target,
			__TARGETCC__: string.changeCase.snakeToCamel(target, true),
			__ALIAS__: as,
			__ALIASCC__: string.changeCase.snakeToCamel(as, true)
		};

		// set association
		tokens.__OP__ = "set";
		fn = this.getFunctionName("set", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "set", entity, target);

		// get association
		tokens.__OP__ = "get";
		fn = this.getFunctionName("get", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "get", entity, target);

		// unset association
		fn = this.getFunctionName("unset", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationUnset, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "set", entity, target);

		// isSet association
		fn = this.getFunctionName("isSet", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationIsSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "set", entity, target);

		// check that target is associated
		fn = this.getFunctionName("is", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationCompare, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachOneToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "is", entity, target);
	}

	attachManyToManyMethods (proto, entity, target, as, doc, dynamic) {
		logger.info("Attaching many to many methods for " + entity + ", " + target + " as " + as, "attachManyToManyMethods");
		let res;
		let fn;
		let tokens = {
			__MODEL__: entity,
			__MODELCC__: string.changeCase.snakeToCamel(entity, true),
			__TARGET__: target,
			__TARGETCC__: string.changeCase.snakeToCamel(target, true),
			__ALIAS__: as,
			__ALIASCC__: string.changeCase.snakeToCamel(as, true)
		};

		// add association
		tokens.__OP__ = "add";
		fn = this.getFunctionName("add", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "add", entity, target);

		// remove association
		tokens.__OP__ = "remove";
		fn = this.getFunctionName("remove", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "remove", entity, target);

		// set all associations
		tokens.__OP__ = "set";
		fn = this.getFunctionName("setMany", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "setMany", entity, target);

		// get all associations
		tokens.__OP__ = "get";
		fn = this.getFunctionName("getMany", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationGet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "getMany", entity, target);

		// check that target is associated
		tokens.__OP__ = "has";
		fn = this.getFunctionName("has", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationSet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "has", entity, target);

		// count associated target entities
		tokens.__OP__ = "count";
		fn = this.getFunctionName("count", entity, as);
		tokens.__FN__ = fn;
		res = this.processFunctionTemplate(TEMPLATES.associationGet, tokens);
		logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachManyToManyMethods");
		proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
		doc.push(fn, res, "count", entity, target);
	}

	attachAssociationMethods (proto, association, doc, dynamic) {
		logger.info("Attaching association methods for " + JSON.stringify(association), "attachAssociationMethods");
		let source = association.source;
		let target = association.target;
		let as = association.as;
		if (!as)
			as = target;
		if (association.type === "hasMany" || association.type === "belongsToMany")
			this.attachManyToManyMethods(proto, source, target, as, doc, dynamic);
		else
			this.attachOneToManyMethods(proto, source, target, as, doc, dynamic);
	}

	attachReverseAssociationMethods (proto, association, doc, dynamic) {
		logger.info("Attaching reverse association methods for " + JSON.stringify(association), "attachReverseAssociationMethods");
		let res;
		let fn;
		let entity = association.target;
		let target = association.source;
		let as = association.as;
		if (!as)
			as = entity;
		let tokens = {
			__MODEL__: entity,
			__MODELCC__: string.changeCase.snakeToCamel(entity, true),
			__TARGET__: target,
			__TARGETCC__: string.changeCase.snakeToCamel(target, true),
			__ALIAS__: as,
			__ALIASCC__: string.changeCase.snakeToCamel(as, true)
		};

		// add association
		fn = this.getFunctionName("add", as, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "add";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
			doc.push(fn, res, "add", entity, target);
		}

		// remove association
		fn = this.getFunctionName("remove", as, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "remove";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
			doc.push(fn, res, "remove", entity, target);
		}

		// set all associations
		fn = this.getFunctionName("setMany", as, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "set";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
			doc.push(fn, res, "setMany", entity, target, as);
		}

		// get all associations
		fn = this.getFunctionName("getMany", as, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "get";
			res = this.processFunctionTemplate(TEMPLATES.associationGetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
			doc.push(fn, res, "getMany", entity, target);
		}

		// check that target is associated
		fn = this.getFunctionName("has", as, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "has";
			res = this.processFunctionTemplate(TEMPLATES.associationSetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
			doc.push(fn, res, "has", entity, target);
		}

		// count associated target entities
		fn = this.getFunctionName("count", as, target);
		tokens.__FN__ = fn;
		if (typeof(proto[fn]) === "function")
			logger.detail("  already attached to prototype: " + fn, "attachReverseAssociationMethods");
		else {
			tokens.__OP__ = "count";
			res = this.processFunctionTemplate(TEMPLATES.associationGetReversed, tokens);
			logger.detail("  attaching " + fn + "(" + res.args.join(", ") + ")", "attachReverseAssociationMethods");
			proto[fn] = this.generateFunctionObject(res.args, res.body, dynamic);
			doc.push(fn, res, "count", entity, target);
		}
	}

	/*
	 * proto could be a prototype object or just any object if we want to generate code instead
	 */
	attachMethods (proto, doc, dynamic) {
		// model CRUD methods
		for (let i in this.models)
			this.attachEntityMethods(proto, i, doc, dynamic);
		// association methods (direct)
		for (let i in this.associations)
			for (let j in this.associations[i])
				for (let k in this.associations[i][j])
					this.attachAssociationMethods(proto, this.associations[i][j][k], doc, dynamic);
		// association methods (reverse)
		for (let i in this.associations)
			for (let j in this.associations[i])
				for (let k in this.associations[i][j])
					this.attachReverseAssociationMethods(proto, this.associations[i][j][k], doc, dynamic);
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

		this.attachMethods(ret.prototype, doc, true);

		return ret;
	}

	pushEmptyLine (code, count) {
		if (count === undefined)
			count = 1;
		for (let i=0; i<count; i++)
			code.push("");
	}

	pushCommentBlock (code, block, indent) {
		if (indent === undefined)
			indent = 0;
		let tabs = "";
		for (let i=0; i<indent; i++)
			tabs += "\t";

		code.push(tabs + "/*");
		for (let i=0; i<block.length; i++)
			code.push(tabs + " * " + block[i]);
		code.push(tabs + " */");
	}

	pushCodeBlock (code, block, indent) {
		if (indent === undefined)
			indent = 0;
		let tabs = "";
		for (let i=0; i<indent; i++)
			tabs += "\t";

		for (let i=0; i<block.length; i++)
			code.push(tabs + block[i]);
	}

	generateSessionClassCode (doc, paths) {
		logger.info("Generating session class code, className = " + this.className);
		if (!doc)
			doc = { push: () => {} };
		if (!paths)
			paths = { src: "./" };
		if (!paths.src)
			paths.src = "./";

		let ret = [];

		this.pushCommentBlock(ret, [
			"Generated DBSession Class " + this.className,
			"",
			"This file has been generated by the DBGenerator class, it is not recommended to",
			"edit this file directly but to extend from it to add more features, so it can",
			"be generated again if needed without overwriting the edits"
		]);
		this.pushEmptyLine(ret);

		if (paths.asModule) {
			this.pushCodeBlock(ret, [
				'const DBSession = require("db-one").DBSession;',
				'',
				'const DBError = require("db-one").DBError;',
				'',
				'const logger = require("db-one").getInstance().moduleBinding("' + this.className + '", "db-one");'
			]);
		}
		else {
			this.pushCodeBlock(ret, [
				'const DBSession = require("' + paths.src + 'dbsession.js");',
				'',
				'const DBError = require("' + paths.src + 'dberror.js");',
				'',
				'const logger = require("' + paths.src + 'logger.js").getInstance().moduleBinding("' + this.className + '", "db-one");'
			]);
		}
		this.pushEmptyLine(ret);

		this.pushCommentBlock(ret, [ this.className + " class declaration" ]);
		this.pushCodeBlock(ret, [ "class " + this.className + " extends DBSession {" ]);

		let methods = {};
		this.attachMethods(methods, doc, false);
		let briefs = {};
		if (doc.getBlockBriefs)
			briefs = doc.getBlockBriefs();

		for (let i in methods) {
			this.pushEmptyLine(ret);
			if (briefs[i] !== undefined) {
				this.pushCommentBlock(ret, briefs[i], 1);
				this.pushEmptyLine(ret);
			}
			this.pushCodeBlock(ret, [ i + " (" + methods[i].args.join(", ") + ") {" ], 1);
			ret = ret.concat(methods[i].body);
			this.pushCodeBlock(ret, [ "}" ], 1);
			this.pushEmptyLine(ret);
		}

		this.pushCodeBlock(ret, [ "}" ]);

		this.pushCodeBlock(ret, [ "", "module.exports = " + this.className + ";" ]);

		ret = ret.join("\n");
		return ret;
	}

}

module.exports = DBGenerator;
