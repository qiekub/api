const async = require('async')

function loadQuestionsFromDB(mongodb, callback){
	mongodb.Questions_collection.find({
		'properties.__typename': 'Question',
		// '_id': new mongodb.ObjectID('5e8b36df989255079c9baaf6'),
	}).limit(100).toArray((error,docs)=>{
		if (error) {
			console.error(error)
			callback([])
		}else{
			callback(docs.reverse())
		}
	})
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return new Promise((resolve,reject) => {

		async.parallel({
			qiekub: callback=>{
				loadQuestionsFromDB(mongodb, docs=>{
					callback(null, docs)
				})
			}
		}, (err, results)=>{
			resolve([...results.qiekub])
		})
	})
}