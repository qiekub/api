// [
// 		{$lookup:{
// 			from: "Edges",
// 			localField: "_id",
// 			foreignField: "properties.toID",
// 			as: "edges",
// 		}},
// 		{$unwind:{
// 			path: "$edges",
// 			preserveNullAndEmptyArrays: false,
// 		}},
// 		{$match:{
// 			"edges.properties.edgeType": {$eq: "approved"},
// 		}},
// 		{$group: {
// 			_id: "$_id",
// 			changesetDoc: {$first: "$$ROOT"},
// 		}},
// 		{$replaceRoot:{
// 			newRoot: "$changesetDoc"
// 		}},
// 	]


function getLimitChangesetQuery(){
	return [
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
	]
}

const project_queries = {
	changesets: [
		{$replaceRoot:{
			newRoot: "$changesetDoc"
		}},
		{$sort:{
			'metadata.lastModified': 1,
		}},
		{$limit: 100}, // 100 as these are probably displayed in a list.
	],
	places: [
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
	],
}

function queryForUndecidedChangesets(mongodb, placeIDs, whatIsRequested, resolve, reject){
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

		...getLimitChangesetQuery(),
		...(project_queries[whatIsRequested] || []),
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
		const whatIsRequested = args.whatIsRequested || null // Can have any value used as a key in project_queries (places,changesets).

		if (!(!!context.profileID)) {
			// check if logged-in
			reject('User must be logged in.')
		} else if (!(!!whatIsRequested)) {
			reject('whatIsRequested must be defined')
		} else if (!(Object.keys(project_queries).includes(whatIsRequested))) {
			reject('whatIsRequested must have any of the following values: '+Object.keys(project_queries).join(', ')+'! This is probably an internal server error in "resolvers.js"!')
		} else {
			if (args.forID) {
				if (!mongodb.ObjectID.isValid(args.forID)) {
					reject('forID is not a correct ObjectID')
				}else{
					queryForUndecidedChangesets(mongodb, [new mongodb.ObjectID(args.forID)], whatIsRequested, resolve, reject)
				}
			}else{
				queryForUndecidedChangesets(mongodb, null, whatIsRequested, resolve, reject)
			}
		}
	})
}