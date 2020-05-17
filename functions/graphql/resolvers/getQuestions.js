const async = require('async')

const questionsInSchema = require('../../data/dist/questionsInSchema.json')

module.exports = async (parent, args, context, info) => {
	const mongodb = context.mongodb

	return questionsInSchema
}