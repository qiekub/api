const functions = require('firebase-functions')

const async = require('async')
const fetch = require('node-fetch')

const turf = require('@turf/turf')

const getMongoDbContext = require('../getMongoDbContext.js')
const { addChangeset, compile_places_from_changesets, upsertOne, compileAndUpsertPlace, annotateTags, key_synonyms } = require('../modules.js')

const _presets_ = require('../data/dist/presets.json')
const questionsInSchema = require('../data/dist/questionsInSchema.json')
const sample_response = require('./sample_response.json')


const value_to_functions = {
	text: value => value+'',
	number: value => value*1.0,
	boolean: value => value === 'yes',
}
function value2(inputtype, value) {
	if (value_to_functions[inputtype]) {
		return value_to_functions[inputtype](value)
	}
	return undefined
}

const answersByTag = questionsInSchema.reduce((answersByTag,q) => {
	for (const a of q.properties.possibleAnswers) {
		if (a.inputtype !== 'boolean') { // cause inputtype for booleans is currently ugly
			for (const tagName in a.tags) {
				if (!(!!answersByTag[tagName])) {
					answersByTag[tagName] = []
				}
				answersByTag[tagName].push({
					_id: q._id,
					key: a.key,
					inputtype: a.inputtype,
				})
			}
		}
	}

	return answersByTag
},{})




async function getExistingID(mongodb, tags){
	const tagKeys = Object.keys(tags)

	let scoreStages = []


	// ## unique ids that can change very frequently but stay the same if nothing changed (unique!)
	// (score: ∞)

	if (tags.osm_id) {
		scoreStages.push({
			score: 1000, // could also be Infinity
			if: {
				$and: [
					{$eq: ["$properties.tags.osm_id", tags.osm_id]},
				],
			}
		})
	}


	// ## unique references that won't changed (unique!)
	// (score: 6)

	const refKeys = tagKeys
	.map(key => key.toLowerCase())
	.filter(key => (
		[
			'ISO3166-1', // ISO3166-1 is for countries
			'ISO3166-1:alpha2',
			'ISO3166-1:alpha3',
			'ISO3166-1:numeric',
			'wikidata',
			'iata',
			'icao',
			'fhrs:id',
			'gnis:feature_id', // "A GNIS feature ID is a permanent, unique identifier for a feature in the Geographic Names Information Service (GNIS) database. GNIS is the U.S. federal government's authoritative gazetteer." (source: OSM-Wiki)
			'gnis:id', // same as gnis:feature_id
			'osak:identifier', // Present on all Danish address nodes.
			'gns:id', // "The GEOnet Names Server (GNS) is a database for locations outside the United States and Antarctica." (source: OSM-Wiki)
		].includes(key)
		|| key.startsWith('ref:')
	))
	if (refKeys.length > 0) {
		scoreStages.push({
			score: 6,
			if: {
				$or: refKeys.map(key => {
					return {$eq: ["$properties.tags."+key, tags[key]]}
				})
			}
		})
	}


	// ## geo information that change seldom
	// (score: 5)

	if (tags.lng && tags.lat) {
		scoreStages.push({
			score: 5,
			if: {
				$and: [
					{$gt: ["$properties.geometry.location.lng", tags.lng - 0.00001]},
					{$lt: ["$properties.geometry.location.lng", tags.lng + 0.00001]},
					{$gt: ["$properties.geometry.location.lat", tags.lat - 0.00001]},
					{$lt: ["$properties.geometry.location.lat", tags.lat + 0.00001]},
				],
			}
		})
	}

	const addressKeys = tagKeys.filter(key => key.startsWith('addr:'))
	if (addressKeys.length > 0) {
		scoreStages.push({
			score: 5,
			if: {
				$and: addressKeys.map(key => {
					return {$eq: ["$properties.tags."+key, tags[key]]}
				})
			}
		})
	}


	// ## urls that change rarely and are mostly unique (not neccessarly unique!)
	// (score: 4)

	if (tags.wikipedia) {
		scoreStages.push({
			score: 4,
			if: {
				$and: [
					{$eq: ["$properties.tags.wikipedia", tags.wikipedia]},
				],
			}
		})
	}

	const contactKeys = tagKeys.filter(key => key.startsWith('contact:'))
	if (contactKeys.length > 0) {
		scoreStages.push({
			score: 4,
			if: {
				$or: contactKeys.map(key => {
					if (key_synonyms[key]) {
						return [
							{$eq: ["$properties.tags."+key,               tags[key]]},
							{$eq: ["$properties.tags."+key_synonyms[key], tags[key]]},
						]
					}else{
						return [
							{$eq: ["$properties.tags."+key,               tags[key]]},
						]
					}
				})
				.reduce((acc, array) => acc.concat(array), []) // TODO This should be replaced with flatMap when available.
			}
		})
	}


	// ## properties that can change but identify a place (not neccessarly unique!)
	// (score: 3)
	
	const keys_that_represent_the_name = [
		'official_name',
		'long_name',
		'name',
		'short_name',
		'alt_name',
	]
	const nameKeys = tagKeys.filter(key => (
		keys_that_represent_the_name.includes(key) ||
		keys_that_represent_the_name.some(nameKey => key.startsWith(nameKey+':'))
	))
	if (nameKeys.length > 0) {
		scoreStages.push({
			score: 3,
			if: {
				$or: nameKeys.map(key => {
					return [
						{$eq: ["$properties.tags."+key, tags[key]]},
					]
				})
				.reduce((acc, array) => acc.concat(array), []) // TODO This should be replaced with flatMap when available.
			}
		})
	}


	// ## vague properties that can eventually identify (not neccessarly unique!)
	// (score: 2)
	// TODO see notes.md in the ideas repo for infos


	// ## properties that identify a group of places (not unique but can narrow it down in combination!)
	// (score: 1)
	// TODO see notes.md in the ideas repo for infos



	// wrap the stages in some mongodb stuff:
	scoreStages = scoreStages.map(scoreStage => {
		return {$addFields:{
					score: {
							$add: [
									"$score",
									{$cond:{
											if: scoreStage.if,
											then: scoreStage.score,
											else: 0
									}}
							]
					}
			}}
	})

	return new Promise( (resolve,reject) => {
		mongodb.CompiledPlaces_collection.aggregate([
			{$addFields:{score:0}},
			...scoreStages,
			{$match:{
				score: {$gte:6} // 6 is the score for wikidata. Which should be an exact match. (TODO: Is this number high enough?)
			}},
			{$sort:{
				score: -1
			}},
			{$limit: 1}
		]).toArray((error,docs) => {
			if (error) {
				console.error(error)
			}

			if (error || docs.length === 0) {
				resolve(new mongodb.ObjectID())
			}else{
				resolve(docs[0]._id)
			}
		})
	})
}

