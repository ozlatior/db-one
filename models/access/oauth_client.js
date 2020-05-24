const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "oauth_client",
	attributes: {
		id: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		name: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		},
		clientSecret: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		},
		redirectUri: {
			type: Sequelize.STRING,
			allowNull: false
		}
	},
	associations: [
	]
};
