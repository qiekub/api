const flatten = require('flat')
const async = require('async')

const isGeoCoordinateLegalPromise = require('./modules/isGeoCoordinateLegalPromise.js')

const questionsInSchema = require('./data/dist/questionsInSchema.json')
const questionsInSchemaById = questionsInSchema.reduce((obj,question)=>{
	obj[question._id] = question
	return obj
}, {})

const _presets_ = require('./data/dist/presets.json')

const getMongoDbContext = require('./getMongoDbContext.js')
const secretManager = require('./secretManager.js')
const getSecretAsync = secretManager.getSecretAsync
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)



function ObjectFromEntries(entries) {
	// Should be replaced with Object.fromEntries() when available
	const obj = {}
	for (const entry of entries) {
		obj[entry[0]] = entry[1]
	}
	return obj
}

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
		if (!!result.insertedId) {
			resolve(result.insertedId)
		}else{
			reject(null)
		}
	}).catch(error=>{
		console.error(error)
	})
}

function addChangeset(mongodb, properties, resolve, reject){
	mongodb.Changesets_collection.insertOne({
		__typename: 'Doc',
		properties: {
			...properties,
			__typename: 'Changeset',
		},
		metadata: {
			created: new Date(),
			lastModified: new Date(),
			__typename: 'Metadata',
		},
	}).then(result => {
		if (!!result.insertedId) {
			resolve(result.insertedId)
		}else{
			reject(null)
		}
	}).catch(error=>{
		console.error(error)
	})
}

function upsertOne(collection,doc,callack){
	if (doc && doc.properties && doc.properties.__typename) {
		collection.findOne({
			_id: doc._id,
			'properties.__typename': doc.properties.__typename,
		}).then(result => {
			if (result === null) {
				collection.insertOne({
					...doc,
					metadata: {
						created: new Date,
						lastModified: new Date,
						__typename: 'Metadata',
					},
				}).then(result => {
					callack(result.insertedId || null)
				}).catch(error=>{
					console.error(error)
					callack(null)
				})
			}else{
				const flattendProperties = Object.entries(flatten(doc.properties,{safe:1})).map(v=>['properties.'+v[0],v[1]])
			
				const toSet = flattendProperties.filter(entry=>entry[1]!==null)
				const toUnset = flattendProperties.filter(entry=>entry[1]===null)
			
				const operations = {
					// $currentDate: {
					// 	'metadata.lastModified': true,
					// },
					// $setOnInsert: {
					// 	metadata: {
					// 		created: new Date(),
					// 		lastModified: new Date(),
					// 		__typename: 'Metadata',
					// 	},
					// },
				}
				if (toSet.length > 0) {
					toSet.push(['metadata.lastModified',new Date()])
					operations.$set = ObjectFromEntries(toSet)
				}
				if (toUnset.length > 0) {
					operations.$unset = ObjectFromEntries(toUnset)
				}

				collection.updateOne({
					_id: doc._id,
					'properties.__typename': doc.properties.__typename,
				}, operations).then(result => {
					callack(result.upsertedId || doc._id || null)
				}).catch(error=>{
					console.error(error)
					callack(null)
				})
			}
		}).catch(error=>{
			console.error(error)
			callack(null)
		})

		// collection.updateOne({
		// 	_id: doc._id || undefined,
		// 	'properties.__typename': doc.properties.__typename,
		// }, operations, {upsert:true}).then(result => {
		// 	callack(result.upsertedId || doc._id || false)
		// }).catch(error=>{
		// 	console.error('error', error)
		// 	callack(false)
		// })
	}else{
		callack(null)
	}
}


