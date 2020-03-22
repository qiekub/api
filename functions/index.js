require('dotenv').config()

// console.log('process.env', process.env.FUNCTIONS_EMULATOR)

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'graphql') {
	exports.graphql = require('./graphql/server.js')
}

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'loadOsmData') {
	// TODO this should be timed
	exports.loadOsmData = require('./osm/loadData.js')

	// exports.loadOsmData = functions.https.onRequest((req, res) => {	
	// 	loadOsmData(()=>{
	// 		res.send(JSON.stringify(Object.keys(mongodb),null,4))
	// 	})
	// })
}
