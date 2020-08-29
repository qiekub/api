const { compileAndUpsertPlace } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		if (!(!!context.profileID)) {
			// check if logged-in
			reject('User must be logged in.')
		}else{
			if (mongodb.ObjectID.isValid(args._id)) {
				compileAndUpsertPlace(mongodb, [new mongodb.ObjectID(args._id)], (error,didItUpsert) => {
					if (error) {
						reject(error)
					}else{
						resolve(didItUpsert)
					}
				})
			}else{
				reject('ID is not a valid mongoDB.')
			}
		}
	})
}