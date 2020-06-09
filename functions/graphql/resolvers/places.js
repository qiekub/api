module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject) => {
		mongodb.CompiledPlaces_collection.find().toArray((error,docs)=>{
			if (error) {
				reject(error)
			}else{
				resolve(docs)
			}
		})
	})
}