const { annotateDoc } = require('../../modules.js')

function queryPlace(context, mongodb, docID, resolve, reject){
	mongodb.CompiledPlaces_collection.findOne({
		_id: docID,
		'properties.__typename': 'Place',
		...(
			!(!!context.profileID) // check if logged-in
			? {
				'properties.tags.published': true,
			}
			: {}
		),
	})
	.then(resultDoc => {
		if (!!resultDoc) {
			resolve(annotateDoc(resultDoc))
		}else{
			reject(new Error('no place found'))
		}
	})
	.catch(error=>{
		reject(error)
	})
}

function queryChangeset(context, mongodb, docID, resolve, reject){
	if (!(!!context.profileID)) {
		// check if logged-in
		reject('User must be logged in.')
	}else{
		mongodb.Changesets_collection.findOne({
			_id: docID,
			'properties.__typename': 'Changeset',
		})
		.then(resultDoc => {
			if (!!resultDoc) {
				resolve(annotateDoc(resultDoc))
			}else{
				reject(new Error('no changeset found'))
			}
		})
		.catch(error=>{
			reject(error)
		})
	}
}

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb
	
	return new Promise((resolve,reject)=>{
		if (!args._id) {
			reject('No _id value')
		}else if (!mongodb.ObjectID.isValid(args._id)) {
			reject('_id is not a correct ObjectID')
		}else{
			const docID = new mongodb.ObjectID(args._id)

			queryPlace(context, mongodb, docID, resolve, error => {
				queryChangeset(context, mongodb, docID, resolve, reject)
			})
		}
	})
}