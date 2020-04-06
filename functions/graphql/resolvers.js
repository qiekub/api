const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json')
const {GraphQLScalarType} = require('graphql')
const {Kind} = require('graphql/language')

const getPlace = require('./resolvers/getPlace.js')
const getPlaces = require('./resolvers/getPlaces.js')
const search = require('./resolvers/search.js')
const addChangeset = require('./resolvers/addChangeset.js')
const answerQuestion = require('./resolvers/answerQuestion.js')
const getQuestions = require('./resolvers/getQuestions.js')

const { negotiateLanguages } = require('@fluent/langneg')

function getFilterByKeysFunction(graphqlKey){
	return (parent, args, context, info) => {
		if (!!args.keys && args.keys.length > 0) {
			const keys = args.keys
			return (
				Object.entries(parent[graphqlKey])
				// .filter(pair => keys.includes(pair[0]))
				// .reduce((obj,pair)=>{
				// 	obj[pair[0]] = pair[1]
				// 	return obj
				// },{})
				.reduce((obj,pair)=>{
					const truth = keys.reduce((bool,key) => {
						return bool || pair[0].startsWith(key) // || `"${pair[0]}"` === key
					},false)

					if (truth) {
						obj[pair[0]] = pair[1]
					}
					
					return obj
				},{})
			)
		}
		return parent[graphqlKey]
	}
}

function getFilterByLanguageFunction(graphqlKey){
	return (parent, args, context, info) => {
		let dbValue = parent[graphqlKey]
		if (!(
			!!dbValue && Array.isArray(dbValue)
		)) {
			dbValue = [{
				text: dbValue,
				language: null,
			}]
		}

		// if (!!args.languages && args.languages.length > 1) { // should have more than one entry. Otherwise, theres nothing to filter about
		// 	const languages = args.languages // [...new Set(args.languages).add('en')] // make sure english i ever returned as the default language
		// 	return dbValue.filter(entry => entry.language === null || languages.includes(entry.language))
		// }

		if (!!args.languages && args.languages.length > 1) {
			const currentLocales = negotiateLanguages(
				args.languages,
				dbValue.map(entry => entry.language).filter(language => language !== null),
				{ defaultLocale: 'en' }
			)

			return dbValue.filter(entry => entry.language === null || currentLocales.includes(entry.language))
		}

		return dbValue
	}
}

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

		search,

		getPlace,
		getPlaces,
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

		getQuestions,
	},
	Mutation: {
		addChangeset,
		answerQuestion,
	},

	Place: {
		name: getFilterByLanguageFunction('name'),

		tags: getFilterByKeysFunction('tags'),
		confidences: getFilterByKeysFunction('confidences'),
	},

	Marker: {
		name: getFilterByLanguageFunction('name'),

		tags: getFilterByKeysFunction('tags'),
	},

	Question: {
		question: getFilterByLanguageFunction('question'),
	},

	Answer: {
		title: getFilterByLanguageFunction('title'),
	},


}