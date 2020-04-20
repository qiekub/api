module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		const sources = args.properties.sources
		const dataset = args.properties.dataset

		if (args.properties.forIDs && Array.isArray(args.properties.forIDs) && sources) {
			const forIDs = args.properties.forIDs
			.filter(answerID => mongodb.ObjectID.isValid(answerID))
			.map(answerID => new mongodb.ObjectID(answerID))

			if (forIDs.length === 0) {
				reject(`Please provide forIDs.`)
			}else{
				mongodb.Sources_collection.insertOne({
					__typename: 'Doc',
					properties: {
						forIDs,
						sources,
						dataset,
						__typename: 'Sources',
					},
					metadata: {
						created: new Date(),
						lastModified: new Date(),
						__typename: 'Metadata',
					},
				}).then(result => {
					if (!!result.insertedId) {
						resolve(result.insertedId)
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