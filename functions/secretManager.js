
// TODO
// !!!!!! The following object should't be stored within this file or even exist! !!!!!!
// It is here so all secrets are in one place and can be put somewhere else with ease.
const secrets = {
	mongodb_username: 'graphql_backend',
	mongodb_password: '83J*rQ_c1Mu!h&67xT(8bWYdP2)(4fs7', // REVOKE
	mongodb_server_domain: 'qiekub-data-e0sh4.mongodb.net',

	api_key_locationiq: '66291d9b656090', // REVOKE
	api_key_opencagedata: '8a904b5af9c3455fadc6360ad48ac99b', // REVOKE
	api_key_googleapis: 'AIzaSyCkhuqMjYusEcCOejNs2lqKrJsP1Y-fj1w', // REVOKE
	api_key_mapquestapi: 'HvexZhJykiXrYIAMAWiLIFJGeDoSmZuK', // REVOKE
}



function getSecretPromise(secretName){
	return new Promise((resolve,reject)=>{
		if (!!secrets[secretName]) {
			resolve(secrets[secretName])
		}else{
			reject('no rights to secret')
		}
	})
}

async function getSecretAsync(secretName){
	try {
		return await getSecretPromise(secretName)
	}catch (error) {
		console.error(error)
	}

	return false
}


module.exports = {
	getSecretAsync,
	getSecretPromise,
}