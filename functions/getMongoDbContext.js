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
					const names = {
						dbs: {
							Graph: 'Graph',
							Auth: 'Auth',
						},
						collections: {
							Edges: 'Edges',
							CompiledPlaces: 'CompiledPlaces',
							Changesets: 'Changesets',
							Accounts: 'Accounts',
							Profiles: 'Profiles',
							Sessions: 'Sessions',
						}
					}

					const dbs = {
						Graph: mongodb_client.db(names.dbs.Graph),
						Auth: mongodb_client.db(names.dbs.Auth),
					}
					const collections = {
						Edges: dbs.Graph.collection(names.collections.Edges),

						CompiledPlaces: dbs.Graph.collection(names.collections.CompiledPlaces),
						Changesets: dbs.Graph.collection(names.collections.Changesets),

						Accounts: dbs.Graph.collection(names.collections.Accounts),
						Profiles: dbs.Graph.collection(names.collections.Profiles),
						
						Sessions: dbs.Auth.collection(names.collections.Sessions),
					}

					_ContextChache_.mongodb = {
						client: mongodb_client,
						ObjectID: ObjectID,

						names,
						dbs,
						collections,
	
						Edges_collection: collections.Edges,
						CompiledPlaces_collection: collections.CompiledPlaces,
						Changesets_collection: collections.Changesets,
						Accounts_collection: collections.Accounts,
						Profiles_collection: collections.Profiles,
						Sessions_collection: collections.Sessions,
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