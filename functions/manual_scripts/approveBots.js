const getMongoDbContext = require('../getMongoDbContext.js')
const { ObjectFromEntries, compileAndUpsertPlace, approveChangeset } = require('../modules.js')

const async = require('async')



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


