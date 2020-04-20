module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		const sources = args.properties.sources

		if (args.properties.answerIDs && Array.isArray(args.properties.answerIDs) && sources) {
			const answerIDs = args.properties.answerIDs
			.filter(answerID => mongodb.ObjectID.isValid(answerID))
			.map(answerID => new mongodb.ObjectID(answerID))

			if (answerIDs.length === 0) {
				reject(`Please provide answerIDs.`)
			}else{
				mongodb.Sources_collection.insertOne({
					__typename: 'Doc',
					properties: {
						answerIDs,
						sources,
						__typename: 'Sources',
					},
					metadata: {
						created: new Date(),
						lastModified: new Date(),
						__typename: 'Metadata',
					},
				}).then(result => {
					if (!!result.insertedId) {
						resolve(result.insertedId || null)
					}else{
						reject(null)
					}
				}).catch(reject)
			}
		}else{
			reject(`The variables aren't okay.`)
		}
	})
}