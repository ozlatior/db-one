/*
 * Database Session Documentation Generator Base Class
 */

const DEFAULT_MAX_LINE_LENGTH = 110;

const inflection = require("inflection");

const string = require("util-one").string;

const TEMPLATES = {

	splitToLength: function (rows, len, indent) {
		if (indent === undefined)
			indent = 0;
		indent = string.fill(indent, " ");
		if (typeof(rows) === "string")
			rows = [ rows ];
		else
			rows = rows.slice(0);
		while (rows[rows.length-1].length > len) {
			let i = len - 1;
			while (i > indent.length && rows[rows.length-1][i] !== ' ')
				i--;
			if (i <= indent.length)
				i = len - 1;
			let next = rows[rows.length-1].slice(i+1);
			rows[rows.length-1] = rows[rows.length-1].slice(0, i);
			rows.push(indent + next);
		}
		return rows;
	},

	description: function (block) {
		let apply = (arr) => {
			if (typeof(arr) === "string")
				arr = [ arr ];
			return arr.map((item) => { return item
				.replace(/__ENTITY__/g, block.entity)
				.replace(/__ENTITIES__/g, block.entity ? inflection.pluralize(block.entity) : "")
				.replace(/__TARGET__/g, block.target)
				.replace(/__TARGETS__/g, block.target ? inflection.pluralize(block.target) : "")
				.replace(/__FIELD__/g, block.field);
			});
		};
		switch (block.op) {
			case "create":
				return apply("Creates a new __ENTITY__ entry in the database with the specified values");
			case "retrieve":
				return apply("Retrieves the __ENTITY__ entry from the database with the specified id");
			case "update":
				return apply("Updates the __ENTITY__ with the specified id with the new specified values");
			case "delete":
				return apply("Deletes the __ENTITY__ with the specified id");
			case "list":
				return apply("List all __ENTITIES__ that validate specified filter");
			case "set":
				return apply([
					"Associate a new __TARGET__ id with this __ENTITY__",
					"This replaces the previously associated __TARGET__, if any"
				]);
			case "get":
				return apply("Get the currently associated __TARGET__ for this __ENTITY__ id, if any");
			case "unset":
				return apply("Remove currently associated __TARGET__ for this __ENTITY__ id, if any");
			case "add":
				return apply("Add one or more __TARGET__ associations for this __ENTITY__ by id");
			case "remove":
				return apply("Remove one or more __TARGET__ associations from this __ENTITY__ by id");
			case "is":
				return apply("Check that __TARGET__ is associated with this __ENTITY__");
			case "isSet":
				return apply("Check that any __TARGETS__ are associated with this __ENTITY__");
			case "has":
				return apply("Check that specific __TARGETS__, identified by id, are associated with this __ENTITY__");
			case "setMany":
				return apply([
					"Set all __TARGETS__ associated with this __ENTITY__, identified by id",
					"This removes any previously associated __TARGETS__, if any"
				]);
			case "getMany":
				return apply("Get an array of all associated __TARGETS__ for this __ENTITY__ id");
			case "unsetMany":
				return apply("Remove any associated __TARGETS__ for this __ENTITY__ id");
			case "count":
				return apply("Count how many __TARGETS__ are associated with this __ENTITY__");
		}
		return [];
	},

	args: function (block) {
		if (!block.args || !block.args.length)
			return [ "", "This method takes no arguments" ];
		let ret = [ "", "Arguments" ];
		for (let i=0; i<block.args.length; i++)
			ret.push("- `" + block.args[i] + "`");
		return ret;
	},

	objects: function (block) {
		if (!block.objects)
			return [];
		let ret = [];

		if (block.objects.options && block.objects.options.associationFlags) {
			ret.push("- Flags for inclusion of associated objects:");
			let flags = block.objects.options.associationFlags;
			let entryText;
			if (block.op === "retrieve")
				entryText = "the returned " + block.entity + " entry";
			if (block.op === "list")
				entryText = "the returned " + block.entity + " entries";
			for (let i in flags) {
				let text = [ entryText ];
				for (let j=0; j<flags[i].length; j++) {
					let fragment = flags[i][j].target;
					if (flags[i][j].reversed || flags[i][j].type === "hasMany" || flags[i][j].type === "belongsToMany")
						fragment = "each " + fragment;
					else
						fragment = "the " + fragment;
					if (j === flags[i].length - 1) {
						if (flags[i][j].reversed || flags[i][j].type === "hasMany" || flags[i][j].type === "belongsToMany")
							fragment = "include all " + inflection.pluralize(flags[i][j].target) + " associated with";
						else
							fragment = "include the " + flags[i][j].target + " associated with";
					}
					else if (j === 0)
						fragment += " for";
					else
						fragment += " of";
					text.unshift(fragment);
				}
				text = "  - `" + i + "`: " + text.join(" ");
				text = TEMPLATES.splitToLength(text, this.settings.maxLineLength, 4);
				ret = ret.concat(text);
			}
		}

		if (ret.length > 0) {
			ret.unshift("The options argument supports the following values and flags");
			ret.unshift("");
		}

		return ret;
	},

	returnValue: function (block) {
		return [
			"",
			"Returns a Promise object. On resolve(), the result is returned as callback argument"
		];
	},

	exceptions: function (block) {
		return [];
	}

};

