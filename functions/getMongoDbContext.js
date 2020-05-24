const secretManager = require('./secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const ObjectID = mongodb.ObjectID

const _ContextChache_ = {}

function getMongoDbContext(){
	return new Promise(async (resolve,reject)=>{
		if (_ContextChache_.mongodb) {
			resolve(_ContextChache_.mongodb)
		}else{
			let mongodb_uri = encodeURI(`mongodb+srv://${await getSecretAsync('mongodb_username')}:${await getSecretAsync('mongodb_password')}@${await getSecretAsync('mongodb_server_domain')}/`) // test?retryWrites=true&w=majority

			if (!mongodb_uri) {
				reject('probably no mongodb rights')
			}else{
				MongoClient.connect(mongodb_uri,{
					useNewUrlParser: true,
					useUnifiedTopology: true,
				}).then(mongodb_client => {
					_ContextChache_.mongodb = {
						client: mongodb_client,
						ObjectID: ObjectID,
	
						CompiledPlaces_collection: mongodb_client.db('Graph').collection('CompiledPlaces'),
						Changesets_collection: mongodb_client.db('Graph').collection('Changesets'),

						Accounts_collection: mongodb_client.db('Graph').collection('Accounts'),
						Profiles_collection: mongodb_client.db('Graph').collection('Profiles'),
					}
	
					resolve(_ContextChache_.mongodb)
				}).catch(error=>{
					console.error(error)
					reject('could not connect to mongodb')
				})
			}
		}
	})
}

module.exports = getMongoDbContext