const getMongoDbContext = require('../getMongoDbContext.js')
const { ObjectFromEntries, addChangeset, compileAndUpsertPlace } = require('../modules.js')

const async = require('async')





// # About this script:
// This should probably never be run!!!




async function startReAnnotation(){
	const mongodb = await getMongoDbContext()

	const profileID = new mongodb.ObjectID('5ecafac5e1a001e5cfab8e26') // profileID of Thomas Rosen

	mongodb.CompiledPlaces_collection.find({
		'properties.tags.published': {$exists: false}
	}).toArray((error,docs)=>{
		if (error) {
			console.error(error)
		}else{
			let placeIDsToRebuild = new Set()
			async.each(docs, (doc, each_callback)=>{
				const placeID = doc._id
				addChangeset(mongodb, {
					forID: placeID,
					tags: {
						published: true,
					},
					sources: 'publishExistingPlaces.js',
					fromBot: true,
					dataset: 'qiekub',
					antiSpamUserIdentifier: 'publishExistingPlaces.js',
				}, changesetID=>{
					mongodb.Edges_collection.insertOne({
						__typename: 'Doc',
						properties: {
							__typename: 'Edge',
							edgeType: 'approvedTag',
							toID: changesetID,
							fromID: profileID,
							tags: {
								forTag: 'published',
							},
						},
						metadata: {
							created: new Date,
							lastModified: new Date,
							__typename: 'Metadata',
						},
					})
					.then(result => {
						// const edgeID = result.insertedId
						placeIDsToRebuild.add(placeID)
						each_callback()
					})
					.catch(error => {
						console.error(error)
						each_callback()
					})
				}, ()=>{
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



// startReAnnotation()


