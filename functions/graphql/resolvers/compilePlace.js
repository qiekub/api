const { compileAnswers, upsertOne } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		if (!args._id) {
			reject('No _id value')
		}else if (!mongodb.ObjectID.isValid(args._id)) {
			reject('_id is not a correct ObjectID')
		}else{
			compileAnswers(mongodb, [new mongodb.ObjectID(args._id)], (error,docs)=>{
				if (error) {
					reject(error)
				}else{
					let doc = {}
					if (!!docs && docs.length > 0) {
						doc = docs[0]
					}
					upsertOne(mongodb.CompiledPlaces_collection, doc, (docID)=>{
						if (!!docID) {
							resolve(true)
						}else{
							resolve(false)
						}
					})
				}
			})
		}
	})
}