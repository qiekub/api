
const getMongoDbContext = require('../getMongoDbContext.js')

const questionsInSchema = require('../data/dist/questionsInSchema.json')
const sample_response = require('./sample_response.json')


const value_to_functions = {
	text: value => value+'',
	number: value => value*1.0,
	boolean: value => value === 'yes',
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

let key_synonyms = {
	'website': 'contact:website',
	'phone': 'contact:phone',
	'email': 'contact:email',
	'facebook': 'contact:facebook',
	'twitter': 'contact:twitter',
	'youtube': 'contact:youtube',
	'instagram': 'contact:instagram',
}
key_synonyms = {
	...key_synonyms,
	...(Object.entries(key_synonyms).reduce((key_synonyms_swapped, entry) => {
		key_synonyms_swapped[entry[1]] = entry[0]
		return key_synonyms_swapped
	}, {}))
}



async function getIdFromOSM(tags){
	const mongodb = await getMongoDbContext()

	const tagKeys = Object.keys(tags)

	let scoreStages = []


	// ## unique ids that can change very frequently but stay the same if nothing changed (unique!)
	// (score: ∞)

	if (tags.osm_id) {
		scoreStages.push({
			score: 1000, // could also be Infinity
			if: {
				$and: [
					{$eq: ["$properties.osmID", tags.osm_id]},
				],
			}
		})
	}


	// ## unique references that won't changed (unique!)
	// (score: 6)

	const refKeys = tagKeys.filter(key => (
		['wikidata','iata','icao','fhrs:id'].includes(key) ||
		key.startsWith('ref:')
	))
	if (refKeys.length > 0) {
		scoreStages.push({
			score: 6,
			if: {
				$or: refKeys.map(key => {
					return {$eq: ["$properties.tags."+key, tags[key]]}
				})
			}
		})
	}


	// ## geo information that change seldom
	// (score: 5)

	if (tags.lng && tags.lat) {
		scoreStages.push({
			score: 5,
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
			score: 5,
			if: {
				$and: addressKeys.map(key => {
					return {$eq: ["$properties.tags."+key, tags[key]]}
				})
			}
		})
	}


	// ## urls that change rarely and are mostly unique (not neccessarly unique!)
	// (score: 4)

	if (tags.wikipedia) {
		scoreStages.push({
			score: 4,
			if: {
				$and: [
					{$eq: ["$properties.tags.wikipedia", tags.wikipedia]},
				],
			}
		})
	}

	const contactKeys = tagKeys.filter(key => key.startsWith('contact:'))
	if (contactKeys.length > 0) {
		scoreStages.push({
			score: 4,
			if: {
				$or: contactKeys.map(key => {
					if (key_synonyms[key]) {
						return [
							{$eq: ["$properties.tags."+key,               tags[key]]},
							{$eq: ["$properties.tags."+key_synonyms[key], tags[key]]},
						]
					}else{
						return [
							{$eq: ["$properties.tags."+key,               tags[key]]},
						]
					}
				})
				.reduce((acc, array) => acc.concat(array), []) // TODO This should be replaced with flatMap when available.
			}
		})
	}


	// ## properties that can change but identify a place (not neccessarly unique!)
	// (score: 3)
	
	const keys_that_represent_the_name = [
		'official_name',
		'long_name',
		'name',
		'short_name',
		'alt_name',
	]
	const nameKeys = tagKeys.filter(key => (
		keys_that_represent_the_name.includes(key) ||
		keys_that_represent_the_name.some(nameKey => key.startsWith(nameKey+':'))
	))
	if (nameKeys.length > 0) {
		scoreStages.push({
			score: 3,
			if: {
				$or: nameKeys.map(key => {
					return [
						{$eq: ["$properties.tags."+key, tags[key]]},
					]
				})
				.reduce((acc, array) => acc.concat(array), []) // TODO This should be replaced with flatMap when available.
			}
		})
	}


	// ## vague properties that can eventually identify (not neccessarly unique!)
	// (score: 2)
	// TODO see notes.md in the ideas repo for infos


	// ## properties that identify a group of places (not unique but can narrow it down in combination!)
	// (score: 1)
	// TODO see notes.md in the ideas repo for infos



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
				score: {$gte:6} // 6 is the score for wikidata. Which should be an exact match. (TODO: Is this number high enough?)
			}},
			{$sort:{
				score: -1
			}},
			{$limit: 1}
		]).toArray((error,docs) => {
			if (error) {
				console.error(error)
			}

			if (error || docs.length === 0) {
				resolve(new mongodb.ObjectID())
			}else{
				resolve(docs[0]._id)
			}
		})
	})
}

async function convert_to_answers(element){

	const tags = {
		...element.tags,
		lat: element.lat,
		lng: element.lon,
		osm_id: 'node/'+element.id,
	}

	// add tag synonyms
	const tagKeys = Object.keys(tags)
	for (const tagKey of tagKeys) {
		if (key_synonyms[tagKey]) {
			tags[key_synonyms[tagKey]] = tags[tagKey]
		}
	}

	const forID = await getIdFromOSM(tags)

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

	// console.log(JSON.stringify(answerDocs,null,4))
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