async function saveAsChangeset(mongodb, element, finished_callback){
	let tags = {
		...element.tags,
		lat: element.lat,
		lng: element.lon,
		osm_id: element.type+'/'+element.id,
	}


	// Derive new tags from the existing tags (preset, audience, opening_date, ...)
	tags = annotateTags(tags)


	const forID = await getExistingID(mongodb, tags)

	addChangeset(mongodb, {
		forID,
		tags,
		sources: `https://www.openstreetmap.org/${element.type}/${element.id} https://www.openstreetmap.org/changeset/${element.changeset}`,
		fromBot: true,
		dataset: 'osm',
		antiSpamUserIdentifier: 'osm-uid-'+element.uid, // `https://www.openstreetmap.org/user/${element.user}`,
	}, changesetID=>{
		finished_callback(forID)
	}, ()=>{
		finished_callback(forID)
	})
}



function addMissingCenters(all_elements){
	
	if (all_elements.length === 0) {
		return []
	}
	
	const elements_by_id = all_elements.reduce((obj, element) => {
		obj[element.type + '/' + element.id] = element
		return obj
	}, {})
	
	const with_tags = all_elements.filter(element => element.hasOwnProperty('tags'))
	
	if (with_tags.length === 0) {
		return []
	}
	
	
	function node2geo(element) {
		if (!(!!element)) {
			return null
		}
	
		return [element.lon,element.lat]
	}
	function way2geo(element) {
		if (!(!!element)) {
			return null
		}
	
		let nodes = element.nodes.map(id => node2geo(elements_by_id['node/' + id]))
	
		nodes = nodes.filter(v => !!v)
	
		if (nodes.length === 0) {
			return null
		}
	
		return nodes
	}
	function relation2geo(element) {
		if (!(!!element)) {
			return null
		}
	
		let ways = []
	
		for (const member of element.members) {
			if (member.type === 'way') {
				ways.push(
					way2geo(elements_by_id['way/' + member.ref])
				)
			} else if (member.type === 'relation') {
				ways = [
					...ways,
					...relation2geo(elements_by_id['relation/' + member.ref]),
				]
			}
		}
	
		ways = ways.filter(v => !!v)
	
		if (ways.length === 0) {
			return null
		}
	
		return ways
	}
	
	const nodes = with_tags
	.filter(element => element.type === 'node')
	
	const ways = with_tags
	.filter(element => element.type === 'way')
	.map(element => {
		const way = way2geo(element)
		if (!(!!way)) {
			return null
		}
	
		const line = turf.lineString(way)
		const poly = turf.lineToPolygon(line)
		const center = turf.centerOfMass(poly)
		return {
			...element,
			lat: center.geometry.coordinates[1],
			lon: center.geometry.coordinates[0],
		}
	})
	.filter(v => !!v)
	
	const relations = with_tags
	.filter(element => element.type === 'relation')
	.map(element => {
		const ways = relation2geo(element)
		if (!(!!ways)) {
			return null
		}
	
		const poly = turf.multiPolygon([
			ways.map(way => {
				const line = turf.lineString(way)
				const poly = turf.lineToPolygon(line)
				return poly.geometry.coordinates[0]
			})
		])
		const center = turf.centerOfMass(poly)
		return {
			...element,
			lat: center.geometry.coordinates[1],
			lon: center.geometry.coordinates[0],
		}
	})
	.filter(v => !!v)
	
	const new_with_tags = [
		...nodes,
		...ways,
		...relations,
	]
	
	if (new_with_tags.length === 0) {
		return []
	}
	
	return new_with_tags
}



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
		out meta;
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
			
				const placeIDsToRebuild = new Set()
				async.each(elements, (element, callback) => {
					saveAsChangeset(mongodb, element, placeID => {
						placeIDsToRebuild.add(placeID)
						callback()
					})
				}, error => {
					// console.log([...placeIDsToRebuild])
					compileAndUpsertPlace(mongodb, [...placeIDsToRebuild], (error,didItUpsert)=>{
						console.log(`finished`)
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