/*
function OLD_compileAnswers(mongodb, placeID, callback){
	const __last_n_answers__ = 5
	mongodb.Answers_collection.aggregate([
		// START get answers
		...(!!placeID ? [{$match:{
			"properties.forID": placeID,
		}}] : []),

		{$sort:{
			"metadata.lastModified": -1
		}},
		{$set:{
			"properties.answer": { $objectToArray: "$properties.answer" },
		}},
		{$unwind: "$properties.answer"},
		{$group:{
			_id: {$concat:[
				{$toString:"$properties.forID"},
				"_",
				{$toString:"$properties.questionID"},
				"_",
				{$toString:"$properties.answer.k"},
			]},
			docs: {$push:"$$ROOT"},
		}},
		{$set:{
			docs: {$slice:["$docs",0,__last_n_answers__]}
		}},
		{$set:{
			all_answers_count: {$size:"$docs"}
		}},
		{$unwind:"$docs"},
		// END get answers
		
		
		// START group answers
		{$set:{
			"_id": "$docs._id",
			"forID": "$docs.properties.forID",
			"questionID": "$docs.properties.questionID",
			"answer": "$docs.properties.answer",
		}},
		{$set:{
			 "value_as_string": {$switch:{
				branches: [
					{case: {$eq:[{$type:"$answer.v"},"string"]}, then: "$answer.v"},
				],
				default: "$_id"
			 }},
		}},
		{$group: {
			_id: {$concat:[
				{$toString:"$forID"},
				"_",
				{$toString:"$questionID"},
				"_",
				{$toString:"$answer.k"},
				"_",
				{$toString:"$value_as_string"},
			]},
			
			forID: { $first: "$forID" },
			questionID: { $first: "$questionID" },
			answer: { $first: "$answer" },
			// value_as_string: { $first: "$value_as_string" },
			
			all_answers_count: { $first: "$all_answers_count" },
			this_answer_count: { $sum: 1 },
		}},
		{$sort:{
			all_answers_count: -1,
			this_answer_count: -1,
			_id: 1,
		}},
		{$group: {
			_id: {$concat:[
				{$toString:"$forID"},
				"_",
				{$toString:"$questionID"},
				"_",
				{$toString:"$answer.k"},
			]},
			
			forID: { $first: "$forID" },
			questionID: { $first: "$questionID" },
			answer: { $first: "$answer" },
			// value_as_string: { $first: "$value_as_string" },
			
			all_answers_count: { $first: "$all_answers_count" },
			this_answer_count: { $first: "$this_answer_count" },
		}},
		{$set:{
			confidence: {$divide:["$this_answer_count",{$max:[__last_n_answers__,"$all_answers_count"]}]}
		}},
		// END group answers
		
		
		// START compile tags
		{$lookup:{
			from: "Questions",
			localField: "questionID",
			foreignField: "_id",
			as: "question_doc"
		}},
		{$set:{
			question_doc: {$arrayElemAt:["$question_doc",0]}
		}},
		{$set:{
			// question_doc: null,
			tags: {$arrayElemAt:[{ "$setDifference": [
				{ "$map": {
					"input": "$question_doc.properties.possibleAnswers",
					"as": "a",
					"in": { "$cond": {
						if: {$eq:["$$a.key","$answer.k"]},
						then: { "$cond": {
							if: {$eq:["$answer.v",true]},
							then: "$$a.tags",
							else: {$arrayToObject:{$map:{
								input: {$objectToArray:"$$a.tags"},
								as: "a",
								in: {k:"$$a.k",v: {$switch:{
										branches: [
											{case: {$and:[
												{$eq:[{$type:"$answer.v"},"bool"]},
												{$eq:["$answer.v",true]},
											]}, then: "$$a.tags"},
	
											{case: {$eq:[{$type:"$answer.v"},"double"]}, then: "$answer.v"},
											{case: {$eq:[{$type:"$answer.v"},"string"]}, then: "$answer.v"},
											{case: {$eq:[{$type:"$answer.v"},"int"]}, then: "$answer.v"},
											{case: {$eq:[{$type:"$answer.v"},"long"]}, then: "$answer.v"},
	
											// {case: {$eq:[{$type:"$answer.v"},"object"]}, then: {
											//     $arrayToObject:{$map:{
											//         input: {$objectToArray:"$$a.tags"},
											//         as: "a",
											//         in: {k:"$$a.k",v:"$$a.v"}
											//     }}}
											// },
										],
										default: false
									}},
							   }
							}}},
						}},
						else: false
					 }}
				}},
				[false]
			]},0]},
		}},
		
		{$project:{
			question_doc: false
		}},
		// END compile tags
		
		
		// START seperate confidences
		{$set:{
			confidences: {$arrayToObject:{$map:{
				input: {$objectToArray:"$tags"},
				as: "a",
				in: {k:"$$a.k",v:"$confidence"}
			}}},
		}},
		// END seperate confidences
		
		
		// START combine tags by forID
		{$sort:{
			confidence: 1,
			_id: 1,
		}},
		{$group:{
			_id: "$forID",
			tags: {$mergeObjects:"$tags"},
			confidences: {$mergeObjects:"$confidences"},
		}},
		// END combine tags by forID
		
		// START for the eye
		{$sort:{
			_id: 1
		}},
	]).toArray(callback)
}
*/

