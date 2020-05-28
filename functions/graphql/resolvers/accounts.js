module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	// check if logged-in
	if (!(!!context.profileID)) {
		return []
	}

	return new Promise((resolve,reject)=>{
		mongodb.Accounts_collection.aggregate([
			{$match: {
				'properties.forProfileID': context.profileID,
			}},
		]).toArray((error,docs)=>{
			if (error) {
				reject(error)
			}else{
				resolve(docs)
			}
		})
	})
}