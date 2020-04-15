const async = require('async')
const { compileAnswers } = require('../../modules.js')

/*function getPlace(placeID, resolve){
	let foundPlace = null
	for (const place of places) {
		if (place.name == placeID) {
			foundPlace = {
				_id: null,
				properties: {
					...place,
				
					__typename: 'Place',
	
					links: place.website,
					min_age: (place.min_age == -1 ? null : place.min_age),
					max_age: (place.max_age == -1 ? null : place.max_age),
	
					location: {
						lng: place.lng,
						lat: place.lat,
					},
				},
				metadata: null,
			}
			break
		}
	}

	resolve(foundPlace)
}*/

/*module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		// getPlace(args._id, resolve)

		if (!args._id) {
			reject('No _id value')
		}else if (!mongodb.ObjectID.isValid(args._id)) {
			reject('_id is not a correct ObjectID')
		}else{
			mongodb.OsmCache_collection.findOne({
				_id: new mongodb.ObjectID(args._id),
				'properties.__typename': 'Place',
			}).then(result => {
				if (result === null) {
					mongodb.collection.findOne({
						_id: new mongodb.ObjectID(args._id),
						'properties.__typename': 'Place',
					}).then(result => {
						resolve(result)
					}).catch(reject)
				}else{
					resolve(result)
				}
			}).catch(reject)
		}
	})
}*/


/*
function compileAnswers(mongodb, placeID, callback){

	const __last_n_answers__ = 5
	mongodb.Answers_collection.aggregate([
		// START get answers
		(!!placeID ? {$match:{
			"properties.forID": placeID,
		}} : null),
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
			"forID": "$docs.properties.forID",
			"questionID": "$docs.properties.questionID",
			"answer": "$docs.properties.answer",
		}},
		{$set:{
			 "value_as_string": {$switch:{
				branches: [
					{case: {$eq:[{$type:"$answer.v"},"string"]}, then: "$answer.v"},
				],
				default: ""
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
	]).toArray((error,docs)=>{
		if (!!docs && docs.length > 0) {
			callback(docs[0])
		}else{
			callback({})
		}
	})
}
*/

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		// getPlace(args._id, resolve)

		if (!args._id) {
			reject('No _id value')
		}else if (!mongodb.ObjectID.isValid(args._id)) {
			reject('_id is not a correct ObjectID')
		}else{

			const docID = new mongodb.ObjectID(args._id)

			async.parallel({
				osm: function(callback) {
					mongodb.OsmCache_collection.findOne({
						_id: new mongodb.ObjectID(args._id),
						'properties.__typename': 'Place',
					}).then(resultDoc => {
						callback(null, resultDoc || {})
					}).catch(error=>{
						callback(null, {})
					})
				},
				// qiekub: callback=>{
				// 	loadPlacesFromDB(mongodb, docs=>{
				// 		callback(null, docs)
				// 	})
				// },
				answers: callback=>{
					// TODO move away from here!!!
					compileAnswers(mongodb, docID, (error,docs)=>{
						let doc = {}
						if (!!docs && docs.length > 0) {
							doc = docs[0]
						}
						callback(null, doc)
					})
				}
			}, (err, results)=>{

				results.osm = results.osm || {}
				results.osm.properties = results.osm.properties || {}
				results.osm.properties.geometry = results.osm.properties.geometry || {}
				results.osm.properties.geometry.location = results.osm.properties.geometry.location || {}
				results.osm.properties.tags = results.osm.properties.tags || {}
				
				results.answers = results.answers || {}
				results.answers.properties = results.answers.properties || {}
				results.answers.properties.geometry = results.answers.properties.geometry || {}
				results.answers.properties.geometry.location = results.answers.properties.geometry.location || {}
				results.answers.properties.tags = results.answers.properties.tags || {}
				results.answers.properties.confidences = results.answers.properties.confidences || {}

				const doc = {
					...results.osm,
					properties: {
						...results.osm.properties,
						geometry: {
							...results.osm.properties.geometry,
							location: {
								...results.osm.properties.geometry.location,
								...results.answers.properties.geometry.location,
							}
						},
						tags: {
							...results.osm.properties.tags,
							...results.answers.properties.tags,
						},
						confidences: {
							// ...Object.entries(results.osm.properties.tags).reduce((obj,pair)=>{
							// 	obj[pair[0]] = 'osm'
							// 	return obj
							// },{}),
							...results.answers.properties.confidences
						},
					}
				}

				resolve(doc)
			})
			/*mongodb.OsmCache_collection.findOne({
				_id: new mongodb.ObjectID(args._id),
				'properties.__typename': 'Place',
			}).then(result => {
				// if (result === null) {
				// 	mongodb.collection.findOne({
				// 		_id: new mongodb.ObjectID(args._id),
				// 		'properties.__typename': 'Place',
				// 	}).then(result => {
				// 		resolve(result)
				// 	}).catch(reject)
				// }else{
				// 	resolve(result)
				// }
			}).catch(reject)*/
		}
	})
}