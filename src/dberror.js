/*
 * Database DBError Class
 */

class DBError extends Error {

	constructor (message) {
		super(message);
		this.name = "DBError";
	}

}

module.exports = DBError;
