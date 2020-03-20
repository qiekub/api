const flatten = require('flat')



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



module.exports = {
	upsertOne,
}