function filterOutliers(numbers){
	// https://clevercalcul.wordpress.com/2016/02/16/wie-du-ausreisser-in-deiner-datenreihe-findest/
	// https://anleitung-tipps.anleiter.de/wie-berechnet-man-quartile/

	numbers.sort((a,b) => a-b)
	
	const terciles_1_pos = Math.round(0.333*(numbers.length+1)) // terciles to have more room at the edges
	const terciles_2_pos = Math.floor(0.666*(numbers.length+1))
	const quartil_abstand = numbers[terciles_2_pos] - numbers[terciles_1_pos]
	const antenne_min = numbers[terciles_1_pos] - quartil_abstand
	const antenne_max = numbers[terciles_2_pos] + quartil_abstand

	return numbers.filter(number => number >= antenne_min && number <= antenne_max)
}

function compileAnswers(mongodb, placeIDs, callback){


	const __last_n_answers__ = 5
	mongodb.Answers_collection
	.aggregate([
		// START get answers
		...(!!placeIDs ? [{$match:{
			"properties.forID": {$in: placeIDs},
			// "properties.questionID": "geo_pos",
		}}] : []),

		{$sort:{
			"metadata.lastModified": -1
		}},
		{$set:{
			"properties.answer": { $objectToArray: "$properties.answer" },
		}},
		{$unwind: "$properties.answer"},
		{$group:{
			_id: {$concat:[
				{$toString:"$properties.forID"},
				"_",
				{$toString:"$properties.questionID"},
				"_",
				{$toString:"$properties.answer.k"},
			]},
			docs: {$push:"$$ROOT"},
		}},
		{$set:{
			docs: {$slice:["$docs",0,__last_n_answers__]}
		}},
		{$set:{
			all_answers_count: {$size:"$docs"}
		}},
		{$unwind:"$docs"},
		// END get answers
	])
	.toArray((error,docs)=>{

		docs = docs
		.map(doc => {
			const newDoc = {
				forID: doc.docs.properties.forID,
				questionID: doc.docs.properties.questionID,
				// answerID: doc.docs._id,
				// answer: doc.docs.properties.answer,
				all_answers_count: doc.all_answers_count,

				answerKey: doc.docs.properties.answer.k,
				answerValue: doc.docs.properties.answer.v,
			}
			newDoc.key_id = newDoc.forID+'|'+newDoc.questionID+'|'+newDoc.answerKey
			const answerValueAsJSON = JSON.stringify(newDoc.answerValue)
			newDoc.value_id = newDoc.key_id+'|'+answerValueAsJSON

			return newDoc
		})
		// .filter(doc => doc.questionID === 'age')

		const answerCountsByValue = docs
		.reduce((obj,doc)=>{
			if (!obj[doc.value_id]) {
				obj[doc.value_id] = 0
			}
			obj[doc.value_id] += 1
			return obj
		}, {})

		docs = docs
		.map(doc => {
			doc.confidence = answerCountsByValue[doc.value_id] / Math.max(__last_n_answers__, doc.all_answers_count)
			delete doc.all_answers_count
			delete doc.value_id
			return doc
		})
		.sort((a,b) => b.confidence - a.confidence)
		.reduce((obj,doc)=>{
			if (
				!isNaN(doc.answerValue)
				&& typeof doc.answerValue !== 'boolean'
				&& (doc.answerKey === 'lat' || doc.answerKey === 'lng')
			) {
				if (!obj[doc.key_id]) {
					obj[doc.key_id] = {
						doc,
						values: [],
					}
				}
				obj[doc.key_id].values.push(doc.answerValue*1)
			}else if (!obj[doc.key_id]) {
				obj[doc.key_id] = {
					doc,
					values: [doc.answerValue],
				}
			}
		
			return obj
		},{})

		// merge lat and lng values
		const shiftBy = 180 // Use a higher number than 180 when accepting number other than geo-lat-lng (eg.: 10000)
		docs = Object.keys(docs)
		.reduce((obj,key_id) => {
			obj[key_id] = docs[key_id].doc
			delete obj[key_id].key_id

			let this_values = docs[key_id].values
			if (this_values.length > 1) {
				this_values = filterOutliers(this_values)
				
				// // geometric-mean:
				// const value = this_values.reduce((n,v)=>n*(shiftBy+v),1)
				// const new_value = (value ** (1/this_values.length)) - shiftBy
				
				// average:
				const value = this_values.reduce((n,v)=>n+v,0)
				const new_value = (value / this_values.length)

				obj[key_id].answerValue = Number.parseFloat(new_value.toFixed(6)) // https://gis.stackexchange.com/questions/8650/measuring-accuracy-of-latitude-and-longitude
			}else{
			 	obj[key_id].answerValue = this_values[0]
			}
			return obj
		}, {})
		
		docs = Object.values(docs)
		.map(doc=>{
			const question_doc = questionsInSchemaById[doc.questionID]

			if (!!question_doc && !!question_doc.properties && !!question_doc.properties.possibleAnswers) {
				doc.tags = question_doc.properties.possibleAnswers.reduce((obj,answer) => {
					if (
						typeof answer.tags === "object"
						&& answer.key === doc.answerKey
						&& Object.keys(answer.tags).length > 0
					) {
						if (typeof doc.answerValue === "boolean") {
							if (doc.answerValue === true) {
								obj = { ...obj, ...answer.tags }
							}
						// } else if (typeof doc.answerValue === "object") {
						// 	for (const key in answer.tags) {
						// 		if (doc.answerValue[key]) {
						// 			obj[key] = doc.answerValue[key]
						// 		}
						// 	}
						} else {
							for (const key in answer.tags) {
								obj[key] = doc.answerValue
							}
						}

						// add tags from the preset:
						if (obj.preset && typeof obj.preset === 'string' && _presets_[obj.preset] && _presets_[obj.preset].tags) {
							obj = {
								..._presets_[obj.preset].tags,
								...obj,
							}
						}
					}
					return obj
				},{})

				if (Object.keys(doc.tags).length > 0) {
					doc.confidences = Object.keys(doc.tags).reduce((obj,tag) => {
						obj[tag] = doc.confidence
						return obj
					}, {})
	
					return doc
				}
			}

			return false
		})
		.filter(doc => doc)
		.reduce((obj,doc) => {
			if (!obj[doc.forID]) {
				obj[doc.forID] = {
					__typename: 'Doc',
					_id: doc.forID,
					properties: {
						__typename: 'Place',
						tags: {},
						confidences: {},
					}
				}
			}

			obj[doc.forID].properties.tags = {
				...obj[doc.forID].properties.tags,
				...doc.tags,
			}

			obj[doc.forID].properties.confidences = {
				...obj[doc.forID].properties.confidences,
				...doc.confidences,
			}

			return obj
		}, {})

		docs = Object.values(docs)
		.map(doc => {
			// add geometry

			doc.properties.name = []
			if (doc.properties.tags.name) {
				doc.properties.name.push({
					__typename: 'Text',
					language: null,
					text: doc.properties.tags.name,
				})
			}
			if (doc.properties.tags.name_en) {
				doc.properties.name.push({
					__typename: 'Text',
					language: 'en',
					text: doc.properties.tags.name_en,
				})
			}

			doc.properties.geometry = {
				__typename: 'GeoData',
			}
			if (doc.properties.tags.lat && doc.properties.tags.lng) {
				doc.properties.geometry.location = {
					__typename: 'GeoCoordinate',
					lat: doc.properties.tags.lat,
					lng: doc.properties.tags.lng,
				}
			}
			return doc
		})

		callback(null,docs)
	})
}

