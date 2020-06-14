const getMongoDbContext = require('../getMongoDbContext.js')
const { ObjectFromEntries, compileAndUpsertPlace } = require('../modules.js')

const async = require('async')











function approveChangeset(mongodb, doc, finished_callback){
	mongodb.Edges_collection.insertOne({
		__typename: 'Doc',
		properties: {
			__typename: 'Edge',
			edgeType: 'approved',
			toID: doc._id,
			fromID: new mongodb.ObjectID('5ecafac5e1a001e5cfab8e26'), // my profileID
			tags: {},
		},
		metadata: {
			created: new Date,
			lastModified: new Date,
			__typename: 'Metadata',
		},
	})
	.then(result => {
		if (!!result.insertedId) {
			finished_callback(doc.properties.forID)
		}else{
			finished_callback(null)
		}
	})
	.catch(error => finished_callback(null))
}

async function startApproval(){
	const mongodb = await getMongoDbContext()

	mongodb.Changesets_collection.aggregate([
		{$match:{
			'properties.fromBot': true,
		}},

		// START filter for undecided changesets
		{$lookup:{
			from: "Edges",
			localField: "_id",
			foreignField: "properties.toID",
			as: "edges",
		}},
		{$unwind:{
			path: "$edges",
			preserveNullAndEmptyArrays: true,
		}},
		{$match:{
			$and: [
				{"edges.properties.edgeType": {$not: {$eq: "rejected"} } },
				{"edges.properties.edgeType": {$not: {$eq: "approved"} } }
			]
		}},
		{$group: {
			_id: "$_id",
			doc: {$first: "$$ROOT"},
		}},
		{$replaceRoot:{
			newRoot: "$doc"
		}},
		{$unset: "edges"},
		// END filter for undecided changesets
	])
	// .limit(1)
	.toArray((error,docs)=>{
		if (error) {
			console.error(error)
		}else{
			let placeIDsToRebuild = new Set()
			async.each(docs, (doc, each_callback)=>{
				approveChangeset(mongodb, doc, placeID => {
					if (!!placeID) {
						placeIDsToRebuild.add(placeID)
					}
					each_callback()
				})
			}, error=>{
				if (error) {
					console.error(error)
				}else{
					console.log([...placeIDsToRebuild])
					compileAndUpsertPlace(mongodb, [...placeIDsToRebuild], (error,didItUpsert)=>{
						console.info('finished')
						mongodb.client.close()
					})
				}
			})
		}
	})
}



// startApproval()


