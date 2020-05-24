const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "user",
	attributes: {
		id: {
			type: Sequelize.UUID,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		username: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		},
		email: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		},
		locked: {
			type: Sequelize.BOOLEAN,
			allowNull: false
		},
		active: {
			type: Sequelize.BOOLEAN,
			allowNull: false
		}
	},
	associations: [
		{
			type: "belongsToMany",
			target: "access_group",
			through: "user_access_groups"
		},
		{
			type: "belongsTo",
			target: "role"
		}
	],
	meta: {
		idField: "id"
	}
};
