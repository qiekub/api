const env = require('node-env-file')
env(`${__dirname}/.env`)

// TODO
// !!!!!! The following object should't be stored within this file or even exist! !!!!!!
// It is here so all secrets are in one place and can be put somewhere else with ease.
// Look into "rotating secrets"
//
// const secrets = {
// 	mongodb_username: process.env.mongodb_username,
// 	mongodb_password: process.env.mongodb_password,
// 	mongodb_server_domain: process.env.mongodb_server_domain,
//
// 	api_key_locationiq: process.env.api_key_locationiq,
// 	api_key_opencagedata: process.env.api_key_opencagedata,
// 	api_key_googleapis: process.env.api_key_googleapis,
// 	api_key_mapquestapi: process.env.api_key_mapquestapi,
// }

const secrets = process.env



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