/*
function OLD_compile_places_from_changesets(mongodb, placeIDs, callback){
	// TODO: This can probably be improved as it's just a modified copy of compileAnswers().

	const __last_n_answers__ = 5
	mongodb.Changesets_collection
	.aggregate([
		// START get answers
		...(!!placeIDs ? [{$match:{
			"properties.forID": {$in: placeIDs},
		}}] : []),


		{$sort:{
			"metadata.lastModified": -1
		}},
		{$set:{
			"properties.answer": { $objectToArray: "$properties.tags" },
		}},
		{$unset:[ "properties.tags" ]},


		// restrict to the latest answer per antiSpamUserIdentifier (and place and key).
		{$unwind: "$properties.answer"},
		{$group:{
			_id: {$concat:[
				{$toString:"$properties.antiSpamUserIdentifier"},
				"_",
				{$toString:"$properties.forID"},
				"_",
				{$toString:"$properties.answer.k"},
			]},
			doc: {$first:"$$ROOT"},
		}},
		{$replaceRoot:{newRoot:"$doc"}},


		// restrict to the latest 5 (__last_n_answers__) answers per place and key.
		{$unwind: "$properties.answer"},
		{$group:{
			_id: {$concat:[
				{$toString:"$properties.forID"},
				"_",
				// {$toString:"$properties.questionID"},
				// "_",
				{$toString:"$properties.answer.k"},
			]},
			docs: {$push:"$$ROOT"},
		}},
		{$set:{
			docs: {$slice:["$docs",0,__last_n_answers__]}
		}},


		{$set:{
			all_answers_count: {$size:"$docs"}
		}},
		{$unwind:"$docs"},
		// END get answers
	])
	.toArray((error,docs)=>{

		docs = docs
		.map(doc => {
			const newDoc = {
				forID: doc.docs.properties.forID,
				// answerID: doc.docs._id,
				// answer: doc.docs.properties.answer,
				all_answers_count: doc.all_answers_count,

				answerKey: doc.docs.properties.answer.k,
				answerValue: doc.docs.properties.answer.v,

				// source: {
				// 	sources: doc.docs.properties.sources,
				// 	fromBot: doc.docs.properties.fromBot,
				// 	dataset: doc.docs.properties.dataset,
				// },
				changesetID: doc.docs._id,
			}
			newDoc.key_id = newDoc.forID+'|'+newDoc.answerKey
			const answerValueAsJSON = JSON.stringify(newDoc.answerValue)
			newDoc.value_id = newDoc.key_id+'|'+answerValueAsJSON

			return newDoc
		})


		const answerCountsByValue = docs
		.reduce((obj,doc)=>{
			if (!obj[doc.value_id]) {
				obj[doc.value_id] = 0
			}
			obj[doc.value_id] += 1
			return obj
		}, {})


		docs = docs
		.map(doc => {

			doc.confidence = answerCountsByValue[doc.value_id] / Math.max(__last_n_answers__, doc.all_answers_count)
			delete doc.all_answers_count
			delete doc.value_id
			return doc
		})
		.sort((a,b) => b.confidence - a.confidence)
		.reduce((obj,doc)=>{
			if (!obj[doc.key_id]) {
				obj[doc.key_id] = {
					...doc,
					values: [],
					changesetIDs: [],
				}
			}

			if (
				!isNaN(doc.answerValue)
				&& typeof doc.answerValue !== 'boolean'
				&& (doc.answerKey === 'lat' || doc.answerKey === 'lng')
			) {
				obj[doc.key_id].values.push(doc.answerValue*1)

				if (!!doc.changesetID && doc.changesetID !== '') {
					obj[doc.key_id].changesetIDs.push(doc.changesetID)
				}
			}else if (obj[doc.key_id].values.length === 0) { // only use the first value
				obj[doc.key_id].values.push(doc.answerValue)

				if (!!doc.changesetID && doc.changesetID !== '') {
					obj[doc.key_id].changesetIDs.push(doc.changesetID)
				}
			}

			return obj
		},{})


		// merge lat and lng values
		const shiftBy = 180 // Use a higher number than 180 when accepting number other than geo-lat-lng (eg.: 10000)
		docs = Object.keys(docs)
		.reduce((obj,key_id) => {
			obj[key_id] = docs[key_id]
			delete obj[key_id].key_id

			let this_values = docs[key_id].values
			if (this_values.length > 1) {
				this_values = filterOutliers(this_values)
				
				// // geometric-mean:
				// const value = this_values.reduce((n,v)=>n*(shiftBy+v),1)
				// const new_value = (value ** (1/this_values.length)) - shiftBy
				
				// average:
				const value = this_values.reduce((n,v)=>n+v,0)
				const new_value = (value / this_values.length)

				obj[key_id].answerValue = Number.parseFloat(new_value.toFixed(6)) // https://gis.stackexchange.com/questions/8650/measuring-accuracy-of-latitude-and-longitude
			}else{
			 	obj[key_id].answerValue = this_values[0]
			}
			return obj
		}, {})

		
		docs = Object.values(docs)
		.reduce((obj,doc) => {
			if (!obj[doc.forID]) {
				obj[doc.forID] = {
					__typename: 'Doc',
					_id: doc.forID,
					properties: {
						__typename: 'Place',
						tags: {},
						confidences: {},
						changesetIDs: {},
					}
				}
			}

			obj[doc.forID].properties.tags[doc.answerKey] = doc.answerValue
			obj[doc.forID].properties.confidences[doc.answerKey] = doc.confidence
			obj[doc.forID].properties.changesetIDs[doc.answerKey] = doc.changesetIDs

			return obj
		}, {})

		docs = Object.values(docs)
		.map(doc => {
			// add geometry

			doc.properties.name = []
			if (doc.properties.tags.name) {
				doc.properties.name.push({
					__typename: 'Text',
					language: null,
					text: doc.properties.tags.name,
				})
			}
			if (doc.properties.tags['name:en']) {
				doc.properties.name.push({
					__typename: 'Text',
					language: 'en',
					text: doc.properties.tags['name:en'],
				})
			}

			doc.properties.geometry = {
				__typename: 'GeoData',
			}
			if (doc.properties.tags.lat && doc.properties.tags.lng) {
				doc.properties.geometry.location = {
					__typename: 'GeoCoordinate',
					lat: doc.properties.tags.lat,
					lng: doc.properties.tags.lng,
				}
			}
			return doc
		})

		callback(null,docs)
	})
}
*/

