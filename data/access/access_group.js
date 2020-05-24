module.exports = [
	{
		name: "System",
		description: "System access group",
		role: { name: "System" },
		owner: { username: "system" },
		users: [
			{ username: "system" }
		]
	},
	{
		name: "Admin",
		description: "Administrators' access group",
		role: { name: "Admin" },
		owner: { username: "system" },
		users: [
			{ username: "admin" }
		]
	},
	{
		name: "User Manager",
		description: "User Managers' access group",
		role: { name: "User Manager" },
		owner: { username: "system" },
		users: [
			{ username: "manager" }
		]
	}
];
