const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "resource",
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
		},
		type: {
			type: Sequelize.STRING,
			allowNull: false
		},
		location: {
			type: Sequelize.STRING,
			allowNull: false
		}
	},
	associations: [
		{
			type: "belongsTo",
			target: "user",
			as: "owner"
		},
		{
			type: "belongsToMany",
			target: "access_group",
			through: "access_group_resources"
		}
	],
	meta: {
		idField: "id"
	}
};
