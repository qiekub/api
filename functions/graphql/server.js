const functions = require('firebase-functions')
const getMongoDbContext = require('../getMongoDbContext.js')

const express = require('express')

const compression = require('../github.com-patrickmichalina-compression/index.js') // https://github.com/patrickmichalina/compression
// const shrinkRay = require('shrink-ray')

const ApolloServer = require('apollo-server-express').ApolloServer
const schema = require('./schema')
const resolvers = require('./resolvers')



function gqlServer() {
	const app = express() // this seams faster in a function

	app.use(compression({brotli:{enabled:true,zlib:{}}}))
	// app.use(shrinkRay({brotli:{enabled:true,zlib:{}}}))
	// app.use(shrinkRay({ brotli: { quality: 4 }}))
	// app.use(shrinkRay())

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
			try{
				return {
					mongodb: await getMongoDbContext(),
				}
			}catch (error) {
				console.error(error)
			}

			return null
		},
	}).applyMiddleware({app, path:'/graphql/v1', cors: true})

	return app
}

const runtimeOpts = {
  timeoutSeconds: 20, // 20seconds
  memory: '512MB',
}



exports = module.exports = functions
// .region('europe-west3')
.region('us-central1')
// "Important: Firebase Hosting supports Cloud Functions in us-central1 only."
// source: https://firebase.google.com/docs/hosting/full-config#rewrites
.runWith(runtimeOpts)
.https.onRequest(gqlServer())
