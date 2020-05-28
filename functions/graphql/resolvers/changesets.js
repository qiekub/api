module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	// check if logged-in
	if (!(!!context.profileID)) {
		return []
	}

	return new Promise((resolve,reject)=>{
		const forID = args.forID

		if (mongodb.ObjectID.isValid(forID)) {
			mongodb.Changesets_collection.aggregate([
				{$match:{
					'properties.forID': new mongodb.ObjectID(forID),
				}},
				{$sort: {
					'metadata.lastModified': -1
				}},
				{$limit: 10},
			]).toArray((error,docs)=>{
				if (error) {
					reject(error)
				}else{
					resolve(docs)
				}
			})
		}else{
			reject('not valid forID')
		}
	})
}