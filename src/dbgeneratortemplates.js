const TEMPLATES = {

	// TODO: options

	create: function (__MODELCC__Data) {
		logger.sess("Creating __MODEL__ with values " + JSON.stringify(__MODELCC__Data), "__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": [ __MODELCC__Data ]
				};
				let arg = {
					source: this,
					op: "create",
					model: "__MODEL__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.createEntry("__MODEL__", __MODELCC__Data).then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": [ result ]
					};
					let arg = {
						source: this,
						op: "create",
						model: "__MODEL__",
						entries: entries
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	createByArgs: function (__MODELARGS__) {
		let data;
		if (typeof(__MODELFA__) === "object")
			data = __MODELFA__;
		else
			data = __MODELDO__;
		logger.sess("Creating __MODEL__ with values " + JSON.stringify(data), "__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": [ data ]
				};
				let arg = {
					source: this,
					op: "create",
					model: "__MODEL__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.createEntry("__MODEL__", data).then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": [ result ]
					};
					let arg = {
						source: this,
						op: "create",
						model: "__MODEL__",
						entries: entries
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	retrieve: function (__MODELCC__Id, options) {
		logger.sess("Retrieving __MODEL__ with id " + __MODELCC__Id, "__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": [ __MODELCC__Id ]
				};
				let arg = {
					source: this,
					op: "retrieve",
					model: "__MODEL__",
					entries: entries,
					options: options
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.listEntries("__MODEL__", { id: __MODELCC__Id }).then(async (result) => {
				if (result.length === 0)
					throw new DBError("No __MODEL__ with id " + __MODELCC__Id + " found");
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": result
					};
					let arg = {
						source: this,
						op: "retrieve",
						model: "__MODEL__",
						entries: entries,
						options: options
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result[0]);
			}).catch(reject);

		});
	},

	update: function (__MODELCC__Id, __MODELCC__Data) {
		logger.sess("Updating __MODEL__ with id " + __MODELCC__Id + ", new values " + JSON.stringify(__MODELCC__Data),
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": {}
				};
				entries["__MODEL__"][__MODELCC__Id] = __MODELCC__Data;
				let arg = {
					source: this,
					op: "update",
					model: "__MODEL__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.updateEntry("__MODEL__", __MODELCC__Id, __MODELCC__Data).then(async (result) => {
				if (result.length === 0)
					throw new DBError("No __MODEL__ with id " + __MODELCC__Id + " found");
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": {}
					};
					entries["__MODEL__"][__MODELCC__Id] = result ? __MODELCC__Data : false;
					let arg = {
						source: this,
						op: "update",
						model: "__MODEL__",
						entries: entries
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	updateByArgs: function (__MODELCC__Id, __MODELARGS__) {
		let data;
		if (typeof(__MODELFA__) === "object")
			data = __MODELFA__;
		else
			data = __MODELDO__;
		logger.sess("XXX Updating __MODEL__ with id " + __MODELCC__Id + ", new values " + JSON.stringify(data),
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": {}
				};
				entries["__MODEL__"][__MODELCC__Id] = data;
				let arg = {
					source: this,
					op: "update",
					model: "__MODEL__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.updateEntry("__MODEL__", __MODELCC__Id, data).then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": {}
					};
					entries["__MODEL__"][__MODELCC__Id] = result ? data : false;
					let arg = {
						source: this,
						op: "update",
						model: "__MODEL__",
						entries: entries
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	delete: function (__MODELCC__Id) {
		logger.sess("Deleting __MODEL__ with id " + __MODELCC__Id, "__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": [ __MODELCC__Id ]
				};
				let arg = {
					source: this,
					op: "delete",
					model: "__MODEL__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.deleteEntry("__MODEL__", __MODELCC__Id).then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": result ? [ __MODELCC__Id ] : false
					};
					let arg = {
						source: this,
						op: "delete",
						model: "__MODEL__",
						entries: entries
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	// TODO: filters
	list: function (filter, options) {
		if (filter)
			logger.sess("Listing all __MODEL__ entries with " + JSON.stringify(filter), "__FN__", null, this.sessionId);
		else
			logger.sess("Listing all __MODEL__ entries", "__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let arg = {
					source: this,
					op: "list",
					model: "__MODEL__",
					filter: filter,
					options: options
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.listEntries("__MODEL__", {}).then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__" : result
					};
					let arg = {
						source: this,
						op: "list",
						model: "__MODEL__",
						entries: entries,
						options: options
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	associationSet: function (__MODELCC__Id, __TARGETCC__Id) {
		logger.sess("Association __OP__ between __MODEL__ " + __MODELCC__Id + " and __TARGET__ " + __TARGETCC__Id,
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ],
					"__TARGET__": __TARGETCC__Id instanceof Array ? __TARGETCC__Id : [ __TARGETCC__Id ]
				};
				let arg = {
					source: this,
					op: "__OP__",
					model: "__MODEL__",
					target: "__TARGET__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", __TARGETCC__Id, "__OP__")
			  .then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ],
						"__TARGET__": __TARGETCC__Id instanceof Array ? __TARGETCC__Id : [ __TARGETCC__Id ]
					};
					let arg = {
						source: this,
						op: "__OP__",
						model: "__MODEL__",
						target: "__TARGET__",
						entries: entries,
						result: result
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	associationGet: function (__MODELCC__Id) {
		logger.sess("Association __OP__ for __MODEL__ " + __MODELCC__Id + " and __TARGET__",
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
				};
				let arg = {
					source: this,
					op: "__OP__",
					model: "__MODEL__",
					target: "__TARGET__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "__OP__").then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
					};
					let arg = {
						source: this,
						op: "__OP__",
						model: "__MODEL__",
						target: "__TARGET__",
						entries: entries,
						result: result
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	associationUnset: function (__MODELCC__Id) {
		logger.sess("Association unset for __MODEL__ " + __MODELCC__Id + " and __TARGET__ ",
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
				};
				let arg = {
					source: this,
					op: "unset",
					model: "__MODEL__",
					target: "__TARGET__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "set").then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
					};
					let arg = {
						source: this,
						op: "unset",
						model: "__MODEL__",
						target: "__TARGET__",
						entries: entries,
						result: result
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	associationCompare: function (__MODELCC__Id, __TARGETCC__Id) {
		logger.sess("Association check (is) between __MODEL__ " + __MODELCC__Id + " and __TARGET__ " + __TARGETCC__Id,
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ],
					"__TARGET__": __TARGETCC__Id instanceof Array ? __TARGETCC__Id : [ __TARGETCC__Id ]
				};
				let arg = {
					source: this,
					op: "is",
					model: "__MODEL__",
					target: "__TARGET__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "get").then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ],
						"__TARGET__": __TARGETCC__Id instanceof Array ? __TARGETCC__Id : [ __TARGETCC__Id ]
					};
					let arg = {
						source: this,
						op: "is",
						model: "__MODEL__",
						target: "__TARGET__",
						entries: entries,
						result: result
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				if (result === null)
					resolve(__TARGETCC__Id === null)
				else
					resolve(__TARGETCC__Id === result.id);
			}).catch(reject);

		});
	},

	associationIsSet: function (__MODELCC__Id) {
		logger.sess("Association check (is set) for __MODEL__ " + __MODELCC__Id + " and __TARGET__",
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
				};
				let arg = {
					source: this,
					op: "isSet",
					model: "__MODEL__",
					target: "__TARGET__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.associateEntry("__MODEL__", __MODELCC__Id, "__TARGET__", null, "get").then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
					};
					let arg = {
						source: this,
						op: "isSet",
						model: "__MODEL__",
						target: "__TARGET__",
						entries: entries,
						result: result
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(!!result && !!result.id);
			}).catch(reject);

		});
	},

	associationSetReversed: function (__MODELCC__Id, __TARGETCC__Id) {
		logger.sess("Association (reverse) __OP__ between __MODEL__ " + __MODELCC__Id + " and __TARGET__ " + __TARGETCC__Id,
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ],
					"__TARGET__": __TARGETCC__Id instanceof Array ? __TARGETCC__Id : [ __TARGETCC__Id ]
				};
				let arg = {
					source: this,
					op: "__OP__",
					reversed: true,
					model: "__MODEL__",
					target: "__TARGET__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.associateEntryReversed("__MODEL__", __MODELCC__Id, "__TARGET__", __TARGETCC__Id, "__OP__")
			  .then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ],
						"__TARGET__": __TARGETCC__Id instanceof Array ? __TARGETCC__Id : [ __TARGETCC__Id ]
					};
					let arg = {
						source: this,
						op: "__OP__",
						reversed: true,
						model: "__MODEL__",
						target: "__TARGET__",
						entries: entries,
						result: result
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	},

	associationGetReversed: function (__MODELCC__Id) {
		logger.sess("Association (reverse) __OP__ for __MODEL__ " + __MODELCC__Id + " and __TARGET__",
			"__FN__", null, this.sessionId);
		return new Promise(async (resolve, reject) => {

			let caught = false;
			if (this.hooks && this.hooks.handleDbOperationRequest) {
				let entries = {
					"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
				};
				let arg = {
					source: this,
					op: "__OP__",
					reversed: true,
					model: "__MODEL__",
					target: "__TARGET__",
					entries: entries
				};
				await this.hooks.handleDbOperationRequest(arg).catch((e) => {
					caught = true;
					reject(e);
				});
			}
			if (caught)
				return;

			this.dbConnector.associateEntryReversed("__MODEL__", __MODELCC__Id, "__TARGET__", null, "__OP__")
			  .then(async (result) => {
				let caught = false;
				if (this.hooks && this.hooks.handleDbOperationResponse) {
					let entries = {
						"__MODEL__": __MODELCC__Id instanceof Array ? __MODELCC__Id : [ __MODELCC__Id ]
					};
					let arg = {
						source: this,
						op: "__OP__",
						reversed: true,
						model: "__MODEL__",
						target: "__TARGET__",
						entries: entries,
						result: result
					};
					await this.hooks.handleDbOperationResponse(arg).catch((e) => {
						caught = true;
						reject(e);
					});
				}
				if (caught)
					return;
				resolve(result);
			}).catch(reject);

		});
	}

};

module.exports = TEMPLATES;
