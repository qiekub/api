const { annotateDoc } = require('../../modules.js')

const { 
	cacheKeyFromObjectSync,
	isCachedSync,
	setCacheSync,
	getCacheSync,
} = require('../cache.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		const cacheKey = cacheKeyFromObjectSync({
			query: 'countries',
			args,
			context,
		})

		if (isCachedSync(cacheKey)) {
			resolve(getCacheSync(cacheKey))
		}

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
				let toReturn = null

				if (!!args.countryCode) {
					toReturn = annotateDoc(docs[0])
				}else{
					toReturn = docs.map(doc => annotateDoc(doc))
				}

				setCacheSync(cacheKey, toReturn)

				resolve(toReturn)
			}
		})
	})
}