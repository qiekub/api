const fetch = require('node-fetch')
// const places = require('./data/_places.js')
const osm_places = require('./data/osm_places.json')

// https://overpass-api.de/api/interpreter?data=[bbox:90,-180,-90,180][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;

async function getOverpassResult(mapping) {
	// 50.6,7.0,50.8,7.3
	/*
	const url = 'https://overpass-api.de/api/interpreter?data=[bbox:90,-180,-90,180][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;'

	const result = await fetch(encodeURI(url), {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'queer.qiekub.com',
			'User-Agent': 'queer.qiekub.com',
		},
	})
	.then(res => res.json())
	.then(data => {
		console.log('finished loading', data.elements.length)

		return data.elements.map(element=>{
			if (element.type !== 'node') {
				return null
			}

			let doc = {
				_id: 'https://www.openstreetmap.org/'+element.type+'/'+element.id,
				__typename: 'Doc',
				properties: {
					__typename: 'Place',
					name: element.tags.name || '',
					geometry: {
						location: {
							lng: element.lon,
							lat: element.lat,
						},
					},
					osmID: element.type+'/'+element.id,
					tags: element.tags,
				},
			}

			return doc
		}).filter(d=>d!==null)
	})
	.catch(error => null)
	*/

	const result = osm_places.elements.map(element=>{
		if (element.type !== 'node') {
			return null
		}

		let doc = {
			_id: 'https://www.openstreetmap.org/'+element.type+'/'+element.id,
			__typename: 'Doc',
			properties: {
				__typename: 'Place',
				name: element.tags.name || '',
				geometry: {
					location: {
						lng: element.lon,
						lat: element.lat,
					},
				},
				osmID: element.type+'/'+element.id,
				tags: element.tags,
			},
		}

		return doc
	}).filter(d=>d!==null)

	return new Promise(resolve => resolve(result)).then(mapping)
}

function loadPlacesFromOsmChache(mongodb, callback){
	mongodb.osm_collection.find({'properties.__typename': 'Place'}).limit(1000).toArray((error,docs)=>{
		if (error) {
			console.error(error)
			// reject()
			callback([])
		}else{
			// resolve(docs || [])
			callback(docs || [])
		}

		/*resolve((docs || []).map(doc => {
			return {
				_id: doc._id,
				min_age: (doc.properties.min_age === -1 ? null : doc.properties.min_age),
				max_age: (doc.properties.max_age === -1 ? null : doc.properties.max_age),
			}
		}))*/
	})
}

function loadPlacesFromDB(mongodb, callback){
	mongodb.collection.find({'properties.__typename': 'Place'}).limit(1000).toArray((error,docs)=>{
		if (error) {
			console.error(error)
			// reject()
			callback([])
		}else{
			// resolve(docs || [])
			callback(docs || [])
		}

		/*resolve((docs || []).map(doc => {
			return {
				_id: doc._id,
				min_age: (doc.properties.min_age === -1 ? null : doc.properties.min_age),
				max_age: (doc.properties.max_age === -1 ? null : doc.properties.max_age),
			}
		}))*/
	})
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject) => {

		// loadPlacesFromOsmChache(mongodb, osmDocs=>{
		// 	// resolve([...docs, ...osmDocs])
		// 	resolve(osmDocs)
		// })

		getOverpassResult().then(overpassDocs=>{
			loadPlacesFromDB(mongodb, docs=>{
				// resolve([...docs, ...overpassDocs])
				resolve(overpassDocs)
			})
		}, error=>{
			console.error(error)
			loadPlacesFromDB(mongodb, docs=>{
				resolve(docs)
			})
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