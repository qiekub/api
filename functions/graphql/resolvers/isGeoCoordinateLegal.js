const { isGeoCoordinateLegalPromise } = require('../../modules.js')

module.exports = async (parent, args, context, info) => {
	return isGeoCoordinateLegalPromise(args.lng, args.lat)
}