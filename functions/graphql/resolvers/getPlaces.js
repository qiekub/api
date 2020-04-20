const async = require('async')

const {compileAnswers} = require('../../modules.js')

function loadPlacesFromOsmChache(mongodb, callback){
	mongodb.OsmCache_collection.find({'properties.__typename': 'Place'}).limit(10000).toArray((error,docs)=>{
		if (error) {
			console.error(error)
			// reject()
			callback([])
		}else{
			callback(docs)
		}

		/*resolve((docs || []).map(doc => {
			return {
				_id: doc._id,
				min_age: (doc.properties.min_age === -1 ? null : doc.properties.min_age),
				max_age: (doc.properties.max_age === -1 ? null : doc.properties.max_age),
			}
		}))*/
	})
}

function loadPlacesFromDB(mongodb, callback){
	mongodb.CompiledPlaces_collection.find({'properties.__typename': 'Place'}).limit(10000).toArray((error,docs)=>{
		if (error) {
			console.error(error)
			// reject()
			callback([])
		}else{
			callback(docs)
		}

		/*resolve((docs || []).map(doc => {
			return {
				_id: doc._id,
				min_age: (doc.properties.min_age === -1 ? null : doc.properties.min_age),
				max_age: (doc.properties.max_age === -1 ? null : doc.properties.max_age),
			}
		}))*/
	})
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject) => {

		async.parallel({
			osm: function(callback) {
				loadPlacesFromOsmChache(mongodb, docs=>{
					callback(null, docs)
				})
			},
			qiekub: callback=>{
				loadPlacesFromDB(mongodb, docs=>{
					callback(null, docs)
				})
			},
			answers: callback=>{
				// TODO move away from here!!!
				compileAnswers(mongodb, false, (error,docs)=>{
					// let compiledTags = {}
					// if (!!docs && docs.length > 0) {
					// 	compiledTags = docs[0]
					// }
					callback(null, docs)
				})
			}
		}, (err, results)=>{
			const answersByID = results.answers.reduce((obj,doc)=>{
				// TODO move away from here!!!
				obj[doc._id] = doc
				return obj
			}, {})

			let places = [...results.osm, ...results.qiekub]
			for (var i = places.length - 1; i >= 0; i--) {
				// TODO move away from here!!!
				if (!!answersByID[places[i]._id]) {
				// TODO move away from here!!!
					const compiledTags = answersByID[places[i]._id]
					
					const placeDoc = places[i]
					places[i] = {
						// TODO move away from here!!!
						...placeDoc,
						properties: {
							// TODO move away from here!!!
							...placeDoc.properties,
							geometry: {
								...placeDoc.properties.geometry,
								location: {
									...placeDoc.properties.geometry.location,
									...compiledTags.properties.geometry.location,
								}
							},
							tags: {
								// TODO move away from here!!!
								...placeDoc.properties.tags,
								...compiledTags.properties.tags,
							},
							confidences: {
								// TODO move away from here!!!
								// ...Object.entries(placeDoc.properties.tags).reduce((obj,pair)=>{
								// 	obj[pair[0]] = 'osm'
								// 	return obj
								// },{}),
								...compiledTags.properties.confidences
							},
						}
					}
				}
				
				// break
			}

			resolve(places)
		})

		// loadPlacesFromOsmChache(mongodb, osmDocs=>{
		// 	loadPlacesFromDB(mongodb, docs=>{
		// 		resolve([...docs, ...osmDocs])
		// 	})
		// })
	})
}