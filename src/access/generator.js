/*
 * Generator for Access Manager Session Class
 */

const path = require("path");
const fs = require("fs");

const Sequelize = require("sequelize");

const ModelLoader = require("./../modelloader.js");
const DBGenerator = require("./../dbgenerator.js");
const DocGenerator = require("./../docgenerator.js");

const models = require("./../../models/access/models.js");

const logger = require("./../logger.js").getInstance().moduleBinding("AccessGenerator", "db-one");

function getGeneratorInstance() {
	logger.info("Creating Generator instance", "getGeneratorInstance");
	let dbGenerator = new DBGenerator(null, "AccessManagerGeneratedSession");
	dbGenerator.loadModels(models);
	return dbGenerator;
}

function getDocGeneratorInstance() {
	logger.info("Creating Documentation Generator instance", "getDocGeneratorInstance");
	return new DocGenerator();
}

// TODO: documentation generation

let generator = getGeneratorInstance();
let doc = getDocGeneratorInstance();

function generateClass() {
	logger.info("Generating Access Manager Session class", "generateClass");
	return generator.generateSessionClass(doc);
}

function generateCode(paths) {
	logger.info("Generating Access Manager Session class code", "generateCode");
	return generator.generateSessionClassCode(doc, paths);
}

if (!module.parent) {
	logger.module("Running Access Manager Session Class Generator as stand-alone script");
	logger.info("  Usage: /path/to/generator.js [<output_js_file>] [<output_doc_file>]");
	let args = process.argv.slice(2);
	let outputPath = path.join(__dirname, "generatedsession.js");
	if (args[0])
		outputPath = path.join(process.cwd(), args[0]);
	let code = generateCode({ src: "../" });
	fs.writeFileSync(outputPath, code);
	logger.module("Class code written to file " + outputPath);
}
else {
	logger.module("Running Access Manager Session Class Generator as included script");
	module.exports.generateClass = generateClass;
	module.exports.generateCode = generateCode;
}
