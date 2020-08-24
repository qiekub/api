const async = require('async')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject)=>{
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
					{$project:{
						_id: '$_id',
						originalTypename: '$properties.__typename',
						name: '$properties.name',
						lng: '$properties.geometry.location.lng',
						lat: '$properties.geometry.location.lat',
						preset: '$properties.tags.preset',
						tags: {
							min_age: '$properties.tags.min_age',
							max_age: '$properties.tags.max_age',
							audience_queer: '$properties.tags.audience:queer',
							published: '$properties.tags.published',
						},
					}},
					{$addFields:{
						status: 'compiled',
					}},
				]).toArray(callback)
			},
			Changesets: callback=>{
				if (!(!!context.profileID)) {
					console.error('User must be logged in.')
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
						}},
						{$project:{
							_id: '$_id',
							originalTypename: '$properties.__typename',
							forID: '$properties.forID',
							name: '$properties.tags.name',
							lng: '$properties.tags.lng',
							lat: '$properties.tags.lat',
							preset: '$properties.tags.preset',
							tags: {
								min_age: '$properties.tags.min_age',
								max_age: '$properties.tags.max_age',
								audience_queer: '$properties.tags.audience:queer',
							},
						}},
						{$addFields:{
							status: 'undecided',
							name: [ 
								{
									__typename: 'Text',
									language: null,
									text: '$name',
								}
							],
							'tags.published': false,
						}},
					]).toArray(callback)
				}
			}
		}, (error, results)=>{
			if (error) {
				reject(error)
			}else{
				const placeIDs = results.CompiledPlaces.map(doc => doc._id)

				resolve([
					...results.CompiledPlaces,
					...results.Changesets.filter(doc => !placeIDs.includes(doc.forID)),
				])
			}
		})
	})
}