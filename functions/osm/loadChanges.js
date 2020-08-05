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
		[out:json][timeout:240][bbox:90,-180,-90,180];
		(
			node(newer:"{{date:1Day}}")[~"^community_centre.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
			node(newer:"{{date:1Day}}")[~"^social_facility.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
			node(newer:"{{date:1Day}}")[~"^lgbtq.*$"~"."];
			node(newer:"{{date:1Day}}")[~"^gay.*$"~"."];
			node(newer:"{{date:1Day}}")[~"^lesbian.*$"~"."];
			node(newer:"{{date:1Day}}")[~"^fetish.*$"~"."];

			way(newer:"{{date:1Day}}")[~"^community_centre.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
			way(newer:"{{date:1Day}}")[~"^social_facility.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
			way(newer:"{{date:1Day}}")[~"^lgbtq.*$"~"."];
			way(newer:"{{date:1Day}}")[~"^gay.*$"~"."];
			way(newer:"{{date:1Day}}")[~"^lesbian.*$"~"."];
			way(newer:"{{date:1Day}}")[~"^fetish.*$"~"."];

			relation(newer:"{{date:1Day}}")[~"^community_centre.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
			relation(newer:"{{date:1Day}}")[~"^social_facility.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
			relation(newer:"{{date:1Day}}")[~"^lgbtq.*$"~"."];
			relation(newer:"{{date:1Day}}")[~"^gay.*$"~"."];
			relation(newer:"{{date:1Day}}")[~"^lesbian.*$"~"."];
			relation(newer:"{{date:1Day}}")[~"^fetish.*$"~"."];
		);
		(._;>;);
		out meta qt;
		out ids bb qt;
		out ids center qt;
	`.replace(/{{date:1Day}}/g, currentDateMinusOneDay)


	// const all_changes_url = `https://overpass-api.de/api/interpreter?data=
	// 	[out:json][timeout:240][bbox:90,-180,-90,180];
	// 	(
	// 		node[~"^community_centre.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
	// 		node[~"^social_facility.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
	// 		node[~"^lgbtq.*$"~"."];
	// 		node[~"^gay.*$"~"."];
	// 		node[~"^lesbian.*$"~"."];
	// 		node[~"^fetish.*$"~"."];
	//
	// 		way[~"^community_centre.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
	// 		way[~"^social_facility.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
	// 		way[~"^lgbtq.*$"~"."];
	// 		way[~"^gay.*$"~"."];
	// 		way[~"^lesbian.*$"~"."];
	// 		way[~"^fetish.*$"~"."];
	//
	// 		relation[~"^community_centre.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
	// 		relation[~"^social_facility.*$"~"(lgbt|homosexual|gay|lesbian|transgender|bisexual)"];
	// 		relation[~"^lgbtq.*$"~"."];
	// 		relation[~"^gay.*$"~"."];
	// 		relation[~"^lesbian.*$"~"."];
	// 		relation[~"^fetish.*$"~"."];
	// 	);
	// 	(._;>;);
	// 	out meta;
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
		console.info(`finished loading ${data.elements.length} elements`)
		return data
	})
	// .catch(error => null)

	// return new Promise(resolve => resolve(result))
}


function loadChanges(){
	console.info('started loading...')

	loadChangesFromOverpass().then(async changes=>{
		if (changes.elements.length > 0) {
			const elements = addMissingCenters(changes.elements)

			if (elements.length > 0) {
				console.info(`${elements.length} elements with tags`)
						
				const mongodb = await getMongoDbContext()
			
				const placeIDsToRebuild = new Set()
				async.each(elements, (element, callback) => {
					let already_called = false
					saveAsChangeset(mongodb, element, placeID => {
						if (!!placeID) {
							placeIDsToRebuild.add(placeID)
						}
						if (!already_called) {
							already_called = true
							callback()
						}
					})
				}, error => {
					if (error) {
						console.error(error)
					}

					placeIDsToRebuild = [...placeIDsToRebuild]
					.map(id => new mongodb.ObjectID(id))

					// console.info('placeIDsToRebuild')
		
					async.each(placeIDsToRebuild, (placeID, each_callback)=>{
						compileAndUpsertPlace(mongodb, [placeID], (error,didItUpsert)=>{
							if (error) {
								console.error(error)
							}
							each_callback()
						})
					}, error=>{
						if (error) {
							console.error(error)
						}
		
						console.info('finished')
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
	// console.info('This will be run one minutes after midnight, every day!')
	loadChanges()
	return null
})

// exports = module.exports = functions.https.onRequest(loadChanges)
