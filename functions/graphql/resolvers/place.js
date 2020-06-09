module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		if (!args._id) {
			reject('No _id value')
		}else if (!mongodb.ObjectID.isValid(args._id)) {
			reject('_id is not a correct ObjectID')
		}else{
			mongodb.CompiledPlaces_collection.findOne({
				_id: new mongodb.ObjectID(args._id),
				'properties.__typename': 'Place',
			}).then(resultDoc => {
				resolve(resultDoc)
			}).catch(error=>{
				reject(error)
			})
		}
	})
}