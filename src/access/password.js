/*
 * Sets of password algos that can be used by access manager
 */

const crypto = require("crypto");

const password1 = {

	// password-1 generation function
	generate: function(iv, ks, staticSalt, username, password) {
		// generate key
		const key = crypto.scryptSync(username, ks, 24);

		// create a cipher with the generated key
		const cipher = crypto.createCipheriv("aes-192-cbc", key, iv);

		// get dynamicSalt using the cipher
		var dynamicSalt = cipher.update(username, "utf8", "hex");
		dynamicSalt += cipher.final("hex");
		dynamicSalt = dynamicSalt.slice(-32);

		// get the hash of everything put together
		const hash = crypto.createHash("sha256");
		hash.update(staticSalt, "hex");
		hash.update(dynamicSalt, "hex");
		hash.update(password, "utf8");
		const hashed = hash.digest("hex");

		return iv.toString("hex") + ks.toString("hex") + hashed;
	},

	/*
	 * generates a password hash using password-1:
	 * hash(staticSalt(utf) + dynamicSalt(utf) + password)
	 *
	 * - staticSalt: provided as hex string by user (16 bytes)
	 *
	 * - dynamicSalt: generated, as follows
	 *   AES-192-CBC [ key, iv ] (username) - last 16 bytes
	 *   where
	 *   - key: generated using scrypt(username, keySalt, 24)
	 *   - iv: randomly generated [16 bytes]
	 *   - keySalt: randomly generated [16 bytes]
	 *
	 * - password: user password (plain text)
	 *
	 * returns the hash (SHA2), key and iv as follows:
	 * [keySalt(hex)] [iv(hex)] [hash(hex)]
	 *
	 * - staticSalt: string, hex-encoded staticSalt
	 * - username: string, username
	 * - password: string, plain-text password
	 */
	get: function(staticSalt, username, password) {
		// generate iv and keySalt
		const iv = crypto.randomBytes(16);
		const ks = crypto.randomBytes(16);

		// call the generate function
		return password1.generate(iv, ks, staticSalt, username, password);
	},

	/*
	 * check password against hashed form
	 * returns true if they match, false otherwise
	 * - staticSalt: string, hex-encoded staticSalt
	 * - username: string, username
	 * - password: string, plain-text password to check
	 * - hash: string, hashed password-1 to check against (contains keySalt and iv)
	 */
	check: function(staticSalt, username, password, hash) {
		const iv = Buffer.from(hash.slice(0, 32), "hex");
		const ks = Buffer.from(hash.slice(32, 64), "hex");

		const generated = password1.generate(iv, ks, staticSalt, username, password);

		return (generated === hash);
	},

};

module.exports = {
	password1: password1
};
