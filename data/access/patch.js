// in order to avoid circular references, some associations have to be done
// at the very end
// TODO: handle this in the data loader somehow

module.exports = function(dbConnector) {
	// associate users and access groups
	let users = [];
	let groups = [];

	return new Promise(async (resolve, reject) => {
		resolve();
	});
};
