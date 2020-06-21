const getMongoDbContext = require('../getMongoDbContext.js')
const { ObjectFromEntries, annotateTags, addChangeset, compileAndUpsertPlace } = require('../modules.js')

const async = require('async')





// # About this script:
// This script should be run everytime the 'annotateTags()' function in '../modules.js' gets changed





function reAnnotateTags(mongodb, doc, finished_callback){
	const tags = doc.properties.tags

	// Derive new tags from the existing tags (preset, audience, opening_date, ...)
	let newTags = Object.entries(annotateTags(tags))
	.filter(entry => !tags[entry[0]] || tags[entry[0]] !== entry[1])

	if (newTags.length > 0) {
		addChangeset(mongodb, {
			forID: doc._id,
			tags: ObjectFromEntries(newTags),
			sources: 'CompiledPlaces+ReAnnotationScript',
			fromBot: true,
			dataset: 'CompiledPlaces',
			antiSpamUserIdentifier: 'ReAnnotationScript',
		}, changesetID=>{
			finished_callback(doc._id)
		}, ()=>{
			finished_callback(null)
		})
	}else{
		finished_callback(null)
	}
}

async function startReAnnotation(){
	const mongodb = await getMongoDbContext()

	mongodb.CompiledPlaces_collection.find().toArray((error,docs)=>{
		if (error) {
			console.error(error)
		}else{
			let placeIDsToRebuild = new Set()
			async.each(docs, (doc, each_callback)=>{
				reAnnotateTags(mongodb, doc, placeID => {
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



// startReAnnotation()



async function reCompileEverything(){
	const mongodb = await getMongoDbContext()
	mongodb.Changesets_collection.find(
		// {'properties.forID': new mongodb.ObjectID('5ea54682dd301aacac336f0b')}
		// {"properties.tags.admin_level" : "2"}
	).toArray((error,docs)=>{
		if (error) {
			console.error(error)
		}else{
			let placeIDsToRebuild = [
				...new Set(
					docs.map(doc => doc.properties.forID+'')
				)
			]
			.map(id => new mongodb.ObjectID(id))
			console.log(placeIDsToRebuild)
			compileAndUpsertPlace(mongodb, placeIDsToRebuild, (error,didItUpsert)=>{
				console.log('finished')
				mongodb.client.close()
			})
		}
	})
}
// reCompileEverything()


