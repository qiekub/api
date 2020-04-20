const {upsertOne} = require('../../modules.js')

// const flatten = require('flat')
// also look at https://jsperf.com/flatten-un-flatten/16
// and at https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects

/*
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
*/

function addChangeset(collection, changeset, resolve, reject){
	collection.insertOne({
		__typename: 'Doc',
		properties: {
			...changeset,
			__typename: 'Changeset',
		},
		metadata: {
			created: new Date(),
			lastModified: new Date(),
			__typename: 'Metadata',
		},
	}).then(result => {
		// calc new Place doc
		resolve(result.insertedId || null)
			
		// parseChangeset(changeset, resolve, reject)
	}).catch(reject)
}

function parseChangeset(mongodb, changeset, resolve, reject){
	let doc = {
		__typename: 'Doc',
		_id: (
			mongodb.ObjectID.isValid(changeset.forID)
			? new mongodb.ObjectID(changeset.forID)
			: new mongodb.ObjectID()
		),
		properties: changeset.properties,
	}
		
	upsertOne(mongodb.CompiledPlaces_collection,doc,itGotUpserted=>{
		resolve(itGotUpserted || null)
	})
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		let changeset = {...args.changeset}
		if (changeset.properties.min_age) {
			changeset.properties.min_age = Number.parseInt(changeset.properties.min_age,10)
		}
		if (changeset.properties.min_age) {
			changeset.properties.max_age = Number.parseInt(changeset.properties.max_age,10)
		}

		let doc = {
			__typename: 'Doc',
			_id: (
				mongodb.ObjectID.isValid(changeset.forID)
				? new mongodb.ObjectID(changeset.forID)
				: new mongodb.ObjectID()
			),
			// _id: 'test-id',
			properties: changeset.properties,
		}
		
		upsertOne(mongodb,doc,itGotUpserted=>{
			// resolve(itGotUpserted || null)

			changeset.forID = doc._id

			addChangeset(mongodb.CompiledPlaces_collection, changeset, (changesetID)=>{
				if (changesetID === null) {
					resolve(null)
				}else{
					mongodb.CompiledPlaces_collection.findOne({_id:changesetID}).then(changesetDoc => {
						if (changesetDoc === null) {
							resolve(null)
						}else{
							resolve(changesetDoc)
						}
					}).catch(error=>{
						resolve(null)
					})
				}
			}, reject)

		})
	})
}