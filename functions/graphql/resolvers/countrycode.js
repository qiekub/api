const secretManager = require('../../secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

const fetch = require('node-fetch')

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

module.exports = async (parent, args, context, info) => {
	// const mongodb = context.mongodb

	return new Promise(async (resolve,reject) => {
		tryToFetchJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${args.lng},${args.lat}.json?types=country&limit=1&access_token=${await getSecretAsync('api_key_mapbox')}`, data => {
			const features = data.features
			if (features && Array.isArray(features) && features.length > 0) {
				resolve(features[0].properties.short_code)
			}else{
				resolve(null)
				// throw new Error('No place found!')
			}
		})
	})
}



// module.exports = countrycode

