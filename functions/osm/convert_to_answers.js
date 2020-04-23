
const getMongoDbContext = require('../getMongoDbContext.js')

const questionsInSchema = require('../data/dist/questionsInSchema.json')
const sample_response = require('./sample_response.json')


const value_to_functions = {
	text: value => value+'',
	number: value => value*1.0,
	boolean: value => value === 'yes',
	// url: value => value+'',
}
function value2(inputtype, value) {
	if (value_to_functions[inputtype]) {
		return value_to_functions[inputtype](value)
	}
	return undefined
}

const answersByTag = questionsInSchema.reduce((answersByTag,q) => {
	for (const a of q.properties.possibleAnswers) {
		if (a.inputtype !== 'boolean') { // cause inputtype for booleans is currently ugly
			for (const tagName in a.tags) {
				if (!(!!answersByTag[tagName])) {
					answersByTag[tagName] = []
				}
				answersByTag[tagName].push({
					_id: q._id,
					key: a.key,
					inputtype: a.inputtype,
				})
			}
		}
	}

	return answersByTag
},{})

// console.log(JSON.stringify(answersByTag,null,4))

async function getIdFromOSM(tags){
	const mongodb = await getMongoDbContext()

	const tagKeys = Object.keys(tags)

	let scoreStages = []

	if (tags.osm_id) {
		scoreStages.push({
			score: Infinity,
			if: {
				$and: [
					{$eq: ["$properties.osmID", 'node/'+osm_id]},
				],
			}
		})
	}

	if (tags.lng && tags.lat) {
		scoreStages.push({
			score: 1,
			if: {
				$and: [
					{$gt: ["$properties.geometry.location.lng", tags.lng - 0.00001]},
					{$lt: ["$properties.geometry.location.lng", tags.lng + 0.00001]},
					{$gt: ["$properties.geometry.location.lat", tags.lat - 0.00001]},
					{$lt: ["$properties.geometry.location.lat", tags.lat + 0.00001]},
				],
			}
		})
	}

	const addressKeys = tagKeys.filter(key => key.startsWith('addr:'))
	if (addressKeys.length > 0) {
		scoreStages.push({
			score: 1,
			if: {
				$and: addressKeys.map(key => {
					return {$eq: ["$properties.tags."+key, tags[key]]}
				})
			}
		})
	}

	// wrap the stages in some mongodb stuff:
	scoreStages = scoreStages.map(scoreStage => {
		return {$addFields:{
	        score: {
	            $add: [
	                "$score",
	                {$cond:{
	                    if: scoreStage.if,
	                    then: scoreStage.score,
	                    else: 0
	                }}
	            ]
	        }
	    }}
	})

	return new Promise( (resolve,reject) => {
		// CompiledPlaces_collection
		mongodb.OsmCache_collection.aggregate([
			{$addFields:{score:0}},
			...scoreStages,
			{$match:{
				score: {$gt:0}
			}},
			{$sort:{
				score: -1
			}}
		]).toArray((error,docs) => {
			if (error || docs.length === 0) {
				resolve(docs[0]._id)
			}else{
				console.log('docs', JSON.stringify(docs, null,4))
				resolve(new mongodb.ObjectID())
			}
		})
	})
}

async function convert_to_answers(element){

	const forID = await getIdFromOSM({
		...element.tags,
		lat: element.lat,
		lng: element.lon,
	})

	console.log('forID', forID)

function convert_to_answers(element){
	const answerDocs = Object.entries(element.tags)
	.filter(entry => answersByTag[entry[0]])
	.reduce((answerDocs,entry) => {
		const answers = answersByTag[entry[0]]
		.map(answer => {
			answer.value = value2(answer.inputtype, entry[1])
			return answer
		})
		.filter(answer => answer.value)

		for (const answer of answers) {
			answerDocs.push({
				__typename: 'Answer',
				forID: null,
				questionID: answer._id,
				answer: {
					[answer.key]: answer.value
				},
			})
		}

		return answerDocs
	}, [])

	console.log(JSON.stringify(answerDocs,null,4))
}

convert_to_answers(sample_response.elements[0])

/*

{
    "_id" : ObjectId("5e9dff852ceb4e19a35dcdc0"),
    "__typename" : "Doc",
    "properties" : {
        "forID" : ObjectId("5e9dff772ceb4e19a35dcdbb"),
        "questionID" : "website",
        "answer" : {
            "url" : "test.test"
        },
        "__typename" : "Answer"
    },
    "metadata" : {
        "created" : ISODate("2020-04-20T20:01:09.605Z"),
        "lastModified" : ISODate("2020-04-20T20:01:09.605Z"),
        "__typename" : "Metadata"
    }
}

*/
