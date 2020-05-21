const fs = require('fs')
const YAML = require('yaml')


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

	properties.question = expandTranslations(properties.question || {})
	properties.in_one_word = expandTranslations(properties.in_one_word || {})
	properties.description = expandTranslations(properties.description || {})
	properties.possibleAnswers = Object.entries(properties.possibleAnswers || []).map(entry => {
		return {
			...entry[1],
			__typename: 'Answer',
			key: entry[0],
			title: expandTranslations(entry[1].title || {}),
			description: expandTranslations(entry[1].description || {}),
			followUpQuestionIDs: entry[1].followUpQuestions || [],
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

// fs.writeFileSync(distPath+'questions.json', JSON.stringify(questions))
fs.writeFileSync(distPath+'questionsInSchema.json', JSON.stringify(questionsInSchema))


