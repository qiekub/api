const flatten = require('flat')

const isGeoCoordinateLegalPromise = require('./modules/isGeoCoordinateLegalPromise.js')

const questionsInSchema = require('./data/dist/questionsInSchema.json')
const questionsInSchemaById = questionsInSchema.reduce((obj,question)=>{
	obj[question._id] = question
	return obj
}, {})



function upsertOne(collection,doc,callack){
	if (doc.properties.__typename) {
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
					operations.$set = Object.fromEntries(toSet)
				}
				if (toUnset.length > 0) {
					operations.$unset = Object.fromEntries(toUnset)
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

function compileAnswers(mongodb, placeID, callback){
	const __last_n_answers__ = 5
	mongodb.Answers_collection.aggregate([
		// START get answers
		...(!!placeID ? [{$match:{
			"properties.forID": placeID,
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
	]).toArray((error,docs)=>{

		docs = docs.map(doc => {
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

		const answerCountsByValue = docs.reduce((obj,doc)=>{
			if (!obj[doc.value_id]) {
				obj[doc.value_id] = 0
			}
			obj[doc.value_id] += 1
			return obj
		}, {})

		docs = docs.map(doc => {
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
		docs = Object.keys(docs).reduce((obj,key_id) => {
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
		
		docs = Object.values(docs).map(doc=>{
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
					_id: doc.forID,
					properties: {
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
			doc.properties.geometry = {}
			if (doc.properties.tags.lat && doc.properties.tags.lng) {
				doc.properties.geometry.location = {
					lat: doc.properties.tags.lat,
					lng: doc.properties.tags.lng,
				}
			}
			return doc
		})

		callback(null,docs)
	})
}



module.exports = {
	upsertOne,
	compileAnswers,
	isGeoCoordinateLegalPromise,
}