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
				// {$limit: 1},
			]).toArray((error,docs)=>{
				if (error) {
					reject(error)
				}else{
					resolve(docs)
				}
			})
		}else{
			// return the changesets that are not yet in CompiledPlaces if no forID is provided
			mongodb.Changesets_collection.aggregate([
				{$lookup:{
					from: 'CompiledPlaces',
					localField: 'properties.forID',
					foreignField: '_id',
					as: 'lookup_result',
				}},
				{$match: {
					'lookup_result': {$size:0},
				}},
				{$sort: {
					'metadata.lastModified': -1,
				}},
				{$limit: 10},
			]).toArray((error,docs)=>{
				if (error) {
					reject(error)
				}else{
					resolve(docs)
				}
			})
		}
	})
}