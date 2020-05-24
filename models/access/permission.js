const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "permission",
	attributes: {
		id: {
			type: Sequelize.UUID,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		resourceType: {
			type: Sequelize.STRING,
			allowNull: false
		},
		resourceName: {
			type: Sequelize.STRING,
			allowNull: false
		},
		ownership: {
			type: Sequelize.STRING,
			allowNull: false
		},
		fields: {
			type: Sequelize.STRING,
			allowNull: false
		},
		exclude: {
			type: Sequelize.STRING,
			allowNull: false
		},
		action: {
			type: Sequelize.STRING,
			allowNull: false
		}
	},
	associations: [
		{
			type: "belongsToMany",
			target: "role",
			through: "role_permissions"
		}
	],
	meta: {
		idField: "id"
	}
};
