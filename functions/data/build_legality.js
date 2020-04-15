const fs = require('fs')

const synonyms = {
	'North Korea': "Korea (Democratic People's Republic of)",
	'South Korea': "Korea (Republic of)",
	'São Tome & Principe': "Sao Tome and Principe",
	'North Macedonia': "Macedonia (the former Yugoslav Republic of)", // TODO: Is this correct?
	'Democratic Republic of Congo': "Congo",
	'Cape Verde': "Cabo Verde", // TODO: Is this correct?
}


const alpha2Codes = require('./laws_around_the_world/all_countries.json')
.reduce((obj,entry) => {
	obj[entry.name] = entry.alpha2Code
	obj[entry.nativeName] = entry.alpha2Code
	obj[entry.demonym] = entry.alpha2Code

	for (const language in entry.translations) {
		obj[entry.translations[language]] = entry.alpha2Code
	}
	for (const language in entry.altSpellings) {
		obj[entry.altSpellings[language]] = entry.alpha2Code
	}

	return obj
}, {})

function getCountryCode(countryName){
	if (alpha2Codes[countryName]) {
		return alpha2Codes[countryName]
	} else if (synonyms[countryName] && alpha2Codes[synonyms[countryName]]) {
		return alpha2Codes[synonyms[countryName]]
	}

	return countryName
}


// START get legalCountries
let legalCountries = 
fs.readFileSync('./laws_around_the_world/Same-Sex Sexual Acts Legality.csv', 'utf-8')
.replace(/\r/g, '')
.split('\n')
.slice(1, -1)
.reduce((legalCountriesTmp,orginal) => {
	const pair = orginal.split(';').map(e => e.trim())
	if (pair[1] === 'LEGAL') {
		legalCountriesTmp.push(getCountryCode(pair[0]))
	}
	return legalCountriesTmp
}, [])

legalCountries = {
	countryCodes: [... new Set(legalCountries)]
}
// END get legalCountries



const distPath = './dist/'
if (!fs.existsSync(distPath)){
	fs.mkdirSync(distPath)
}

fs.writeFileSync(distPath+'legalCountries.json', JSON.stringify(legalCountries))


