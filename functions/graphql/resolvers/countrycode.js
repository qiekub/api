const secretManager = require('../../secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

const fetch = require('node-fetch')





// START country code

const synonyms = {
	'North Korea': "Korea (Democratic People's Republic of)",
	'South Korea': "Korea (Republic of)",
	'São Tome & Principe': "Sao Tome and Principe",
	'North Macedonia': "Macedonia (the former Yugoslav Republic of)", // TODO: Is this correct?
	'Democratic Republic of Congo': "Congo",
	'Cape Verde': "Cabo Verde", // TODO: Is this correct?

	// from 2019:
	'Eswatini': 'Swati', // War früher Swasiland.
	'St Kitts & Nevis': 'Saint Kitts and Nevis',
	'St Lucia': 'Saint Lucia',
	'St Vincent & the Grenadines': 'Saint Vincent and the Grenadines',
	'Palestine (1)': 'Palestine',
	'Indonesia (2)': 'Indonesia',
	'Syria': 'Syrian Arab Republic',
	'Czechia': 'Czech Republic',
	'Vatican City': 'Holy See',

	// from 2017 and 2016:
	'Gaza (in the Occupied Palestinian Territory)': null,
	'Indonesia (most)': 'Indonesia',
	'South Sumatra and Aceh Provinces (Indonesia)': null,
	'West Bank in the Occupied Palestinian Territory': null,
	'Macedonia (FYROM)': 'Macedonia (the former Yugoslav Republic of)', // TODO: Is this correct?
	'United Kingdom (and associates)': 'United Kingdom of Great Britain and Northern Ireland',
	'Cook Islands (associates to New Zealand)': 'Cook Islands',
}

const alpha3codes = require('../../data/countries/all_countries.json')
.reduce((obj,entry) => {
	obj[(entry.alpha2Code || '').toLowerCase()] = entry.alpha3Code
	obj[(entry.name || '').toLowerCase()] = entry.alpha3Code
	obj[(entry.nativeName || '').toLowerCase()] = entry.alpha3Code
	obj[(entry.demonym || '').toLowerCase()] = entry.alpha3Code

	for (const language in entry.translations) {
		obj[(entry.translations[language] || '').toLowerCase()] = entry.alpha3Code
	}
	for (const language in entry.altSpellings) {
		obj[(entry.altSpellings[language] || '').toLowerCase()] = entry.alpha3Code
	}

	return obj
}, {})

function getCountryCode(alpha2Code, countryName){
	alpha2Code = alpha2Code.trim().toLowerCase()
	countryName = countryName.trim().toLowerCase()

	if (alpha2Code === '' && countryName === '') {
		return null
	}

	if (alpha3codes[alpha2Code]) {
		return alpha3codes[alpha2Code]
	} else if (alpha3codes[countryName]) {
		return alpha3codes[countryName]
	} else if (synonyms[countryName] && alpha3codes[synonyms[countryName]]) {
		return alpha3codes[synonyms[countryName]]
	}

	return null
}

// END country code





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
	.catch(error => null)

	return new Promise(resolve => resolve(result)).then(callback)
}

module.exports = async (parent, args, context, info) => {
	// const mongodb = context.mongodb

	return new Promise(async (resolve,reject) => {
		tryToFetchJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${args.lng},${args.lat}.json?types=country&limit=1&access_token=${await getSecretAsync('api_key_mapbox')}`, data => {
			const features = data.features
			if (features && Array.isArray(features) && features.length > 0) {
				const countryCode = getCountryCode(features[0].properties.short_code, features[0].place_name)
				resolve(countryCode)
			}else{
				resolve(null)
				// throw new Error('No place found!')
			}
		})
	})
}



// module.exports = countrycode

