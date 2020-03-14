const places = require('./_places.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject) => {
		mongodb.collection.find({'properties.__typename': 'Place'}).limit(1000).toArray((error,docs)=>{
			if (error) {
				console.error(error)
				reject()
			}else{
				resolve(docs || [])
			}

			/*resolve((docs || []).map(doc => {
				return {
					_id: doc._id,
					min_age: (doc.properties.min_age === -1 ? null : doc.properties.min_age),
					max_age: (doc.properties.max_age === -1 ? null : doc.properties.max_age),
				}
			}))*/
		})

		// resolve(places.map(place => {
		// 	return {
		// 		_id: place.name,
		// 		properties: {
		// 			...place,
		// 			__typename: 'Place',
		//
		// 			links: place.website,
		// 			min_age: (place.min_age == -1 ? null : place.min_age),
		// 			max_age: (place.max_age == -1 ? null : place.max_age),
		//
		// 			location: {
		// 				lng: place.lng,
		// 				lat: place.lat,
		// 			},
		// 		},
		// 		metadata: null
		// 	}
		// }))
	})
}