const functions = require('firebase-functions')
const getMongoDbContext = require('../getMongoDbContext.js')

const express = require('express')
const compression = require('../github.com-patrickmichalina-compression/index.js') // https://github.com/patrickmichalina/compression
const ApolloServer = require('apollo-server-express').ApolloServer
const schema = require('./schema')
const resolvers = require('./resolvers')

function gqlServer() {
	const app = express() // this seams faster in a function

	app.use(compression({brotli:{enabled:true,zlib:{}}}))

	const apolloServer = new ApolloServer({
		typeDefs: schema,
		resolvers,
		// Enable graphiql gui
		introspection: true, // (process.env.FUNCTIONS_EMULATOR ? true : false),
		tracing: (process.env.FUNCTIONS_EMULATOR ? true : false),
		playground: {
			endpoint: '/graphql/v1',
			// endpoint: 'https://us-central1-queercenters.cloudfunctions.net/graphql/',
			// endpoint: 'http://localhost:5001/queercenters/us-central1/graphql/',
		},
		context: async ({req}) => {
			return {
				mongodb: await getMongoDbContext(),
			}
		},
	}).applyMiddleware({app, path:'/graphql/v1', cors: true})

	return app
}

exports = module.exports = functions.https.onRequest(gqlServer())