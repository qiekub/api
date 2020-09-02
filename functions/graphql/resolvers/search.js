const secretManager = require('../../secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

const async = require('async')
const fetch = require('node-fetch')

/*

// DONE:
https://nominatim.openstreetmap.org/search?q=Bonn,%20Germany&format=json&limit=1&addressdetails=0&extratags=0&namedetails=0
https://api.opencagedata.com/geocode/v1/json?key=&pretty=0&no_annotations=1&limit=1&no_record=1&q=Bonn,%20Germany
https://eu1.locationiq.com/v1/search.php?key=&limit=1&format=json&q=Bonn,%20Germany
https://maps.googleapis.com/maps/api/geocode/json?key=&address=Bonn,Germany

*/

async function tryToFetchJson(url, mapping) {
	const result = await fetch(encodeURI(url), {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'qiekub.com',
			'User-Agent': 'A geocoder for qiekub.com',
		},
	})
	.then(res => res.json())
	.catch(error => null)

	return new Promise(resolve => resolve(result)).then(mapping)
}


function searchCompiledPlaces(context, mongodb, queryString){
	return new Promise(async (resolve,reject) => {
		const regexQuery = `(${
			queryString
			.replace(/,/g, ' ')			// remove commas
			.replace(/\s+/g, ' ')		// squash multiple spaces into a single space
			.trim('')					// remove trailing whitespace
			.replace(/\s/g, '|')		// replace whitespace with a pipe
			.split('|')					// use pipe to split into words
			.filter(v => v.length > 1)	// only allow word longer than 1 character
			.join('|')					// merge back together for regex
		})`
	
		mongodb.CompiledPlaces_collection.aggregate([
			{$match:{
				'properties.tags.preset': {$nin:['default'/*,'boundary/administrative'*/]},
				// 'properties.tags.lat': {$ne:0},
				// 'properties.tags.lng': {$ne:0},
				...(
					!(!!context.profileID) // check if logged-in
					? {'properties.tags.published': true}
					: null
				),
			}},
			{$addFields:{
				score: {$sum:[
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.addr:postcode"}}, 1,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.addr:country"}}, 1,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.addr:city"}}, 2,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.addr:housenumber"}}, 1,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.addr:street"}}, 2,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.name"}}, 3,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.name:en"}}, 3,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.name:de"}}, 3,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.short_name"}}, 1,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.official_name"}}, 1,0]},
					{$cond:[ {$regexMatch:{regex:regexQuery, options:"i", input:"$properties.tags.operator"}}, 1,0]},
				]}
			}},
			{$match:{
				score: {$gt: 0}
			}},
			{$sort:{
				score: -1
			}},
			{$limit: 3},
			{$project:{
				"properties.tags.preset": true,
				"properties.tags.addr:street": true,
				"properties.tags.addr:housenumber": true,
				"properties.tags.addr:postcode": true,
				"properties.tags.addr:city": true,
				"properties.tags.addr:country": true,
				"properties.tags.lng": true,
				"properties.tags.lat": true,
				"properties.name": true,
				"properties.geometry": true,
			}},
		]).toArray((error,docs)=>{
			if (error) {
				reject(error)
			}else{
				docs = docs.map(doc => {
					const address = [
						doc.properties.tags['addr:street'],
						doc.properties.tags['addr:housenumber'],
						doc.properties.tags['addr:postcode'],
						doc.properties.tags['addr:city'],
						doc.properties.tags['addr:country'],
					].filter(v=>v).join(', ')

					return {
						__typename: 'GeoSearchResult',
						placeID: doc._id,
						preset: doc.properties.tags.preset,
						name: doc.properties.name,
						address: address,
						geometry: doc.properties.geometry || {
							__typename: 'GeoData',
							location: {
								__typename: 'GeoCoordinate',
								lng: doc.properties.tags.lng,
								lat: doc.properties.tags.lat,
							},
						}
						// licence: 'qiekub.org',
					}
				})
				resolve(docs)
			}
		})
	})
}

