module.exports = [
	{
		password: {
			functionName: "password",
			args: [ "#staticSalt", "$associations.user.username", "admin1234" ]
		},
		created: { functionName: "now" },
		lastUsed: null,
		disused: null,
		expires: null,
		attempts: 0,
		active: true,
		user: { username: "admin" }
	},
	{
		password: {
			functionName: "password",
			args: [ "#staticSalt", "$associations.user.username", "manager1234" ]
		},
		created: { functionName: "now" },
		lastUsed: null,
		disused: null,
		expires: null,
		attempts: 0,
		active: true,
		user: { username: "manager" }
	},
	{
		password: {
			functionName: "password",
			args: [ "#staticSalt", "$associations.user.username", "user1234" ]
		},
		created: { functionName: "now" },
		lastUsed: null,
		disused: null,
		expires: null,
		attempts: 0,
		active: true,
		user: { username: "user" }
	}
];
