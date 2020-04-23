const { addChangeset, compileAndUpsertPlace } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		const changeset = args.changeset

		if (mongodb.ObjectID.isValid(changeset.forID)) {
			const forID = new mongodb.ObjectID(changeset.forID)
			addChangeset(mongodb, {
				...changeset,
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