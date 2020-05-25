// main exports file

// main components
const DBConnector =			require("./src/dbconnector.js");
const DBCore =				require("./src/dbcore.js");
const DBGenerator =			require("./src/dbgenerator.js");
const DBSession =			require("./src/dbsession.js");
const DBSessionFactory =	require("./src/dbsessionfactory.js");

const DataLoader =			require("./src/dataloader.js");
const ModelLoader =			require("./src/modelloader.js");

const DocGenerator =		require("./src/docgenerator.js");

const Hooks =				require("./src/hooks.js");

const Logger =				require("./src/logger.js");

const DBInit =				require("./src/dbinit.js");

// access classes
const AccessManager =			require("./src/access/accessmanager.js");
const AccessManagerSession =	require("./src/access/session.js");
const AccessManagerGenerator =	require("./src/access/generator.js");

// default data
const accessModels =		require("./models/access/models.js");

//
/*export {
	DBConnector,
	DBCore,
	DBGenerator,
	DBSession,
	DBSessionFactory,
	DataLoader,
	ModelLoader,
	DocGenerator,
	Hooks,
	Logger,
	DBError,
	DBGeneratorError
};*/

const defaults = {

	getAccessModels: function () {
		return accessModels;
	}

}

module.exports = {
	AccessManager:			AccessManager,
	AccessManagerSession:	AccessManagerSession,
	AccessManagerGenerator:	AccessManagerGenerator,
	DBConnector:			DBConnector,
	DBCore:					DBCore,
	DBGenerator:			DBGenerator,
	DBSession:				DBSession,
	DBSessionFactory:		DBSessionFactory,
	DataLoader:				DataLoader,
	ModelLoader:			ModelLoader,
	DocGenerator:			DocGenerator,
	Hooks:					Hooks,
	Logger:					Logger,
	DBInit:					DBInit,
	defaults:				defaults
};
