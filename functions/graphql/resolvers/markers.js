const async = require('async')
const { annotateDoc } = require('../../modules.js')

const { 
	cacheKeyFromObjectSync,
	isCachedSync,
	setCacheSync,
	getCacheSync,
} = require('../cache.js')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
		const cacheKey = cacheKeyFromObjectSync({
			query: 'markers',
			args,
			context,
		})

		if (isCachedSync(cacheKey)) {
			resolve(getCacheSync(cacheKey))
		}

		async.parallel({
			CompiledPlaces: callback=>{
				mongodb.CompiledPlaces_collection.aggregate([
					{$match:{
						'properties.tags.preset': {$nin:['default','boundary/administrative']},
						'properties.tags.lat': {$ne:0},
						'properties.tags.lng': {$ne:0},
						...(
							!(!!context.profileID) // check if logged-in
							? {'properties.tags.published': true}
							: {}
						),
					}},

					// START remove duplicates
					{$lookup:{
						from: 'Edges',
						let: {
							placeID: '$_id',
						},
						pipeline: [
							{$match:{
								$expr:{$and:[
									{$eq: ['$properties.toID',  '$$placeID']},
									{$in: ['$properties.edgeType', ['deleted']] },
								]}
							}},
							{$limit: 1},
							{$project:{
								_id: true,
							}},
						],
						as: 'edges',
					}},
					{$match: {
						'edges': {$size:0},
					}},
					// END remove duplicates

					// {$project:{
					// 	_id: 1,
					// 	properties: 1,
					// }},
					{$addFields:{
						status: 'compiled',
					}},
				]).toArray(callback)
			},
			Changesets: callback=>{
				if (!(!!context.profileID)) {
					callback(null, [])
				}else{
					mongodb.Changesets_collection.aggregate([
						{$match:{
							'properties.tags.preset': {$nin:['default','boundary/administrative']},
							'properties.tags.lat': {$ne:0},
							'properties.tags.lng': {$ne:0},
						}},

						// START don't include already compiled places
						{$lookup:{
							from: 'CompiledPlaces',
							localField: 'properties.forID',
							foreignField: '_id',
							as: 'lookup_result',
						}},
						{$match: {
							'lookup_result': {$size:0},
						}},
						// END don't include already compiled places

						// START remove duplicates
						{$lookup:{
							from: 'Edges',
							let: {
								placeID: '$properties.forID',
								changesetID: '$_id',
							},
							pipeline: [
								{$match:{
									$expr:{$and:[
										{$or:[
											{$eq: ['$properties.toID',  '$$placeID']},
											{$eq: ['$properties.toID',  '$$changesetID']},
										]},
										{$in: ['$properties.edgeType', ['deleted']] },
									]}
								}},
								{$limit: 1},
								{$project:{
									_id: true,
								}},
							],
							as: 'edges',
						}},
						{$match: {
							'edges': {$size:0},
						}},
						// END remove duplicates

						// {$project:{
						// 	_id: 1,
						// 	properties: 1,
						// }},
						{$addFields:{
							status: 'undecided',
							// name: [
							// 	{
							// 		__typename: 'Text',
							// 		language: null,
							// 		text: '$name',
							// 	}
							// ],
							// 'tags.published': false,
						}},
					]).toArray(callback)
				}
			}
		}, (error, results)=>{
			if (error) {
				reject(error)
			}else{
				const placeIDs = results.CompiledPlaces.map(doc => doc._id)

				const docs = [
					...results.CompiledPlaces,
					...results.Changesets.filter(doc => !placeIDs.includes(doc.forID)),
				]
				.map(doc => {
					const tags = doc.properties.tags
					const annotatedDoc = annotateDoc(doc)

					return {
						_id: doc._id,
						forID: doc.properties.forID || null,
						originalTypename: doc.properties.__typename,

						name: annotatedDoc.properties.name,
						lng: tags.lng,
						lat: tags.lat,
						preset: tags.preset,
						tags: {
							min_age: tags.min_age,
							max_age: tags.max_age,
							audience_queer: tags['audience:queer'],
							published: tags.published,
						},
						status: doc.status,
					}
				})

				setCacheSync(cacheKey, docs)

				resolve(docs)
			}
		})
	})
}