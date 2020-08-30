const { annotateDoc } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		if (!(!!context.profileID)) {
			// check if logged-in
			reject('User must be logged in.')
		}else if (!args._id) {
			reject('No _id value')
		}else if (!mongodb.ObjectID.isValid(args._id)) {
			reject('_id is not a correct ObjectID')
		}else{
			mongodb.Changesets_collection.findOne({
				_id: new mongodb.ObjectID(args._id),
				'properties.__typename': 'Changeset',
			}).then(resultDoc => {
				resolve(annotateDoc(resultDoc))
			}).catch(error=>{
				reject(error)
			})
		}
	})
}