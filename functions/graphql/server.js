// import express from 'express';
// import {ApolloServer} from 'apollo-server-express';

// import schema from './schema';
// import resolvers from './resolvers';

const express = require('express')
const ApolloServer = require('apollo-server-express').ApolloServer
const schema = require('./schema')
const resolvers = require('./resolvers')

const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const ObjectID = mongodb.ObjectID

const mongodb_username = 'graphql_backend'
const mongodb_password = '83J*rQ_c1Mu!h&67xT(8bWYdP2)(4fs7'
const mongodb_uri = encodeURI(`mongodb+srv://${mongodb_username}:${mongodb_password}@qiekub-data-e0sh4.mongodb.net/`) // test?retryWrites=true&w=majority
const mongodb_options = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}

const _ContextChache_ = {}

function getMongoDbContext(){
	return new Promise((resolve,reject)=>{
		if (_ContextChache_.mongodb) {
			resolve(_ContextChache_.mongodb)
		}else{
			MongoClient.connect(mongodb_uri,mongodb_options).then(mongodb_client => {
				const Data_Collection = mongodb_client.db('Graph').collection('QueerTest')
	
				_ContextChache_.mongodb = {
					client: mongodb_client,
					collection: Data_Collection,
					ObjectID: ObjectID,
				}

				resolve(_ContextChache_.mongodb)
			})
		}
	})
}

function gqlServer() {
	const app = express()

	const apolloServer = new ApolloServer({
		typeDefs: schema,
		resolvers,
		// Enable graphiql gui
		introspection: true,
		tracing: true,
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
	}).applyMiddleware({app, path:'/v1', cors: true})

	return app
}

module.exports = gqlServer