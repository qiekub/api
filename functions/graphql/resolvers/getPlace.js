const places = require('./_places.js')

function getPlace(placeID, resolve){
	let foundPlace = null
	for (const place of places) {
		if (place.name == placeID) {
			foundPlace = {
				_id: null,
				properties: {
					...place,
				
					__typename: 'Place',
	
					links: place.website,
					min_age: (place.min_age == -1 ? null : place.min_age),
					max_age: (place.max_age == -1 ? null : place.max_age),
	
					location: {
						lng: place.lng,
						lat: place.lat,
					},
				},
				metadata: null,
			}
			break
		}
	}

	resolve(foundPlace)
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		// getPlace(args._id, resolve)

		if (args._id && mongodb.ObjectID.isValid(args._id)) {
			mongodb.collection.findOne({
				_id: new mongodb.ObjectID(args._id),
				'properties.__typename': 'Place',
			}).then(result => {
				console.log('result', result)
				resolve(result)
			}).catch(reject)
		}else{
			reject()
		}
	})
}