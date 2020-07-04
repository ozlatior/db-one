const Sequelize = require("sequelize");

const uuid = require("uuid/v4");

module.exports = {
	name: "user_data",
	attributes: {
		id: {
			type: Sequelize.UUID,
			unique: true,
			allowNull: false,
			primaryKey: true,
			defaultValue: () => uuid()
		},
		firstName: {
			type: Sequelize.STRING,
			allowNull: false
		},
		lastName: {
			type: Sequelize.STRING,
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
