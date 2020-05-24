const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "access_group",
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
		description: {
			type: Sequelize.STRING
		}
	},
	associations: [
		{
			type: "belongsTo",
			target: "role"
		},
		{
			type: "belongsTo",
			target: "user",
			as: "owner"
		},
		{
			type: "belongsToMany",
			target: "user",
			through: "user_access_groups"
		},
		{
			type: "belongsToMany",
			target: "resource",
			through: "access_group_resources"
		}
	],
	meta: {
		idField: "id"
	}
};
