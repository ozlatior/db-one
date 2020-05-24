const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "password",
	attributes: {
		id: {
			type: Sequelize.UUID,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		password: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		created: {
			type: Sequelize.DATE
		},
		lastUsed: {
			type: Sequelize.DATE
		},
		disused: {
			type: Sequelize.DATE
		},
		expires: {
			type: Sequelize.DATE
		},
		attempts: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0
		},
		active: {
			type: Sequelize.BOOLEAN,
			allowNull: false
		}
	},
	associations: [
		{
			type: "belongsTo",
			target: "user"
		}
	],
	meta: {
		idField: "id",
		owner: "user"
	}
};
