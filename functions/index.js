// require('dotenv').config()

// console.log('process.env', process.env.FUNCTIONS_EMULATOR)

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'graphql') {
	exports.graphql = require('./graphql/FirebaseFunction.js')
}

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'loadChanges') {
	exports.loadChanges = require('./osm/loadChanges.js')
}

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'loadBoundaries') {
	exports.loadBoundaries = require('./osm/loadBoundaries.js')
}

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'auth') {
	exports.auth = require('./auth/server.js')
}