function compile_places_from_changesets(mongodb, placeIDs, callback){
	// TODO: This can probably be improved as it's just a modified copy of compileAnswers().

	mongodb.Changesets_collection
	.aggregate([
		...(
			!!placeIDs
			? [{$match:{
				"properties.forID": {$in: placeIDs},
			}}]
			: []
		),


		// START filter for only approved changesets
		{$lookup:{
			from: "Edges",
			localField: "_id",
			foreignField: "properties.toID",
			as: "edges",
		}},
		{$unwind:{
			path: "$edges",
			preserveNullAndEmptyArrays: false,
		}},
		{$match:{
			"edges.properties.edgeType": "approved",
		}},
		{$group: {
			_id: "$_id",
			doc: {$first: "$$ROOT"},
		}},
		{$replaceRoot:{
			newRoot: "$doc"
		}},
		{$unset: "edges"},
		// END filter for only approved changesets


		{$set:{
			"properties.answer": { $objectToArray: "$properties.tags" },
		}},
		{$unset:[ "properties.tags" ]},


		// START restrict to the latest answer per antiSpamUserIdentifier (and place and key).
		{$unwind: "$properties.answer"},
		{$sort:{
			"metadata.lastModified": -1,
			"metadata.created": -1,
			"_id": -1,
			"properties.answer.k": -1,
			"properties.answer.v": -1,
		}},
		{$group:{
			_id: {$concat:[
				{$toString:"$properties.antiSpamUserIdentifier"},
				"_",
				{$toString:"$properties.forID"},
				"_",
				{$toString:"$properties.answer.k"},
			]},
			doc: {$first:"$$ROOT"},
		}},
		{$replaceRoot:{newRoot:"$doc"}},
		// END restrict to the latest answer per antiSpamUserIdentifier (and place and key).


		// START restrict to the latest answer
		{$unwind: "$properties.answer"},
		{$sort:{
			"metadata.lastModified": -1,
			"metadata.created": -1,
			"_id": -1,
			"properties.answer.k": -1,
			"properties.answer.v": -1,
		}},
		{$group:{
			_id: {$concat:[
				{$toString:"$properties.forID"},
				"_",
				// {$toString:"$properties.questionID"},
				// "_",
				{$toString:"$properties.answer.k"},
			]},
			doc: {$first:"$$ROOT"},
		}},
		// END restrict to the latest answer


		{$project:{
			forID: '$doc.properties.forID',
			answerKey: '$doc.properties.answer.k',
			answerValue: '$doc.properties.answer.v',
			// changesetID: '$doc._id',
		}},
	])
	.toArray((error,docs)=>{

		docs = docs
		.reduce((obj,doc)=>{
			const placeID = doc.forID
			const key = doc.answerKey
			const value = doc.answerValue

			if (!obj[placeID]) {
				obj[placeID] = {
					_id: placeID,
					__typename: 'Doc',
					properties: {
						__typename: 'Place',
						tags: {},
						// changesetIDs: {},
					}
				}
			}

			if (!(!!obj[placeID].properties.tags[key])) {
				if (
					!isNaN(value)
					&& typeof value !== 'boolean'
					&& (doc.answerKey === 'lat' || key === 'lng')
				) {
					obj[placeID].properties.tags[key] = value*1
				}else{
					obj[placeID].properties.tags[key] = value
				}

				// obj[placeID].properties.changesetIDs[key] = doc.changesetID || null
			}

			return obj
		},{})


		docs = Object.values(docs)
		.map(doc => {
			// Add name and geometry properties.

			doc.properties.name = []
			if (doc.properties.tags.name) {
				doc.properties.name.push({
					__typename: 'Text',
					language: null,
					text: doc.properties.tags.name,
				})
			}
			if (doc.properties.tags['name:en']) {
				doc.properties.name.push({
					__typename: 'Text',
					language: 'en',
					text: doc.properties.tags['name:en'],
				})
			}

			doc.properties.geometry = {
				__typename: 'GeoData',
			}
			if (doc.properties.tags.lat && doc.properties.tags.lng) {
				doc.properties.geometry.location = {
					__typename: 'GeoCoordinate',
					lat: doc.properties.tags.lat,
					lng: doc.properties.tags.lng,
				}
			}
			return doc
		})

		callback(null,docs)
	})
}

