const fs = require('fs')
const levenshtein = require('js-levenshtein')

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




let countryNames = new Set()

const alpha2Codes = require('./laws_around_the_world/all_countries.json')
.reduce((obj,entry) => {
	obj[entry.name] = entry.alpha2Code
	obj[entry.nativeName] = entry.alpha2Code
	obj[entry.demonym] = entry.alpha2Code
	
	countryNames.add(entry.name)
	countryNames.add(entry.nativeName)
	// countryNames.add(entry.demonym)

	for (const language in entry.translations) {
		obj[entry.translations[language]] = entry.alpha2Code
		countryNames.add(entry.translations[language])
	}
	for (const language in entry.altSpellings) {
		obj[entry.altSpellings[language]] = entry.alpha2Code
		countryNames.add(entry.altSpellings[language])
	}

	return obj
}, {})

countryNames = [...countryNames].filter(name => !!name)

function getBestFittingName(countryName){
	const tmp_countryNames = countryNames.map(name => {
		return {
			name: name,
			countryName: countryName,
			score: levenshtein(name, countryName),
		}
	})
	// .filter(entry => entry.score < 5)
	.sort((a,b) => a.score - b.score)

	console.log(JSON.stringify(tmp_countryNames.slice(0,3),null,'\t'))

	if (!!tmp_countryNames[0]) {
		return tmp_countryNames[0].name
	}

	return countryName
}

function getCountryCode(countryName){
	if (alpha2Codes[countryName]) {
		return alpha2Codes[countryName]
	}else{
		countryName = getBestFittingName(countryName)
		if (alpha2Codes[countryName]) {
			return alpha2Codes[countryName]
		}
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

legalCountries = {
	legalCountries: [... new Set(legalCountries)],
}
// END get legalCountries



const distPath = './dist/'
if (!fs.existsSync(distPath)){
	fs.mkdirSync(distPath)
}

fs.writeFileSync(distPath+'legalCountries.json', JSON.stringify(legalCountries,null,'\t'))


// console.log(JSON.stringify(legalCountries, null, 4))


const all_countries_formated = require('./laws_around_the_world/all_countries.json')
fs.writeFileSync(distPath+'all_countries_formated.json', JSON.stringify(all_countries_formated,null,'\t'))



