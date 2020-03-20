const fetch = require('node-fetch')
const async = require('async')

// const places = require('./data/_places.js')
const osm_places = require('./data/osm_places.json')

// https://overpass-api.de/api/interpreter?data=[bbox:90,-180,-90,180][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;

async function getOverpassResult(mapping) {
	// 50.6,7.0,50.8,7.3
	// [bbox:48.795330416333336,2.217864990234375,48.970301503721316,2.4894332885742188]
	// [bbox:90,-180,-90,180]
	
	/*
	const url = 'https://overpass-api.de/api/interpreter?data=[bbox:48.795330416333336,2.217864990234375,48.970301503721316,2.4894332885742188][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];(node[~"^lgbtq.*$"~"."];-node[~"^lgbtq.*$"~"(welcomeAD1457)"];);(node[~"^gay.*$"~"."];-node[~"^gay.*$"~"(welcomeAD1457)"];);(node[~"^fetish.*$"~"."];-node[~"^fetish.*$"~"(welcomeAD1457)"];););out;'

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
	mongodb.OsmCache_collection.find({'properties.__typename': 'Place'}).limit(1000).toArray((error,docs)=>{
		if (error) {
			console.error(error)
			// reject()
			callback([])
		}else{
			callback(docs)
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
			callback(docs)
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

		async.parallel({
			osm: function(callback) {
				loadPlacesFromOsmChache(mongodb, docs=>{
					callback(null, docs)
				})
			},
			qiekub: callback=>{
				loadPlacesFromDB(mongodb, docs=>{
					callback(null, docs)
				})
			}
		}, (err, results)=>{
			resolve([...results.osm, ...results.qiekub])
		})

		// loadPlacesFromOsmChache(mongodb, osmDocs=>{
		// 	loadPlacesFromDB(mongodb, docs=>{
		// 		resolve([...docs, ...osmDocs])
		// 	})
		// })
	})
}