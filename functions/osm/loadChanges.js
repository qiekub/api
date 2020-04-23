const functions = require('firebase-functions')
// const getMongoDbContext = require('../getMongoDbContext.js')

// const async = require('async')
const fetch = require('node-fetch')
// const places = require('./data/_places.js')
// const osm_places = require('./data/osm_places.json')

// https://overpass-api.de/api/interpreter?data=[bbox:90,-180,-90,180][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;

async function loadChangesFromOverpass() {
	const currentDateMinusOneDay = "2020-04-20T16:43:16Z" // TODO: added real date string ... new Date()
	
	const url = `https://overpass-api.de/api/interpreter?data=[bbox:90,-180,-90,180][out:json][timeout:240];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"](newer:"${currentDateMinusOneDay}");(node[~"^lgbtq.*$"~"."](newer:"${currentDateMinusOneDay}");-node[~"^lgbtq.*$"~"(welcome|no)"];);(node[~"^gay.*$"~"."](newer:"${currentDateMinusOneDay}");-node[~"^gay.*$"~"(welcome|no)"];);(node[~"^fetish.*$"~"."](newer:"${currentDateMinusOneDay}");-node[~"^fetish.*$"~"(welcome|no)"];););out qt;`

	const result = await fetch(encodeURI(url), {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'qiekub.com',
			'User-Agent': 'qiekub.com',
		},
	})
	.then(res => res.json())
	.then(data => {
		console.log('finished loading', data.elements.length)
	})
	.catch(error => null)

	return new Promise(resolve => resolve(result))
}

function loadOsmData(req, res){
	loadChangesFromOverpass().then(changes=>{
		// TODO
	}, error=>{
		console.error(error)
		res.send(error)
	})
}


// exports = module.exports = functions.https.onRequest(loadOsmData)
