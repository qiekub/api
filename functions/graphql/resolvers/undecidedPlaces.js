
const { 
	cacheKeyFromObjectSync,
	isCachedSync,
	setCacheSync,
	getCacheSync,
} = require('../cache.js')

function queryForUndecidedPlaces(mongodb, placeIDs, resolve, reject){
	mongodb.CompiledPlaces_collection.aggregate([
		// START get answers
		...(!!placeIDs ? [{$match:{
			"_id": {$in: placeIDs},
		}}] : []),

		{$project:{
			_id: true,
		}},
		{$lookup:{
			from: "Changesets",
			localField: "_id",
			foreignField: "properties.forID",
			as: "changesets",
		}},
		{$unwind: "$changesets"},
		{$project:{
			_id: true,
			placeID: "$_id",
			changesetDoc: "$changesets",
		}},

		



		{$lookup:{
			from: "Edges",
			localField: "changesetDoc._id",
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
			_id: "$changesetDoc._id",
			placeID: {$first: "$placeID"},
			changesetDoc: {$first: "$changesetDoc"},
			// edges: {$push: "$edges"},
			// skippesCount: {$sum: {
			// 	$cond: {
			// 		if: {$eq:[
			// 			{$ifNull:["$edges",null]},
			// 			null
			// 		]},
			// 		then: 0,
			// 		else: 1
			// 	}
			// }},
		}},





		{$group: {
			_id: "$placeID",
			// changesetDocs: {$addToSet: "$changesetDoc._id",
			// changesetsCount: {$sum: 1},
			// edges: {$push: "$edges"},
			// skippesCount: {$sum: "$skippesCount"},
		}},
		{$addFields:{
			__typename: 'Doc',
			'properties.__typename': 'Place',
		}},
		// {$sort:{
		// 	changesetsCount: -1,
		// 	// skippesCount: -1,
		// }},
		{$limit: 1000}, // 1000 as these are probably used to filter the map markers.
	]).toArray((error,docs)=>{
		if (error) {
			reject(error)
		}else{
			resolve(docs)
		}
	})
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		const cacheKey = cacheKeyFromObjectSync({
			query: 'undecidedPlaces',
			args,
			context,
		})

		if (isCachedSync(cacheKey)) {
			resolve(getCacheSync(cacheKey))
		}

		if (!(!!context.profileID)) {
			// check if logged-in
			reject('User must be logged in.')
		} else {
			function saveAndResolve(data){
				setCacheSync(cacheKey, data)
				resolve(data)
			}

			if (args.forID) {
				if (!mongodb.ObjectID.isValid(args.forID)) {
					reject('forID is not a correct ObjectID')
				}else{
					queryForUndecidedPlaces(mongodb, [new mongodb.ObjectID(args.forID)], saveAndResolve, reject)
				}
			}else{
				queryForUndecidedPlaces(mongodb, null, saveAndResolve, reject)
			}
		}
	})
}