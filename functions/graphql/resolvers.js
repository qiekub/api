const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json')
const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')

const {
	// GraphQLDate,
	// GraphQLTime,
	GraphQLDateTime,
} = require('graphql-iso-date')

const place = require('./resolvers/place.js')
const changeset = require('./resolvers/changeset.js')
const places = require('./resolvers/places.js')
const markers = require('./resolvers/markers.js')
const countries = require('./resolvers/countries.js')
const search = require('./resolvers/search.js')
const addChangeset = require('./resolvers/addChangeset.js')
const questions = require('./resolvers/questions.js')
const countrycode = require('./resolvers/countrycode.js')
const sessions = require('./resolvers/sessions.js')
const accounts = require('./resolvers/accounts.js')
const changesets = require('./resolvers/changesets.js')
const addEdge = require('./resolvers/addEdge.js')
const undecidedPlaces = require('./resolvers/undecidedPlaces.js')
const undecidedTags = require('./resolvers/undecidedTags.js')
const recompile = require('./resolvers/recompile.js')
const similarProjects = require('./resolvers/similarProjects.js')

const { getFilterByKeysFunction, getFilterByLanguageFunction } = require('./functions.js')

module.exports = {
	JSON: GraphQLJSON,
	JSONObject: GraphQLJSONObject,

	// Timestamp: new GraphQLScalarType({
	// 	name: 'Timestamp',
	// 	description: 'Timestamp custom scalar type',
	// 	parseValue(value) {
	// 		return new Date(value) // value from the client
	// 	},
	// 	serialize(value) {
	// 		return value*1 // .getTime() // value sent to the client
	// 	},
	// 	parseLiteral(ast) {
	// 		if (ast.kind === Kind.INT) {
	// 			return new Date(parseInt(ast.value, 10)) // ast value is always in string format
	// 		}
	// 		return null
	// 	},
	// }),

	// Date: GraphQLDate,
	// Time: GraphQLTime,
	DateTime: GraphQLDateTime,

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

		id: (parent, args, context, info) => (new context.mongodb.ObjectID())+'',
		whoami: (parent, args, context, info) => (!!context.profileID ? context.profileID+'' : null),

		search,
		countrycode,
		undecidedPlaces,
		undecidedTags,

		place,
		places,

		changeset,
		changesets,

		country: countries,
		countries,

		markers,
		questions,

		sessions,
		accounts,

		similarProjects,
	},
	Mutation: {
		addChangeset,
		addEdge,
		recompile,
	},

	Edge: {
		tags: getFilterByKeysFunction('tags'),
	},

	Place: {
		name: getFilterByLanguageFunction('name'),
		description: getFilterByLanguageFunction('description'),

		tags: getFilterByKeysFunction('tags'),
		// confidences: getFilterByKeysFunction('confidences'),
		// changesetIDs: getFilterByKeysFunction('changesetIDs'),
	},

	Marker: {
		name: getFilterByLanguageFunction('name'),
		// tags: getFilterByKeysFunction('tags'),
	},

	Question: {
		question: getFilterByLanguageFunction('question'),
		in_one_word: getFilterByLanguageFunction('in_one_word'),
		description: getFilterByLanguageFunction('description'),
	},

	Answer: {
		title: getFilterByLanguageFunction('title'),
	},
}

