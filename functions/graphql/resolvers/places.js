module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject) => {
		mongodb.CompiledPlaces_collection.find({
			...(
				!(!!context.profileID) // check if logged-in
				? {
					'properties.tags.published': true,
				}
				: {}
			),
		}).toArray((error,docs)=>{
			if (error) {
				reject(error)
			}else{
				resolve(docs)
			}
		})
	})
}