function gecodeQuery(queryString, options){
	const optionsLanguage = (options.language ? options.language : null)

	const types = 'country,region,postcode,district,place,locality,neighborhood,address' // ,poi

	return new Promise(async (resolve,reject) => {
		tryToFetchJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${queryString}.json?limit=3&fuzzyMatch=true&autocomplete=true&types=${types}${options.language ? '&language='+options.language : ''}&access_token=${await getSecretAsync('api_key_mapbox')}`, data => {
			const results = data.features
			if (results && Array.isArray(results) && results.length > 0) {
				resolve(results.map(result => ({
					__typename: 'GeoSearchResult',
					placeID: undefined,
					preset: 'address',
					name: [{
						__typename: 'Text',
						text: result.text,
						language: optionsLanguage,
					}],
					address: result.place_name,
					geometry: {
						__typename: 'GeoData',
						location: {
							__typename: 'GeoCoordinate',
							lng: result.center[0],
							lat: result.center[1],
						},
						boundingbox: (
							result.bbox
							? {
								__typename: 'Boundingbox',
								northeast: {
									__typename: 'GeoCoordinate',
									lng: result.bbox[0],
									lat: result.bbox[1],
								},
								southwest: {
									__typename: 'GeoCoordinate',
									lng: result.bbox[2],
									lat: result.bbox[3],
								},
							}
							: undefined
						),
					}
					// licence: data.attribution,
					// licence: 'mapbox.com',
				})))
			}else{
				throw new Error('No place found!')
			}
		})
		.then(data=>data, async error=>{
			return tryToFetchJson(`https://eu1.locationiq.com/v1/search.php?key=${await getSecretAsync('api_key_locationiq')}&limit=3&format=json&q=${queryString}`, results => {
				if (results && Array.isArray(results) && results.length > 0) {
					resolve(results.map(result => {
						let name = ''
						let address = ''

						const pos = result.display_name.indexOf(',')
						if (pos > -1) {
							name = result.display_name.substr(0, pos).trim()
							address = result.display_name.substr(pos+1).trim()
						}else{
							name = result.display_name
							address = ''
						}

						return {
							__typename: 'GeoSearchResult',
							placeID: undefined,
							preset: 'address',
							name: [{
								__typename: 'Text',
								text: name,
								language: null,
							}],
							address,
							geometry: {
								__typename: 'GeoData',
								location: {
									__typename: 'GeoCoordinate',
									lng: result.lon,
									lat: result.lat,
								},
								boundingbox: (
									result.bbox
									? {
										__typename: 'Boundingbox',
										northeast: {
											__typename: 'GeoCoordinate',
											lng: result.boundingbox[3],
											lat: result.boundingbox[1],
										},
										southwest: {
											__typename: 'GeoCoordinate',
											lng: result.boundingbox[2],
											lat: result.boundingbox[0],
										},
									}
									: undefined
								),
							}
							// licence: 'locationiq.com',
							// licence: firstResult.licence,
							// licence: '© LocationIQ.com CC BY 4.0, Data © OpenStreetMap contributors, ODbL 1.0',
						}
					}))
				}else{
					throw new Error('No place found!')
				}
			})
		})
		/*
		.then(data=>data, async error=>{
			// &proximity=51.952659,7.632473
			return tryToFetchJson(`https://api.opencagedata.com/geocode/v1/json?key=${await getSecretAsync('api_key_opencagedata')}&pretty=0&no_annotations=1&limit=1&no_record=1&q=${queryString}`, data => {
				const results = data.results
				if (results && Array.isArray(results) && results.length > 0) {
					const firstResult = results[0]
					return {
						geometry: {
							location: {
								lng: firstResult.geometry.lng,
								lat: firstResult.geometry.lat,
							},
							boundingbox: {
								northeast: {
									lng: firstResult.bounds.northeast.lng,
									lat: firstResult.bounds.northeast.lat,
								},
								southwest: {
									lng: firstResult.bounds.northeast.lng,
									lat: firstResult.bounds.northeast.lat,
								},
							},
							// boundingbox: firstResult.bounds,
						},
						// licence: firstResult.licence[0].url,
						// licence: 'opencagedata.com',
						// [
						// 	firstResult.bounds.southwest.lat,
						// 	firstResult.bounds.northeast.lat,
						// 	firstResult.bounds.southwest.lng,
						// 	firstResult.bounds.northeast.lng,
						// ],
					}
				}else{
					throw new Error('No place found!')
				}
			})
		})
		.then(data=>data, async error=>{
			return tryToFetchJson(`https://maps.googleapis.com/maps/api/geocode/json?key=${await getSecretAsync('api_key_googleapis')}&address=${queryString}`, data => {
				const results = data.results
				if (results && Array.isArray(results) && results.length > 0) {
					const firstResult = results[0]
					return {
						geometry: {
							location: {
								lng: firstResult.geometry.location.lng,
								lat: firstResult.geometry.location.lat,
							},
							boundingbox: {
								northeast: {
									lng: firstResult.geometry.bounds.northeast.lng,
									lat: firstResult.geometry.bounds.northeast.lat,
								},
								southwest: {
									lng: firstResult.geometry.bounds.northeast.lng,
									lat: firstResult.geometry.bounds.northeast.lat,
								},
							},
						},
						// licence: 'maps.googleapis.com',
					}
				}else{
					throw new Error('No place found!')
				}
			})
		})
		.then(data=>data, error=>{
			return tryToFetchJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&extratags=0&namedetails=0&q=${queryString}`, data => {
				if (data && Array.isArray(data) && data.length > 0) {
					const firstResult = data[0]
					resolve({
						geometry: {
							location: {
								lng: firstResult.lon,
								lat: firstResult.lat,
							},
							boundingbox: {
								northeast: {
									lng: firstResult.boundingbox[3],
									lat: firstResult.boundingbox[1],
								},
								southwest: {
									lng: firstResult.boundingbox[2],
									lat: firstResult.boundingbox[0],
								},
							},
						},
						// licence: firstResult.licence,
						// licence: 'nominatim.openstreetmap.org',
					})
				}else{
					throw new Error('No place found!')
				}
			})
		})
		*/
		.then(resolve, reject)
	})
}



module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	const queryString = args.query // 'Bonn, Germany'
	const language = (args.languages && args.languages.length > 0 ? args.languages[0] : undefined)

	if (
		!(queryString && queryString != '' && queryString.length > 1 && /\S/.test(queryString))
	) {
		return new Promise((resolve,reject) => reject('No real search-query!'))
	}else{
		return new Promise((resolve,reject) => {
			async.parallel({
				db: callback => {
					searchCompiledPlaces(context, mongodb, queryString).then(docs=>{
						callback(null, docs)
					}, error=>{
						callback(null, [])
					})
				},
				geocoder: callback => {
					gecodeQuery(queryString, {language}).then(docs=>{
						callback(null, docs)
					}, error=>{
						callback(null, [])
					})
				}
			}, (error, results) => {
				resolve({
					__typename: 'SearchInfo',
					query: queryString,
					results: [
						...results.db,
						...results.geocoder,
					],
				})
			})
		})
	}
}