function compileAndUpsertPlace(mongodb, docIDs, finished_callback) {
	compile_places_from_changesets(mongodb, docIDs, (error,docs)=>{
		if (error) {
			console.error(error)
			finished_callback(error, false)
		}else{
			async.each(docs, (doc, callback) => {
				upsertOne(mongodb.CompiledPlaces_collection, doc, docID=>{
					callback()
				})
			}, error => {
				if (error) {
					console.error(error)
					finished_callback(error, false)					
				}else{
					finished_callback(null, true)
				}
			})
		}
	})
}


function getPreset(tags) {
	const tags_keys = Object.keys(tags)
	for (const preset_key in _presets_) {
		const preset_tags = _presets_[preset_key].tags
		const preset_tags_keys = Object.keys(preset_tags)

		const common_keys = preset_tags_keys.filter(key => tags_keys.includes(key))

		if (common_keys.length === preset_tags_keys.length) {
			const okay_keys = common_keys.filter(key => preset_tags[key] === '*' || tags[key].includes(preset_tags[key]))
			if (okay_keys.length === preset_tags_keys.length) {
				return {
					key: preset_key,
					..._presets_[preset_key],
				}
			}
		}
	}


	return {
		"key": "",
		"tags_length": 0,
		"max_tag_value_length": 0,
		"tags": {},
		"name": {},
		"terms": {}
	}
	// return _presets_[Object.keys(_presets_)[0]]
}

