const { compileAndUpsertPlace, upsertOne } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		if (!args._id) {
			reject('No _id value')
		}else if (!mongodb.ObjectID.isValid(args._id)) {
			reject('_id is not a correct ObjectID')
		}else{
			compileAndUpsertPlace(mongodb, [new mongodb.ObjectID(args._id)], (error,didItUpsert)=>{
				if (error) {
					reject(error)
				}else{
					resolve(didItUpsert)
				}
			})
		}
	})
}