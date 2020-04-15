// const {upsertOne} = require('../../modules.js')

// const flatten = require('flat')
// also look at https://jsperf.com/flatten-un-flatten/16
// and at https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects

function addAnswer(mongodb, properties, resolve, reject){
	mongodb.Answers_collection.insertOne({
		__typename: 'Doc',
		properties: {
			...properties,
			__typename: 'Answer',
		},
		metadata: {
			created: new Date(),
			lastModified: new Date(),
			__typename: 'Metadata',
		},
	}).then(result => {
		// calc new Place doc
		resolve(result.insertedId || null)
	}).catch(reject)
}

const string2objectID = (mongodb,string) => (mongodb.ObjectID.isValid(string) ? new mongodb.ObjectID(string) : undefined)

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		const forID = string2objectID(mongodb,args.properties.forID)
		const questionID = args.properties.questionID // string2objectID(mongodb,args.properties.questionID)
		const answer = args.properties.answer

		if (
			!!forID &&
			!!questionID &&
			!!answer && Object.keys(answer).length > 0
		) {
			if (answer !== 'skipped') {
				addAnswer(mongodb, {
					forID,
					questionID,
					answer,
				}, resolve, reject)
			}else{
				resolve(null) // skipped
			}
		}else{
			reject(`The variables aren't okay`)
		}
	})
}