function getAudienceTags(tags){
	// queer:ally

	const audience_values_synonyms = {
		only			: 'only',
		primary			: 'primary',
		lgbtq			: 'primary',
		gay				: 'primary',
		majority		: 'primary',
		gay_and_friends	: 'primary',
		welcome			: 'welcome',
		yes				: 'welcome',
		friendly		: 'welcome',
	}

	const audience_sub_keys_synonyms = {
		'lgbtq'					: 'queer',
		'gay'					: 'queer',
		'gay:women'				: 'women',
		'lgbtq:female'			: 'women',
		'gay:men'				: 'men',
		'lgbtq:men'				: 'men',
		'lgbtq:male'			: 'men',
		'gay:transgender'		: 'trans',
		'homosexual'			: 'sexuality:gay',
		'bisexual'				: 'sexuality:bi',
		'juvenile'				: 'youth',
		'youth_centre'			: 'youth',
		// 'lgbtq:bears'			: 'bears',
		// 'lgbtq:cruising'		: 'queer:cruising',
	}

	const specialTag_synonyms = {
		'community_centre:for': {
			homosexual:		{'queer': 'primary', 'sexuality:gay': 'primary'},
			bisexual:		{'queer': 'primary', 'sexuality:bi': 'primary'},
			transgender:	{'queer': 'primary', 'trans': 'primary'},
			lgbtq:			{'queer': 'primary'},
			juvenile:		{'youth': 'primary'},
		},
		'community_centre': {
			youth_centre:	{'youth': 'primary'},
			lgbtq:			{'queer': 'primary'},
		},
		'social_facility:for': {
			lgbtq:			{'queer': 'primary'},
		},
		'type': {
			gay:			{'queer': 'primary'},
		},
		'sauna': {
			gay:			{'queer': 'primary'},
		},
		'club': {
			gay:			{'queer': 'primary'},
			lgbtq:			{'queer': 'primary'},
		},
		'audience': {
			gay:			{'queer': 'primary'},
			gay_and_friends:{'queer': 'primary', 'allies': 'primary'},
		},
		'gayfriendly': {
			yes:			{'queer': 'welcome'},
		},
		'gay': {
			men:			{'queer': 'welcome', 'men': 'primary'},
		},
		'gay:men': {
			yes:			{'queer': 'welcome', 'men': 'welcome'},
			only:			{'queer': 'welcome', 'men': 'only'},
		},
		'lgbtq': {
			yes:			{'queer': 'primary'},
		},
		'gay:only': {
			no:				{'allies': 'welcome'},
		}
	}

	const value_levels = {
		only: 4,
		primary: 3,
		welcome: 2,
		no: 1,
	}


	const audienceTags = {}

	for (const entry of Object.entries(tags)) {
		const key = entry[0]
		const value = entry[1]

		if (audience_sub_keys_synonyms[key] && audience_values_synonyms[value]) {
			const currentValue = audienceTags[audience_sub_keys_synonyms[key]]
			const newValue = audience_values_synonyms[value]
			if (!(!!value_levels[currentValue]) || value_levels[currentValue] <= value_levels[newValue]) {
				audienceTags[audience_sub_keys_synonyms[key]] = newValue
			}
		}

		if (specialTag_synonyms[key]) {
			const values = entry[1].split(';')
			const specialTags_values = Object.keys(specialTag_synonyms[key]).filter(value => values.includes(value))
			for (const value of specialTags_values) {
				const newTags = specialTag_synonyms[key][value]
				for (const key of Object.keys(newTags)) {
					const currentValue = audienceTags[key]
					const newValue = newTags[key]
					if (!(!!value_levels[currentValue]) || value_levels[currentValue] <= value_levels[newValue]) {
						audienceTags[key] = newValue
					}
				}
			}
		}
	}


	return ObjectFromEntries(
		Object.entries(audienceTags)
		.map(entry => ['audience:'+entry[0], entry[1]]) // add the audience namespace
	)

	// return {
	// 	tags: audienceTags,
	// 	only: Object.entries(audienceTags).filter(entry => entry[0] !== 'queer' && entry[1] === 'only').map(entry => entry[0]),
	// 	primary: Object.entries(audienceTags).filter(entry => entry[0] !== 'queer' && entry[1] === 'primary').map(entry => entry[0]),
	// 	welcome: Object.entries(audienceTags).filter(entry => entry[0] !== 'queer' && entry[1] === 'welcome').map(entry => entry[0]),
	// }
}

