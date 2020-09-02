const { makeExecutableSchema } = require('apollo-server-express')
// const { addSchemaLevelResolveFunction } = require('apollo-server-express')
const typeDefs = require('./schema.js')
const resolvers = require('./resolvers.js')

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

// const rootResolveFunction = (parent, args, context, info) => {
//   // perform action before any other resolvers
// }

// addSchemaLevelResolveFunction(schema, rootResolveFunction)

module.exports = schema