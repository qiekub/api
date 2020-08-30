// const { annotateDoc } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		mongodb.CompiledPlaces_collection.aggregate([
			{$match:{
				'properties.tags.preset': 'boundary/administrative',
				...(
					!!args.countryCode
					? {'properties.tags.ISO3166-1:alpha3': args.countryCode}
					: null
				),
				...(
					!(!!context.profileID) // check if logged-in
					? {'properties.tags.published': true}
					: null
				),
			}},
			{$project:{
				_id: '$_id',
				__typename: 'Doc',
				properties: {
					__typename: 'Place',
					// name: '$properties.name',
					tags: '$properties.tags'
				}
			}},
		]).toArray((error,docs)=>{
			if (error) {
				reject(error)
			}else{
				if (!!args.countryCode) {
					resolve(docs[0])
					// resolve(annotateDoc(docs[0]))
				}else{
					resolve(docs)
					// resolve(docs.map(doc => annotateDoc(doc)))
				}
			}
		})
	})
}