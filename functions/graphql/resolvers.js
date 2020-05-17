const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json')
const {GraphQLScalarType} = require('graphql')
const {Kind} = require('graphql/language')

// import {
// 	GraphQLDate,
// 	GraphQLTime,
// 	GraphQLDateTime,
// } from 'graphql-iso-date'

const compilePlace = require('./resolvers/compilePlace.js')
// const addSources = require('./resolvers/addSources.js')
const getPlace = require('./resolvers/getPlace.js')
const getChangeset = require('./resolvers/getChangeset.js')
const getPlaces = require('./resolvers/getPlaces.js')
const getMarkers = require('./resolvers/getMarkers.js')
const search = require('./resolvers/search.js')
const addChangeset = require('./resolvers/addChangeset.js')
// const answerQuestion = require('./resolvers/answerQuestion.js')
const getQuestions = require('./resolvers/getQuestions.js')
const isGeoCoordinateLegal = require('./resolvers/isGeoCoordinateLegal.js')

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
			if (!!dbValue) {
				dbValue = [{
					text: dbValue,
					language: null,
				}]
			}else{
				dbValue = []
			}
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

			return dbValue.filter(entry => entry.text !== null && (entry.language === null || currentLocales.includes(entry.language)))
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

	// Date: GraphQLDate,
	// Time: GraphQLTime,
	// DateTime: GraphQLDateTime,

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

		getID: (parent, args, context, info) => (new context.mongodb.ObjectID())+'',

		search,
		isGeoCoordinateLegal,

		getPlace,
		getPlaces,
		getMarkers,
		getChangeset,
		getQuestions,
	},
	Mutation: {
		// addSources,
		addChangeset,
		// answerQuestion,
		compilePlace,
	},

	Place: {
		name: getFilterByLanguageFunction('name'),

		tags: getFilterByKeysFunction('tags'),
		confidences: getFilterByKeysFunction('confidences'),
		changesetIDs: getFilterByKeysFunction('changesetIDs'),
	},

	// Marker: {
	// 	name: getFilterByLanguageFunction('name'),

	// 	// tags: getFilterByKeysFunction('tags'),
	// },

	Question: {
		question: getFilterByLanguageFunction('question'),
		in_one_word: getFilterByLanguageFunction('in_one_word'),
	},

	Answer: {
		title: getFilterByLanguageFunction('title'),
	},
}

