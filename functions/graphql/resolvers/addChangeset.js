const { addChangeset, compileAndUpsertPlace } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		const properties = args.properties

		if (mongodb.ObjectID.isValid(properties.forID)) {
			const forID = new mongodb.ObjectID(properties.forID)
			addChangeset(mongodb, {
				...properties,
				forID,
			}, changesetID=>{
				compileAndUpsertPlace(mongodb, [forID], ()=>{
					resolve(changesetID)
				})
			}, ()=>{
				reject("Could not add changeset.")
			})
		}
	})
}