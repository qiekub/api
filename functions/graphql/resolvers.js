const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json')
const {GraphQLScalarType} = require('graphql')
const {Kind} = require('graphql/language')

const getPlace = require('./resolvers/getPlace.js')
const getPlaces = require('./resolvers/getPlaces.js')
const search = require('./resolvers/search.js')
const addChangeset = require('./resolvers/addChangeset.js')

module.exports = {
	JSON: GraphQLJSON,
	JSONObject: GraphQLJSONObject,
	Timestamp: new GraphQLScalarType({
		name: 'Timestamp',
		description: 'Timestamp custom scalar type',
		parseValue(value) {
			return new Date(value) // value from the client
		},
		serialize(value) {
			return value*1 // .getTime() // value sent to the client
		},
		parseLiteral(ast) {
			if (ast.kind === Kind.INT) {
				return new Date(parseInt(ast.value, 10)) // ast value is always in string format
			}
			return null
		},
	}),

	Properties: {
		__resolveType(obj, context, info){
			if (obj.__typename) {
				return obj.__typename
			}
			return 'Error'
		},
	},

	Query: {
		// hello: (parent, args, context, info) => 'world',
		// "lgbtq:welcomes": (parent, args, context, info) => 'All are welcome!',

		search: search,
		getPlace: getPlace,
		getPlaces: getPlaces,
	},
	Mutation: {
		addChangeset: addChangeset,
	},

}
