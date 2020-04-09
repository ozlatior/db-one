/*
 * Data Loader Class
 */

const array = require("util-one").array;

const logger = require("./logger.js").getInstance().moduleBinding("DataLoader", "db-one");

class DataLoader {

	constructor (dbConnector) {
		logger.info("Creating DataLoader Object");
		this.dbConnector = dbConnector;
		this.batch = [];
	}

	buildMetaBlock (model, data) {
		logger.info("Building " + model + " metablock", "buildMetaBlock");
		logger.detail("  data = " + JSON.stringify(data), "buildMetaBlock");
		let fields = this.dbConnector.getModelFieldNames(model);
		// add the __refOnly field
		fields.push("__refOnly");
		let assocs = this.dbConnector.getModelAssociationNames(model);
		let dataBlock = {};
		let associations = {};
		let deps = [];
		for (let i in data) {
			if (fields.indexOf(i) !== -1)
				dataBlock[i] = data[i];
			if (assocs[i] !== undefined) {
				associations[assocs[i]] = data[i];
				deps.push(assocs[i]);
			}
		}
		let ret = {
			model: model,
			data: dataBlock,
			associations: associations,
			dependencies: deps
		};
		return ret;
	}

	buildDependencySets (metablocks) {
		let sets = [];
		for (let i=0; i<metablocks.length; i++) {
			let found = null;
			for (let j=0; j<sets.length; j++) {
				if (sets[j].model === metablocks[i].model &&
					array.deepEqual(sets[j].dependencies, metablocks[i].dependencies)) {
					found = sets[j];
					break;
				}
			}
			// __refOnly means this block should not be inserted into the DB, it's here just
			// to satisfy dependencies
			if (found) {
				if (!(metablocks[i].data.__refOnly))
					found.blocks.push(metablocks[i]);
				continue;
			}
			let blocks = [];
			if (!(metablocks[i].data.__refOnly))
				blocks.push(metablocks[i]);
			sets.push({
				model: metablocks[i].model,
				dependencies: metablocks[i].dependencies,
				blocks: blocks
			});
		}
		// for each set place it in the dependency list as soon as possible but only if
		// all dependencies are satisified; go trough the list as many times as necessary
		// until all elements have been placed
		let ret = [];
		let i = 0;
		// use this to check for endless loops - could happen if dependencies cannot be met
		let oldLen = sets.length;
		while (sets.length > 0) {
			// reset counter when end is reached
			if (i === sets.length) {
				let m = [];
				ret.map((a) => m.push(a.model));
				i = 0;
				if (sets.length === oldLen) {
					logger.warn("Could not meet dependencies for loaded objects - possible circular condition",
						"buildDependencySets");
					// return the sets anyway and insert whatever we can
					return ret.concat(sets);
				}
				oldLen = sets.length;
			}
			let j = 0;
			let deps = sets[i].dependencies.slice(0);
			for (j=0; j<ret.length; j++) {
				let index = deps.indexOf(ret[j].model);
				if (index === -1)
					continue;
				deps.splice(index, 1);
				if (deps.length === 0)
					break;
			}
			i++;
			// we have unsatisified dependencies, leave for later
			if (deps.length > 0)
				continue;
			// or put it in the returned array and remove it from sets
			ret.splice(j+1, 0, sets[i-1]);
			sets.splice(i-1, 1);
			i--;
		}
		return ret;
	}

	loadData (model, data) {
		logger.info("Loading data for " + model + " n=" + data.length, "loadData");
		for (let i=0; i<data.length; i++)
			this.batch.push(this.buildMetaBlock(model, data[i]));
	}

	async getAssociatedIds(associations, cache) {
		logger.info("Obtaining associated IDs", "getAssociatedIds");
		let ret = [];
		associations = JSON.parse(JSON.stringify(associations));
		for (let i in associations) {
			logger.detail("Model " + i + ", associations = " + JSON.stringify(associations[i]), "getAssociatedIds");
			if (cache[i] === undefined)
				cache[i] = {
					complete: false,
					entries: []
				};
			if (associations[i] === "*") { // associate to all entries
				if (cache[i].complete !== true) {
					// we don't have them all so we clear the cache and read them first
					cache[i].entries = await this.dbConnector.listEntries(i).catch((e) => { throw e; });
					cache[i].complete = true;
				}
				cache[i].entries.map((entry) => ret.push({ model: i, id: entry.id }));
			}
			else {
				if (!(associations[i] instanceof Array))
					associations[i] = [ associations[i] ];
				for (let j=0; j<associations[i].length; j++) {
					let entries = array.search(cache[i].entries, associations[i][j]);
					if (entries.length === 0) {
						entries = await this.dbConnector.listEntries(i, associations[i][j]).catch((e) => { throw e; });
						cache[i].entries = cache[i].entries.concat(entries);
					}
					if (entries.length === 0) {
						logger.warn("No association found for " + i + ", " + associations[i][j], "getAssociatedIds");
						continue;
					}
					if (entries.length > 1) {
						logger.warn("Multiple associations (" + entries.length + ") found for " + i + ", " +
							associations[i][j], "getAssociatedIds");
					}
					entries.map((entry) => ret.push({ model: i, id: entry.id }));
				}
			}
		}
		return ret;
	}

	async insertLoadedData () {
		logger.info("Inserting data n=" + this.batch.length, "insertLoadedData");
		// use this object to cache associations (so we don't query them every time)
		let cache = {};
		let sets = this.buildDependencySets(this.batch);
		this.batch = [];
		for (let i=0; i<sets.length; i++) {
			let model = sets[i].model;
			let hasAssociations = false;
			sets[i].blocks.map((block) => {
				if (Object.getOwnPropertyNames(block.associations).length > 0)
					hasAssociations = true;
			});
			if (hasAssociations) {
				for (let j=0; j<sets[i].blocks.length; j++) {
					let entry = await this.dbConnector
						.createEntry(model, sets[i].blocks[j].data)
						.catch((e) => { throw e; });
					// for each association check that it's not in the cache and query it if it's not
					let assocs = await this
						.getAssociatedIds(sets[i].blocks[j].associations, cache)
						.catch((e) => { throw e; });
					for (let k=0; k<assocs.length; k++) {
						await this.dbConnector
							.associateEntry(model, entry.id, assocs[k].model, assocs[k].id)
							.catch((e) => { throw e; });
					}
				}
			}
			else {
				// we don't have associations so we can do bulk create
				let data = [];
				sets[i].blocks.map((block) => data.push(block.data));
				await this.dbConnector.bulkCreateEntry(model, data).catch((e) => { throw e; });
			}
		}
	}

}

module.exports = DataLoader;