class DocGenerator {

	constructor () {
		this.blocks = [];
		this.lastBlock = null;
		this.settings = {
			maxLineLength: DEFAULT_MAX_LINE_LENGTH
		};
	}

	push (fn, fun, op, entity, target, field) {
		let toPush = {
			name: fn,
			args: fun.args,
			body: fun.body,
			//types: fun.types,  // TODO: generate this
			objects: fun.objects,
			op: op,
			entity: entity,
			target: target,
			field: field
		};
		this.lastBlock = toPush;
		this.blocks.push(toPush);
	}

	getLastBlock () {
		return this.lastBlock;
	}

	generateBlockBrief (block) {
		let ret = [];
		ret = ret.concat(TEMPLATES.description.call(this, block));
		ret = ret.concat(TEMPLATES.args.call(this, block)); // TODO: use generated typelist instead
		ret = ret.concat(TEMPLATES.objects.call(this, block));
		ret = ret.concat(TEMPLATES.returnValue.call(this, block));
		ret = ret.concat(TEMPLATES.exceptions.call(this, block));
		return ret;
	}

	getLastBlockBrief (block) {
		return this.generateBlockBrief(this.lastBlock);
	}

	getBlockBriefs () {
		let ret = {};
		for (let i=0; i<this.blocks.length; i++) {
			ret[this.blocks[i].name] = this.generateBlockBrief(this.blocks[i]);
		}
		return ret;
	}

	groupByEntity () {
		let ret = {};
		for (let i=0; i<this.blocks.length; i++) {
			if (ret[this.blocks[i].entity] === undefined)
				ret[this.blocks[i].entity] = [];
			ret[this.blocks[i].entity].push(this.blocks[i]);
		}
		for (let i in ret)
			ret[i] = this.orderByName(ret[i]);
		return ret;
	}

	groupByEntityAndTarget () {
		let ret = {};
		for (let i=0; i<this.blocks.length; i++) {
			if (ret[this.blocks[i].entity] === undefined)
				ret[this.blocks[i].entity] = {};
			let pushTo;
			if (this.blocks[i].target) {
				if (ret[this.blocks[i].entity][this.blocks[i].target] === undefined)
					ret[this.blocks[i].entity][this.blocks[i].target] = [];
				pushTo = ret[this.blocks[i].entity][this.blocks[i].target];
			}
			else {
				if (ret[this.blocks[i].entity].__none__ === undefined)
					ret[this.blocks[i].entity].__none__ = [];
				pushTo = ret[this.blocks[i].entity].__none__;
			}
			pushTo.push(this.blocks[i]);
		}
		for (let i in ret)
			for (let j in ret[i])
				ret[i][j] = this.orderByName(ret[i][j]);
		return ret;
	}

