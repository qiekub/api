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

		search: search,

		getPlace: getPlace,
		getPlaces: getPlaces,
		getMarkers: async (parent, args, context, info) => {
			return (await getPlaces(parent, args, context, info)).map(doc=>{
				return {
					_id: doc._id,
					name: doc.properties.name,
					lng: doc.properties.geometry.location.lng,
					lat: doc.properties.geometry.location.lat,
					tags: doc.properties.tags,
				}
			})
		},
	},
	Mutation: {
		addChangeset: addChangeset,
	},

	Place: {
		tags: (parent, args, context, info) => {
			if (!!args.keys && args.keys.length > 0) {
				const keys = args.keys
				return Object.entries(parent.tags).filter(pair=>keys.includes(pair[0])).reduce((obj,pair)=>{
					obj[pair[0]] = pair[1]
					return obj
				},{})
			}

			return parent.tags
		},
	},

	Marker: {
		tags: (parent, args, context, info) => {
			if (!!args.keys && args.keys.length > 0) {
				const keys = args.keys
				return Object.entries(parent.tags).filter(pair=>keys.includes(pair[0])).reduce((obj,pair)=>{
					obj[pair[0]] = pair[1]
					return obj
				},{})
			}

			return parent.tags
		},
	},


}