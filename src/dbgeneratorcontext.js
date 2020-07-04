/*
 * Generator Context Class - Context with DB Generation Features
 */

const DBContext = require("./dbcontext.js");

const DBGenerator = require("./dbgenerator.js");
const DocGenerator = require("./docgenerator.js");

const Logger = require("./logger.js");
const logger = Logger.getInstance().moduleBinding("DBGeneratorContext", "db-one");

// TODO: maybe the generator should be able to run completely independently of having a valid core
// object and database connection, so we should either inherit from another class (make a "dead"
// context class everything inherits from) or we should not call some things if we don't have an
// environment... or use try catch to swallow the exceptions, but this can be confusing to the user

class DBGeneratorContext extends DBContext {

	// DBEnv		env
	// DBConnector	connector
	// DataLoader	dataLoader

	constructor (env, config) {
		logger.info("Initializing object", "constructor");
		super (env, config);

		// Specific objects
		this.generator = null;
		this.docGenerator = null;

		// Set a default class name
		if (!this.className)
			this.className = "DBGeneratedSession";
	}

	applyConfig (config) {
		if (config && config.generator && config.generator.className)
			this.setClassName(config.generator.className);
		if (config && config.generator && config.generator.codePaths)
			this.setCodePaths(config.generator.codePaths);
	}

	initGenerators () {
		logger.info("Initializing generators", "initGenerators");
		logger.detail("Generated class name: " + this.className, "initGenerators");
		this.generator = new DBGenerator(null, this.className);
		this.docGenerator = new DocGenerator();
	}

	setClassName (name) {
		this.className = name;
	}

	setCodePaths (paths) {
		this.codePaths = paths;
	}

	setup () {
		super.setup();
		this.initGenerators();
	}

	loadModels (models) {
		logger.info("Loading models", "loadModels");
		super.loadModels(models);
		this.generator.loadModels(models);
	}

	generateClass () {
		logger.info("Generating Session class", "generateClass");
		return this.generator.generateSessionClass(this.docGenerator);
	}

	generateCode () {
		logger.info("Generating Session class code", "generateCode");
		return this.generator.generateSessionClassCode(this.docGenerator, this.codePaths);
	}

	getDocGenerator () {
		return this.docGenerator;
	}

}

module.exports = DBGeneratorContext;
