const secretManager = require('../../secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

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
	// .then(data => {
	// 	console.log(data)
	// 	return data
	// })
	.catch(error => null)

	return new Promise(resolve => resolve(result)).then(mapping)
}


module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	const queryString = args.query // 'Bonn, Germany'

	if (
		!(queryString && queryString != '' && queryString.length > 1 && /\S/.test(queryString))
	) {
		return new Promise((resolve,reject) => reject("No real search-query!"))
	}else{
		return new Promise(async (resolve,reject) => {
			// &viewbox=min_lon,min_lat,max_lon,max_lat
			tryToFetchJson(`https://eu1.locationiq.com/v1/search.php?key=${await getSecretAsync('api_key_locationiq')}&limit=1&format=json&q=${queryString}`, data => {
				if (data && Array.isArray(data) && data.length > 0) {
					const firstResult = data[0]
					return {
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

						// lat: firstResult.lat,
						// lng: firstResult.lon,
						// boundingbox: firstResult.boundingbox,

						// licence: 'locationiq.com',
						// licence: firstResult.licence,
						// licence: '© LocationIQ.com CC BY 4.0, Data © OpenStreetMap contributors, ODbL 1.0',
					}
				}else{
					throw new Error('No place found!')
				}
			})
			.then(data=>data, async error=>{
				return tryToFetchJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${queryString}.json?fuzzyMatch=true&limit=1&access_token=${await getSecretAsync('api_key_mapbox')}`, data => {
					const results = data.features
					if (results && Array.isArray(results) && results.length > 0) {
						const firstResult = results[0]
						return {
							geometry: {
								location: {
									lng: firstResult.geometry.coordinates[0],
									lat: firstResult.geometry.coordinates[1],
								},
								boundingbox: {
									northeast: {
										lng: firstResult.bbox[0],
										lat: firstResult.bbox[1],
									},
									southwest: {
										lng: firstResult.bbox[2],
										lat: firstResult.bbox[3],
									},
								},
							},
							// licence: data.attribution,
							// licence: 'mapbox.com',
						}
					}else{
						throw new Error('No place found!')
					}
				})
			})
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
			.then(resolve, reject)
		})
	}
}