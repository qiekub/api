module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	// check if logged-in
	if (!(!!context.profileID)) {
		return []
	}

	return new Promise((resolve,reject)=>{
		mongodb.Sessions_collection.aggregate([
			{$match: {
				'session.passport.user': context.profileID,
			}},
			{$project:{
				_id: "$_id",
				__typename: 'Doc',
				properties: {
					__typename: 'Session',
					expires: "$expires",
					lastModified: "$lastModified",
					profileID: "$session.passport.user",
					user_agent: "$session.metadata.user_agent",
					started: "$session.metadata.started",
				},
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