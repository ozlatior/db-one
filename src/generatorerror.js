/*
 * Database Generator Error Class
 */

class DBGeneratorError extends Error {

	constructor (message) {
		super(message);
		this.name = "DBGeneratorError";
	}

}

module.exports = DBGeneratorError;
