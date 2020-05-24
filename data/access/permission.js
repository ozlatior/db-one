module.exports = [
	// nobody can set or change ids
	{
		resourceType: "db_entry",
		resourceName: "*",
		ownership: "*",
		action: "CU",
		fields: "NONE",
		exclude: "id",
		roles: "*"
	},
	// nobody can read passwords
	{
		resourceType: "db_entry",
		resourceName: "users",
		ownership: "*",
		action: "R",
		fields: "NONE",
		exclude: "password",
		roles: "*"
	},
	// nobody can change usernames
	{
		resourceType: "db_entry",
		resourceName: "users",
		ownership: "*",
		action: "U",
		fields: "NONE",
		exclude: "username",
		roles: "*"
	},
	// system user can set anything except for things above
	{
		resourceType: "db_entry",
		resourceName: "*",
		ownership: "*",
		action: "CRUD",
		fields: "*",
		exclude: "",
		roles: [
			{ name: "System" }
		]
	},
	// admin and user manager can create, retrieve and update any user
	{
		resourceType: "db_entry",
		resourceName: "users",
		ownership: "all",
		fields: "*",
		exclude: "",
		action: "CRU",
		roles: [
			{ name: "Admin" },
			{ name: "User Manager" }
		]
	},
	// users can read their own information
	{
		resourceType: "db_entry",
		resourceName: "users",
		ownership: "own",
		action: "R",
		fields: "*",
		exclude: "",
		roles: [
			{ name: "User" }
		]
	},
	// users can update their own information, except for email and roleId
	{
		resourceType: "db_entry",
		resourceName: "users",
		ownership: "own",
		action: "U",
		fields: "*",
		exclude: "email,roleId",
		roles: [
			{ name: "User" }
		]
	},
	// users can read their own role information
	{
		resourceType: "db_entry",
		resourceName: "roles",
		ownership: "own",
		action: "R",
		fields: "*",
		exclude: "",
		roles: [
			{ name: "User" }
		]
	},
	// admins and managers can read any role information
	{
		resourceType: "db_entry",
		resourceName: "roles",
		ownership: "all",
		action: "R",
		fields: "*",
		exclude: "",
		roles: [
			{ name: "Admin" },
			{ name: "User Manager" }
		]
	},
	// admins and managers can read any permission information
	{
		resourceType: "db_entry",
		resourceName: "permissions",
		ownership: "all",
		action: "R",
		fields: "*",
		exclude: "",
		roles: [
			{ name: "Admin" },
			{ name: "User Manager" }
		]
	}
];