function getDateTags(tags) {
	const newTags = {}

	if (!tags['opening_date'] && tags['start_date']) {
		newTags['opening_date'] = tags['start_date']
	}
	if (!tags['closing_date'] && tags['end_date']) {
		newTags['closing_date'] = tags['end_date']
	}

	return newTags
}

let key_synonyms = {
	'website': 'contact:website',
	'phone': 'contact:phone',
	'email': 'contact:email',
	'facebook': 'contact:facebook',
	'twitter': 'contact:twitter',
	'youtube': 'contact:youtube',
	'instagram': 'contact:instagram',
	'yelp': 'contact:yelp',
}
key_synonyms = {
	...key_synonyms,
	...(Object.entries(key_synonyms).reduce((key_synonyms_swapped, entry) => {
		key_synonyms_swapped[entry[1]] = entry[0]
		return key_synonyms_swapped
	}, {}))
}
function annotateTags(tags){	
	// add tag synonyms
	const tagKeys = Object.keys(tags)
	for (const tagKey of tagKeys) {
		if (key_synonyms[tagKey]) {
			tags[key_synonyms[tagKey]] = tags[tagKey]
		}
	}

	let newTags = {
		...getAudienceTags(tags),
		...getDateTags(tags),
	}

	const preset = getPreset(tags)
	if (preset.key) {
		newTags.preset = preset.key
	}

	return {
		...tags,
		...newTags,
	}
}



async function session_middleware(req, res, next) {

	if (
		!(!!req.headers.cookie)
		&& !!req.headers['-x-session']
	) {
		req.headers.cookie = '__session='+req.headers['-x-session']
	}

	const mongodb = await getMongoDbContext()

	const sessionTTL = 60 * 60 * 24 * 14 // = 14 days

	const store = new MongoStore({
		client: mongodb.client,
		dbName: 'Auth',
		collection: 'Sessions',
		autoRemove: 'native', // Default
		autoRemoveInterval: 1,
		ttl: sessionTTL,
		touchAfter: 24 * 3600, // time period in seconds
		secret: false,
		stringify: false,
	})

	const cookie_domain = (
		process.env.FUNCTIONS_EMULATOR
		? false // '192.168.2.102'
		: 'qiekub.org'
	)

	session({
		name: '__session',
		secret: await getSecretAsync('express_session_secret'),
		cookie: {
			httpOnly: false,
			domain: cookie_domain,
			sameSite: 'lax',
			secure: false, // somehow doesnt work when its true
			maxAge: 1000 * sessionTTL,
		},
		store,
		saveUninitialized: false, // don't create session until something stored
		resave: false, // don't save session if unmodified
		unset: 'destroy',
	})(req, res, next)
}
async function add_profileID_middleware(req, res, next) {
	const currentProfileID = (
		   !!req.session
		&& !!req.session.passport
		&& !!req.session.passport.user
		? req.session.passport.user
		: null
	)

	req.profileID = currentProfileID
	next()
}



module.exports = {
	ObjectFromEntries,
	addAnswer,
	addChangeset,
	upsertOne,
	compileAnswers,
	compile_places_from_changesets,
	isGeoCoordinateLegalPromise,
	compileAndUpsertPlace,
	getPreset,
	getAudienceTags,
	getDateTags,
	annotateTags,
	key_synonyms,

	session_middleware,
	add_profileID_middleware,
}