const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "role",
	attributes: {
		id: {
			type: Sequelize.UUID,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		name: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		}
	},
	associations: [
		{
			type: "belongsToMany",
			target: "permission",
			through: "role_permissions"
		}
	],
	meta: {
		idField: "id"
	}
};
