const secretManager = require('../secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

const fetch = require('node-fetch')

const legalCountries = require('../data/dist/legalCountries.json')
const countryCodes = legalCountries.countryCodes

async function tryToFetchJson(url, callback) {
	const result = await fetch(encodeURI(url), {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'qiekub.org',
			'User-Agent': 'A geocoder for qiekub.org',
		},
	})
	.then(res => res.json())
	// .then(data => {
	// 	console.log(data)
	// 	return data
	// })
	.catch(error => null)

	return new Promise(resolve => resolve(result)).then(callback)
}

async function isGeoCoordinateLegalPromise(lng,lat){
	return tryToFetchJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&limit=1&access_token=${await getSecretAsync('api_key_mapbox')}`, data => {
		const features = data.features
		if (features && Array.isArray(features) && features.length > 0) {
			const short_code = features[0].properties.short_code
			return countryCodes.includes(short_code)
		}else{
			return false
			// throw new Error('No place found!')
		}
	})
}



module.exports = isGeoCoordinateLegalPromise

