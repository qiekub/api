const { addChangeset, compileAndUpsertPlace } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	const p = args.properties

	return new Promise((resolve,reject)=>{
		if (!(!!context.profileID)) {
			// check if logged-in
			reject('User must be logged in.')
		}else{
			if (
				mongodb.ObjectID.isValid(p.toID)
				&& mongodb.ObjectID.isValid(p.fromID)
			) {
				if (
					// Make sure one provided ID is the current user.
					p.toID+'' === context.profileID+''
					|| p.fromID+'' === context.profileID+''
				) {
					const toID = new mongodb.ObjectID(p.toID)
					mongodb.Edges_collection.insertOne({
						__typename: 'Doc',
						properties: {
							__typename: 'Edge',
							edgeType: p.edgeType,
							toID,
							fromID: new mongodb.ObjectID(p.fromID),
							tags: (p.tags && Object.keys(p.tags).length > 0 ? p.tags : {}),
						},
						metadata: {
							created: new Date,
							lastModified: new Date,
							__typename: 'Metadata',
						},
					})
					.then(result => {
						if (!!result.insertedId) {
							resolve(result.insertedId)

							if (
								// TODO: check if toID is a Changeset
								p.edgeType === 'rejected'
								|| p.edgeType === 'approved'
								|| p.edgeType === 'fact_checked'
							) {
								compileAndUpsertPlace(mongodb, [toID], (error,didItUpsert) => {
									if (error) {
										console.error(error)
									}
								})
							}
						}else{
							reject('Could not insert a new edge.')
						}
					})
					.catch(error => reject(error))
				}else{
					reject('FromID or toID must be the current users profileID.')
				}
			}else{
				reject('FromID or toID is not a valid mongoDB.')
			}
		}
	})
}