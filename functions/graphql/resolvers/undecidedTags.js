
function queryForUndecidedTags(mongodb, forIDs, resolve, reject){
	if (!(!!forIDs) || forIDs.length === 0) {
		reject(new Error('missing forIDs'))
	}else{
		mongodb.Changesets_collection.aggregate([	
			{$match:{
				"properties.forID": {$in: forIDs},
			}},
			{$lookup:{
				from: 'Edges',
				let: {
					changesetID: '$_id',
				},
				pipeline: [
					{$match:{
						$expr:{$and:[
							{$in: ['$properties.edgeType', ["approved", "rejected"]] },
							{$eq: ['$properties.toID',  '$$changesetID']},
						]}
					}},
					{$sort:{
						"metadata.lastModified": 1,
					}},
					{$limit: 1},
					{$project:{
						_id: false,
						edgeType: '$properties.edgeType',
					}},
				],
				as: 'edges_doc',
			}},
	
			{$set:{
				"tags": { $objectToArray: "$properties.tags" },
				"forID": "$properties.forID",
				"antiSpamUserIdentifier": "$properties.antiSpamUserIdentifier",
				"lastModified": "$metadata.lastModified",
				"edge_doc": { $arrayElemAt: [ "$edges_doc", 0 ] },
			}},
			{$unset: ["__typename","properties","metadata","edges_doc"]},
	
			{$unwind: "$tags"},
			{$set:{
				"key": "$tags.k",
				"value": "$tags.v",
			}},
			{$unset: "tags"},
	
			{$lookup:{
				from: 'Edges',
				let: {
					changesetID: '$_id',
					tagKey: '$key',
				},
				pipeline: [
					{$match:{
						$expr:{$and:[
							{$in: ['$properties.edgeType', ["approvedTag", "rejectedTag"]] },
							{$eq: ['$properties.toID',  '$$changesetID']},
							{$eq: ['$properties.tags.forTag',  '$$tagKey']},
						]}
					}},
					{$sort:{
						"metadata.lastModified": 1,
					}},
					{$limit: 1},
					{$project:{
						_id: true,
						edgeType: '$properties.edgeType',
					}},
				],
				as: 'edges_tags',
			}},
	
			{$set:{
				"edge_tag": { $arrayElemAt: [ "$edges_tags", 0 ] },
			}},
			{$set:{
				"doc_decision": '$edge_doc.edgeType',
				"tag_decision": '$edge_tag.edgeType',
			}},
			{$set:{
				doc_decision: { $ifNull: [ "$doc_decision", null ] },
				tag_decision: { $ifNull: [ "$tag_decision", null ] },
			}},
			{$unset: ['edges_tags','edge_doc','edge_tag']},
	


			// only get fully undecided key-value pairs
			{$match:{
				$expr:{$and:[
					{$eq: ['$doc_decision', null]},
					{$eq: ['$tag_decision', null]},
				]}
			}},



			// START restrict to the latest answer per antiSpamUserIdentifier (and place and key).
			{$sort:{
				"lastModified": -1,
				"_id": 1,
			}},
			{$group:{
				_id: {$concat:[
					//{$toString:"$antiSpamUserIdentifier"},
					//"_",
					{$toString:"$forID"},
					"_",
					{$toString:"$key"},
					"_",
					{$toString:"$value"},
				]},
				doc: {$first:"$$ROOT"},
				changesetIDs: {$addToSet:"$$ROOT._id"},
			}},
			{$set:{
				'doc.changesetIDs': "$changesetIDs",
			}},
			{$replaceRoot:{newRoot:"$doc"}},
			{$unset: 'antiSpamUserIdentifier'},
			// END restrict to the latest answer per antiSpamUserIdentifier (and place and key).
			
			
	
			// // only get key-value pairs without a tag-decision
			// {$match:{
			// 	$expr:{$or:[
			// 		{$and:[
			// 			{$eq: ['$doc_decision', null]},
			// 			{$eq: ['$tag_decision', null]},
			// 		]},
			// 		{$and:[
			// 			{$ne: ['$doc_decision', null]},
			// 			{$eq: ['$tag_decision', null]},
			// 		]},
			// 	]}
			// }},
		]).toArray((error,docs)=>{
			if (error) {
				reject(error)
			}else{
				resolve(docs)
			}
		})
	}
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		if (!(!!context.profileID)) {
			// check if logged-in
			reject('User must be logged in.')
		} else {
			if (args.forID) {
				if (!mongodb.ObjectID.isValid(args.forID)) {
					reject('forID is not a correct ObjectID')
				}else{
					queryForUndecidedTags(mongodb, [new mongodb.ObjectID(args.forID)], resolve, reject)
				}
			}else{
				reject('missing forID')
			}
		}
	})
}