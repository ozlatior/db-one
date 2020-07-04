module.exports = {
	// default objects - use and initialize automatically the objects of the default classes
	// for things such as DBConnector, DataLoader, etc
	// if set to false, custom classes have to be set manually (not implemented)
	// calling the constructor with a bit map overrides this setting
	defaultObjects: true,

	// load default models for access tables; if this is set to false, models have to be loaded
	// manually or specified in the context configuration
	// calling the constructor with a bit map overrides this setting
	defaultAccessModels: true,

	// load default data for access tables; if this is set to false, data entries have to be loaded
	// manually or specified in the context configuration
	// calling the constructor with a bit map overrides this setting
	defaultAccessData: true,

	// load default models for user tables; if this is set to false, models have to be loaded
	// manually or specified in the context configuration
	// calling the constructor with a bit map overrides this setting
	defaultUserModels: true,

	// load default data for user tables; if this is set to false, data entries have to be loaded
	// manually or specified in the context configuration
	// calling the constructor with a bit map overrides this setting
	defaultUserData: true,

	// whenever the library needs to store code somewhere and execute it later, it will be stored
	// in a file at this path
	codePath: "./generated",

	// configuration settings for each context; _user and _access are default contexts and named
	// with a leading underscore to signify this; any other contexts can be defined by name
	// options for each context
	// - models: path to models - these will be loaded on top of the default models, if defaults are enabled
	// - data: path to data - this will be loaded on top of the default data, if defaults are enabled
	// - generator.mode: one of the options
	//   - "runtime": use the generator at runtime and create a session class for the factory dynamically
	//   - "startup": generate code at start-up; this code doesn't have to be used directly, the generated
	//     class can be inherited by another class that will be used by the factory (in the factory settings)
	//   - "static": use a static file that will have to be explicitly generated (not automatically at startup)
	// - generator.className: the class name in the generated file or runtime class name
	// - generator.codePaths: an object containing require path properties:
	//   - src: the path to the src dir for the db-one files
	//   - asModule: if set to true, require it as module "db-one"
	// - generator.path: for "startup" and "static" modes, the path where the class is saved
	// - factory.mode: one of the options
	//   - "runtime": use the runtime class generated by the generator or specified by the user
	//   - "code": use a method to feed the generated code into the factory at runtime
	//   - "static": use a static file that has been generated at runtime or written beforehand
	// - factory.className: class name used by the factory
	// - factory.path: path to class to use (can be the generated path, a user file or an inherited class)

	contexts: {

		_system: {
			models: null,
			data: null,
			generator: {
				mode: "runtime",
				className: "GeneratedSystemSession"
			},
			factory: {
				mode: "runtime",
				className: "GeneratedSystemSession"
			}
		},

		_access: {
			models: null,
			data: null,
			generator: {
//				mode: "runtime",
				mode: "startup",
				className: "GeneratedAccessSession",
				codePaths: { src: "../src/" }
//				codePaths: { asModule: true }
			},
			factory: {
				mode: "static",
				className: "GeneratedAccessSession",
				path: "./generated/GeneratedAccessSession.js"
			}
		},

		_user: {
			models: null,
			data: null,
			generator: {
//				mode: "runtime",
				mode: "startup",
				className: "GeneratedUserSession",
				codePaths: { src: "../src/" }
//				codePaths: { asModule: true }
			},
			factory: {
				mode: "static",
				className: "GeneratedUserSession",
				path: "./generated/GeneratedUserSession.js"
			}
		}

	}
}