const secretManager = require('../../secretManager.js')
const getSecret = secretManager.getSecret

const fetch = require('node-fetch')

// const { api_key } = process.env


/*

// DONE:
https://nominatim.openstreetmap.org/search?q=Bonn,%20Germany&format=json&limit=1&addressdetails=0&extratags=0&namedetails=0
https://api.opencagedata.com/geocode/v1/json?key=&pretty=0&no_annotations=1&limit=1&no_record=1&q=Bonn,%20Germany
https://eu1.locationiq.com/v1/search.php?key=&limit=1&format=json&q=Bonn,%20Germany
https://maps.googleapis.com/maps/api/geocode/json?key=&address=Bonn,Germany

// TODO:
https://www.mapquestapi.com/geocoding/v1/address?key=&outFormat=json&maxResults=1&location=Bonn,Germany
`https://www.mapquestapi.com/geocoding/v1/address?key=${getSecret('api_key_mapquestapi')}&outFormat=json&maxResults=1&location=${queryString}`

*/

async function tryToGeocode(url, mapping) {
	const result = await fetch(encodeURI(url), {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'queer.qiekub.com',
			'User-Agent': 'A geocoder for queer.qiekub.com',
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
		return new Promise((resolve,reject) => {
			// &viewbox=min_lon,min_lat,max_lon,max_lat
			tryToGeocode(`https://eu1.locationiq.com/v1/search.php?key=${getSecret('locationiq_api_key')}&limit=1&format=json&q=${queryString}`, data => {
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
			.then(data=>data, error=>{
				// &proximity=51.952659,7.632473


				return tryToGeocode(`https://api.opencagedata.com/geocode/v1/json?key=${getSecret('opencagedata_api_key')}&pretty=0&no_annotations=1&limit=1&no_record=1&q=${queryString}`, data => {				
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
								boundingbox: firstResult.bounds,
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
			.then(data=>data, error=>{
				
				return tryToGeocode(`https://maps.googleapis.com/maps/api/geocode/json?key=${getSecret('googleapis_api_key')}&address=${queryString}`, data => {
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
				return tryToGeocode(`https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&extratags=0&namedetails=0&q=${queryString}`, data => {				
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