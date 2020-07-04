// main exports file

// environment and contexts
const DBEnv =				require("./src/dbenv.js");
const DBContext =			require("./src/dbcontext.js");
const DBInitContext =		require("./src/dbinitcontext.js");
const DBLiveContext =		require("./src/dblivecontext.js");
const DBGeneratorContext =	require("./src/dbgeneratorcontext");

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

// access classes
const AccessManager =			require("./src/access/accessmanager.js");
const AccessManagerSession =	require("./src/access/session.js");
const AccessManagerGenerator =	require("./src/access/generator.js");

// default data
const accessModels =		require("./models/access/models.js");
const accessData =			require("./data/access/data.js");
const userModels =			require("./models/models.js");
const userData =			require("./models/data.js");

// default configs
const defaultConfig =		require("./defaultconfig.js");
const userConfig =			require("./userconfig.js");

const defaults = {

	getAccessModels: function () {
		return accessModels;
	},

	getAccessData: function () {
		return accessData;
	},

	getUserModesl: function () {
		return userModels;
	},

	getUserData: function () {
		return userData;
	},

	getDefaultConfig: function () {
		return defaultConfig;
	},

	getUserConfig: function () {
		return userConfig;
	}

}

module.exports = {
	AccessManager:			AccessManager,
	AccessManagerSession:	AccessManagerSession,
	AccessManagerGenerator:	AccessManagerGenerator,
	DBEnv:					DBEnv,
	DBContext:				DBContext,
	DBInitContext:			DBInitContext,
	DBLiveContext:			DBLiveContext,
	DBGeneratorContext:		DBGeneratorContext,
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
	defaults:				defaults
};
