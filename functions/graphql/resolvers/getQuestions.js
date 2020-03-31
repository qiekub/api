const async = require('async')

function loadQuestionsFromDB(mongodb, callback){
	mongodb.Questions_collection.find({'properties.__typename': 'Question'}).limit(1000).toArray((error,docs)=>{
		if (error) {
			console.error(error)
			callback([])
		}else{
			callback(docs)
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