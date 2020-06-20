const functions = require('firebase-functions')
const getMongoDbContext = require('../getMongoDbContext.js')

const async = require('async')
const fetch = require('node-fetch')
// const places = require('./data/_places.js')
// const osm_places = require('./data/osm_places.json')

// https://overpass-api.de/api/interpreter?data=[bbox:90,-180,-90,180][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;

async function getOverpassResult(mongodb) {
	// 50.6,7.0,50.8,7.3
	// [bbox:-33.9443568006265,151.17616653442383,-33.8339199536547,151.31195068359375]
	// [bbox:48.795330416333336,2.217864990234375,48.970301503721316,2.4894332885742188]
	
	const url = 'https://overpass-api.de/api/interpreter?data=[bbox:90,-180,-90,180][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];(node[~"^lgbtq.*$"~"."];-node[~"^lgbtq.*$"~"(welcome|no)"];);(node[~"^gay.*$"~"."];-node[~"^gay.*$"~"(welcome|no)"];);(node[~"^fetish.*$"~"."];-node[~"^fetish.*$"~"(welcome|no)"];););out qt;'

	const result = await fetch(encodeURI(url), {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'qiekub.com',
			'User-Agent': 'qiekub.com',
		},
	})
	.then(res => res.json())
	.then(data => {
		console.log('finished loading', data.elements.length)

		return data.elements.map(element=>{
			if (element.type !== 'node') {
				return null
			}

			let doc = {
				_id: new mongodb.ObjectID(),
				// _id: 'https://www.openstreetmap.org/'+element.type+'/'+element.id,
				__typename: 'Doc',
				properties: {
					__typename: 'Place',
					name: element.tags.name || '',
					geometry: {
						location: {
							lng: element.lon,
							lat: element.lat,
						},
					},
					osmID: element.type+'/'+element.id,
					tags: element.tags,
				},
			}

			return doc
		}).filter(d=>d!==null)
	})
	.catch(error => null)
	
	/*
	const result = osm_places.elements.map(element=>{
		if (element.type !== 'node') {
			return null
		}

		let doc = {
			_id: 'https://www.openstreetmap.org/'+element.type+'/'+element.id,
			__typename: 'Doc',
			properties: {
				__typename: 'Place',
				name: element.tags.name || '',
				geometry: {
					location: {
						lng: element.lon,
						lat: element.lat,
					},
				},
				osmID: element.type+'/'+element.id,
				tags: element.tags,
			},
		}

		return doc
	}).filter(d=>d!==null)
	*/

	return new Promise(resolve => resolve(result))
}


function upsertOne_ToOsmCache(collection,doc,callack){
	if (doc.properties.__typename) {
		collection.findOne({
			'properties.osmID': doc.properties.osmID,
			// 'properties.__typename': doc.properties.__typename,
			// _id: doc._id,
			// 'properties.__typename': doc.properties.__typename,
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
				delete doc._id
				collection.replaceOne({
					_id: result._id,
				},{
					...doc,
					_id: result._id,
					metadata: {
						...result.metadata,
						lastModified: new Date,
					},
				}).then(result => {
					callack(result.upsertedId || null)
				}).catch(error=>{
					console.error(error)
					callack(null)
				})
			
				/*
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

				collection.replaceOne({
					_id: result._id,
					// 'properties.__typename': doc.properties.__typename,
				}, operations).then(result => {
					callack(result.upsertedId || doc._id || null)
				}).catch(error=>{
					console.error(error)
					callack(null)
				})
				*/
			}
		}).catch(error=>{
			console.error(error)
			callack(null)
		})
	}else{
		callack(null)
	}
}

function deleteAllCurrentDocs(collection, callback){
	collection.deleteMany({})
	callback()
}

async function loadOsmData(req, res){
	const mongodb = getMongoDbContext()

	getOverpassResult(mongodb).then(docs=>{

		async.each(docs, (doc, each_callback)=>{
			upsertOne_ToOsmCache(mongodb.OsmCache_collection, doc, itGotUpserted=>{
				each_callback()
			})
		}, error=>{
			if (error) {
				console.error(error)
			}
			// callback()
			res.send('done')
		})

		// deleteOldDocs(mongodb.OsmCache_collection, ()=>{
		// })
	}, error=>{
		console.error(error)
		res.send(error)
	})
}


exports = module.exports = functions.https.onRequest(loadOsmData)
