// require('dotenv').config()

// console.log('process.env', process.env.FUNCTIONS_EMULATOR)

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'graphql') {
	exports.graphql = require('./graphql/server.js')
}

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'loadChanges') {
	exports.loadChanges = require('./osm/loadChanges.js')
}

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'account') {
	exports.account = require('./account/server.js')
}