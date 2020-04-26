/*
 * Database Session Documentation Generator Base Class
 */

const inflection = require("inflection");

const string = require("util-one").string;

class DocGenerator {

	constructor () {
		this.blocks = [];
	}

	push (fn, fun, op, entity, target, field) {
		let toPush = {
			name: fn,
			args: fun.args,
			body: fun.body,
			//types: fun.types,  // TODO: generate this
			op: op,
			entity: entity,
			target: target,
			field: field
		};
		this.blocks.push(toPush);
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
