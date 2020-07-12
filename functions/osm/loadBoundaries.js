const functions = require('firebase-functions')

const async = require('async')
const fetch = require('node-fetch')

const getMongoDbContext = require('../getMongoDbContext.js')
const { compileAndUpsertPlace, saveAsChangeset, addMissingCenters } = require('../modules.js')



async function loadChangesFromOverpass() {

	const d = new Date()
	d.setDate(d.getDate()-1) // no minus one day
	d.setUTCHours(0,0,0,0) // Set the time to midnight. So the script is independent of the exact time it gets started.

	const currentDateMinusOneDay = d.toISOString() // 2020-04-20T00:00:00Z

	const last_day_changes_url = `https://overpass-api.de/api/interpreter?data=
		[out:json][timeout:2400][bbox:90,-180,-90,180];
		relation(newer:"{{date:1Day}}")["admin_level"="2"]["type"="boundary"]["boundary"="administrative"];
		out meta qt;
		out ids bb qt;
		out ids center qt;
	`.replace(/{{date:1Day}}/g, currentDateMinusOneDay)


	// const all_changes_url = `https://overpass-api.de/api/interpreter?data=
	// 	[out:json][timeout:2400][bbox:90,-180,-90,180];
	// 	relation["admin_level"="2"]["type"="boundary"]["boundary"="administrative"];
	// 	out meta qt;
	// 	out ids bb qt;
	// 	out ids center qt;
	// `

	return fetch(encodeURI(last_day_changes_url), {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'qiekub.com',
			'User-Agent': 'qiekub.com',
		},
	})
	.then(res => res.json())
	.then(data => {
		console.log(`finished loading ${data.elements.length} elements`)
		return data
	})
	// .catch(error => null)

	// return new Promise(resolve => resolve(result))
}

function loadChanges(){
	console.log('started loading...')

	loadChangesFromOverpass().then(async changes=>{
		if (changes.elements.length > 0) {
			const elements = addMissingCenters(changes.elements)

			if (elements.length > 0) {
				console.log(`${elements.length} elements with tags`)

				const mongodb = await getMongoDbContext()
				
				let placeIDsToRebuild = new Set()
				async.each(elements, (element, callback) => {
					saveAsChangeset(mongodb, element, placeID => {
						placeIDsToRebuild.add(placeID+'')
						callback()
					})
				}, error => {
					placeIDsToRebuild = [...placeIDsToRebuild]
					.map(id => new mongodb.ObjectID(id))

					console.log(placeIDsToRebuild)
		
					async.each(placeIDsToRebuild, (placeID, each_callback)=>{
						compileAndUpsertPlace(mongodb, [placeID], (error,didItUpsert)=>{
							each_callback()
						})
					}, error=>{
						if (error) {
							console.error(error)
						}
		
						console.log('finished')
						mongodb.client.close()
					})
				})
			}else{
				console.error('no elements')
			}
		}
	}, error=>{
		console.error(error)
	})
}

// loadChanges()

const runtimeOpts = {
  timeoutSeconds: 540, // 540seconds = 9minutes
  memory: '256MB',
}

exports = module.exports = functions
.region('europe-west2')
.runWith(runtimeOpts)
.pubsub.schedule('1 0 * * *').onRun(context => {
	// console.log('This will be run one minutes after midnight, every day!')
	loadChanges()
	return null
})

// exports = module.exports = functions.https.onRequest(loadChanges)