	groupByOperation () {
		let ret = {};
		for (let i=0; i<this.blocks.length; i++) {
			if (ret[this.blocks[i].op] === undefined)
				ret[this.blocks[i].op] = [];
			ret[this.blocks[i].op].push(this.blocks[i]);
		}
		for (let i in ret)
			ret[i] = this.orderByName(ret[i]);
		return ret;
	}

	orderByName (blocks) {
		if (blocks === undefined)
			blocks = this.blocks;
		let ret = blocks.slice(0);
		ret.sort((a, b) => {
			if (a.name > b.name)
				return 1; 
			if (a.name < b.name)
				return -1;
			return 0;
		});
		return ret;
	}

	getFunctionHeader (block, includeArgList) {
		let ret = block.name;
		if (includeArgList)
			ret += " (" + block.args.join(", ") + ")";
		return ret;
	}

	listEntities (indent) {
		if (indent === undefined)
			indent = [ 0 ];
		if (typeof(indent) === "number")
			indent = [ indent ];
		let ret = [];
		let list = this.groupByEntity();
		for (let i in list)
			ret.push(string.indentLeft(i, indent[0]));
		return ret;
	}

	listEntitiesAndTargets (indent) {
		if (indent === undefined)
			indent = [ 0, 2 ];
		if (typeof(indent) === "number")
			indent = [ indent, indent ];
		let ret = [];
		let list = this.groupByEntityAndTarget();
		for (let i in list) {
			ret.push(string.indentLeft(i, indent[0]));
			for (let j in list[i]) {
				if (j === "__none__")
					ret.push(string.indentLeft("no target", indent[0] + indent[1]));
				else
					ret.push(string.indentLeft(j, indent[0] + indent[1]));
			}
		}
		return ret;
	}

	listOperations (intent) {
		if (indent === undefined)
			indent = [ 0 ];
		if (typeof(indent) === "number")
			indent = [ indent ];
		let ret = [];
		let list = this.groupByOperation();
		for (let i in list)
			ret.push(string.indentLeft(i, indent[0]));
		return ret;
	}

	listByEntity (indent, includeArgList) {
		if (indent === undefined)
			indent = [ 0, 2 ];
		if (typeof(indent) === "number")
			indent = [ indent, indent ];
		let ret = [];
		let list = this.groupByEntity();
		for (let i in list) {
			ret.push(string.indentLeft(i, indent[0]));
			for (let j=0; j<list[i].length; j++)
				ret.push(string.indentLeft(this.getFunctionHeader(list[i][j], includeArgList), indent[0] + indent[1]));
		}
		return ret;
	}

	listByEntityAndTarget (indent, includeArgList) {
		if (indent === undefined)
			indent = [ 0, 2 ];
		if (typeof(indent) === "number")
			indent = [ indent, indent ];
		let ret = [];
		let list = this.groupByEntityAndTarget();
		for (let i in list) {
			ret.push(string.indentLeft(i, indent[0]));
			for (let j in list[i]) {
				if (j === "__none__")
					ret.push(string.indentLeft("no target", indent[0] + indent[1]));
				else
					ret.push(string.indentLeft(j, indent[0] + indent[1]));
				for (let k=0; k<list[i][j].length; k++)
					ret.push(string.indentLeft(this.getFunctionHeader(list[i][j][k], includeArgList), indent[0] + 2*indent[1]));
			}
		}
		return ret;
	}

	listByOperation (indent, includeArgList) {
		if (indent === undefined)
			indent = [ 0, 2 ];
		if (typeof(indent) === "number")
			indent = [ indent, indent ];
		let ret = [];
		let list = this.groupByOperation();
		for (let i in list) {
			ret.push(string.indentLeft(i, indent[0]));
			for (let j=0; j<list[i].length; j++)
				ret.push(string.indentLeft(this.getFunctionHeader(list[i][j], includeArgList), indent[0] + indent[1]));
		}
		return ret;
	}

}

module.exports = DocGenerator;
