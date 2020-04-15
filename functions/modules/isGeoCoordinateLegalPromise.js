const secretManager = require('./secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

const fetch = require('node-fetch')

const legalCountries = require('./data/dist/legalCountries.json')
const countryCodes = legalCountries.countryCodes

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

function isGeoCoordinateLegalPromise(lat,lng){
	return tryToFetchJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${args.lng},${args.lat}.json?types=country&limit=1&access_token=${await getSecretAsync('api_key_mapbox')}`, data => {
		const features = data.features
		if (features && Array.isArray(features) && features.length > 0) {
			const short_code = features[0].properties.short_code
			return countryCodes.includes(short_code)
		}else{
			throw new Error('No place found!')
		}
	})
}



module.exports = {
	isGeoCoordinateLegalPromise,
}

