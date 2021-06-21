const getMongoDbContext = require('../getMongoDbContext.js')

const express = require('express')
const { session_middleware, add_profileID_middleware } = require('../modules.js')

const compression = require('../github.com-patrickmichalina-compression/index.js') // https://github.com/patrickmichalina/compression
// const shrinkRay = require('shrink-ray')

const ApolloServer = require('apollo-server-express').ApolloServer
const executableSchema = require('./executableSchema.js')

const { authMiddleware } = require('../auth/server.js')


function gqlServer() {
	let app = express() // this seams faster in a function

	app.use((req, res, next) => {
		res.set({
			'vary': 'Origin',
			'access-control-allow-origin': req.headers.origin, // Also set via: uberspace web header set / "Access-Control-Allow-Origin" "qiekub.org"
			// 'Access-Control-Allow-Methods': '*',
			// 'Access-Control-Allow-Headers': '*',
		})
		next()
	})

	app.use(compression({brotli:{enabled:true,zlib:{}}}))
	// app.use(shrinkRay({brotli:{enabled:true,zlib:{}}}))
	// app.use(shrinkRay({ brotli: { quality: 4 }}))
	// app.use(shrinkRay())

	app = authMiddleware(app)

	app.use(express.static('../../public'))

	app.use(session_middleware)
	app.use(add_profileID_middleware)

	const apolloServer = new ApolloServer({
		schema: executableSchema,
		// Enable graphiql gui
		introspection: true, // (process.env.FUNCTIONS_EMULATOR ? true : false),
		tracing: (process.env.FUNCTIONS_EMULATOR ? true : false),
		playground: {
			settings: {
				'request.credentials': 'same-origin',
				'prettier.tabWidth': 4,
				'prettier.useTabs': true,
			},
			endpoint: '/graphql/v1',
			// endpoint: 'https://us-central1-queercenters.cloudfunctions.net/graphql/',
			// endpoint: 'http://localhost:5001/queercenters/us-central1/graphql/',
		},
		context: async ({req}) => {
			try{
				return {
					mongodb: await getMongoDbContext(),
					profileID: req.profileID,
				}
			}catch (error) {
				console.error(error)
			}

			return null
		},
	}).applyMiddleware({app, path:'/graphql/v1', cors: true})

	return app
}

exports = module.exports = gqlServer
