const fs = require('fs')

/*
const files = fs.readdirSync('./questions/')
const questions = {}
for (const filename of files) {
	const questionKey = filename.split('.')[0]
	let text = fs.readFileSync('./questions/'+filename, 'utf-8')
	questions[questionKey] = YAML.parse(text)
}

const expandTranslations = obj => Object.entries(obj).map(entry => ({text:entry[1],language:entry[0]}))

const questionsInSchema = Object.entries(questions).map(entry => {
	let properties = {
		...entry[1],
		__typename: 'Question',
	}

	properties.question = expandTranslations(properties.question)
	properties.possibleAnswers = Object.entries(properties.possibleAnswers).map(entry => {
		return {
			...entry[1],
			__typename: 'Answer',
			key: entry[0],
			title: expandTranslations(entry[1].title || {}),
			description: expandTranslations(entry[1].description || {}),
			followUpQuestionIDs: entry[1].followUpQuestions,
		}
	})

	return {
		_id: entry[0],
		__typename: 'Doc',
		properties,
	}
})

const distPath = './dist/'
if (!fs.existsSync(distPath)){
	fs.mkdirSync(distPath)
}

// fs.writeFileSync(distPath+'questions.json', JSON.stringify(questions,null,4))
fs.writeFileSync(distPath+'questionsInSchema.json', JSON.stringify(questionsInSchema,null,'\t'))

*/


const synonyms = {
	// TODO: are these all correct?
	'North Korea': "Korea (Democratic People's Republic of)",
	'South Korea': "Korea (Republic of)",
	'São Tome & Principe': "Sao Tome and Principe",
	'North Macedonia': "Macedonia (the former Yugoslav Republic of)",
	'Democratic Republic of Congo': "Congo",
	'Cape Verde': "Cabo Verde",
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
// .slice(0, 5)
.reduce((legalCountriesTmp,orginal) => {
	const pair = orginal.split(';').map(e => e.trim())
	if (pair[1] === 'LEGAL') {
		legalCountriesTmp.push(getCountryCode(pair[0]))
	}
	return legalCountriesTmp
}, [])

legalCountries = [... new Set(legalCountries)].join(' ')
// END get legalCountries



const distPath = './dist/'
if (!fs.existsSync(distPath)){
	fs.mkdirSync(distPath)
}

fs.writeFileSync(distPath+'legalCountries.text', legalCountries)


// console.log(JSON.stringify(legalCountries, null, 4))


const all_countries_formated = require('./laws_around_the_world/all_countries.json')
fs.writeFileSync(distPath+'all_countries_formated.json', JSON.stringify(all_countries_formated,null,'\t'))



