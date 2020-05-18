const getMongoDbContext = require('../getMongoDbContext.js')
const { ObjectFromEntries, annotateTags } = require('../modules.js')

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
			finished_callback()
		}, ()=>{
			finished_callback()
		})
	}else{
		finished_callback()
	}
}

async function startReAnnotation(){
	const mongodb = await getMongoDbContext()

	mongodb.CompiledPlaces_collection.find().toArray((error,docs)=>{
		if (error) {
			console.error(error)
		}else{
			async.each(docs, (doc, each_callback)=>{
				reAnnotateTags(mongodb, doc, ()=>{
					each_callback()
				})
			}, error=>{
				if (error) {
					console.error(error)
				}else{
					console.log('done')
				}
			})
		}
	})
}



startReAnnotation()


