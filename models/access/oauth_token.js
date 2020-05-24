const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "oauth_token",
	attributes: {
		id: {
			type: Sequelize.UUID,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		accessToken: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		},
		accessTokenExpiresAt: {
			type: Sequelize.DATE,
			allowNull: false
		},
		refreshToken: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		},
		refreshTokenExpiresAt: {
			type: Sequelize.DATE,
			allowNull: false
		}
	},
	associations: [
		{
			type: "belongsTo",
			target: "user"
		},
		{
			type: "belongsTo",
			target: "oauth_client"
		}
	],
	meta: {
		idField: "id"
	}
};
