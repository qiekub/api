const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const ObjectID = mongodb.ObjectID

const mongodb_username = 'graphql_backend'
const mongodb_password = '83J*rQ_c1Mu!h&67xT(8bWYdP2)(4fs7'
const mongodb_uri = encodeURI(`mongodb+srv://${mongodb_username}:${mongodb_password}@qiekub-data-e0sh4.mongodb.net/`) // test?retryWrites=true&w=majority
const mongodb_options = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}

const _ContextChache_ = {}

function getMongoDbContext(){
	return new Promise((resolve,reject)=>{
		if (_ContextChache_.mongodb) {
			resolve(_ContextChache_.mongodb)
		}else{
			MongoClient.connect(mongodb_uri,mongodb_options).then(mongodb_client => {
				_ContextChache_.mongodb = {
					client: mongodb_client,
					ObjectID: ObjectID,

					collection: mongodb_client.db('Graph').collection('QueerCenters'),
					OsmCache_collection: mongodb_client.db('Graph').collection('OsmCache'),
					Answers_collection: mongodb_client.db('Graph').collection('Answers'),
					Questions_collection: mongodb_client.db('Graph').collection('Questions'),
				}

				resolve(_ContextChache_.mongodb)
			})
		}
	})
}

module.exports = getMongoDbContext