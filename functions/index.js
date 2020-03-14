require('dotenv').config()

// import {https} from 'firebase-functions'
// import gqlServer from './graphql/server'

const functions = require('firebase-functions')
const gqlServer = require('./graphql/server')

const server = gqlServer()

// Graphql api
// https://us-central1-<project-name>.cloudfunctions.net/api/
exports.graphql = functions.https.onRequest(server)