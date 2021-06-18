const flatten = require('flat')
const async = require('async')

const questionsInSchema = require('./data/dist/questionsInSchema.json')
const questionsInSchemaById = questionsInSchema.reduce((obj,question)=>{
	obj[question._id] = question
	return obj
}, {})

const _presets_ = require('./data/dist/presets.json')

const getMongoDbContext = require('./getMongoDbContext.js')
const secretManager = require('./secretManager.js')
const getSecretAsync = secretManager.getSecretAsync
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)

const turf = require('@turf/turf')


function ObjectFromEntries(entries) {
	// Should be replaced with Object.fromEntries() when available
	const obj = {}
	for (const entry of entries) {
		obj[entry[0]] = entry[1]
	}
	return obj
}

function addAnswer(mongodb, properties, resolve, reject){
	mongodb.Answers_collection.insertOne({
		__typename: 'Doc',
		properties: {
			...properties,
			__typename: 'Answer',
		},
		metadata: {
			created: new Date(),
			lastModified: new Date(),
			__typename: 'Metadata',
		},
	}).then(result => {
		if (!!result.insertedId) {
			resolve(result.insertedId)
		}else{
			reject(null)
		}
	}).catch(error=>{
		console.error(error)
	})
}

function addChangeset(mongodb, properties, resolve, reject){
	mongodb.Changesets_collection.insertOne({
		__typename: 'Doc',
		properties: {
			...properties,
			__typename: 'Changeset',
		},
		metadata: {
			created: new Date(),
			lastModified: new Date(),
			__typename: 'Metadata',
		},
	}).then(result => {
		if (!!result.insertedId) {
			resolve(result.insertedId)
		}else{
			reject(null)
		}
	}).catch(error=>{
		console.error(error)
	})
}

function upsertOne(collection,doc,callack){
	if (doc && doc.properties && doc.properties.__typename) {
		collection.findOne({
			_id: doc._id,
			'properties.__typename': doc.properties.__typename,
		}).then(result => {
			if (result === null) {
				collection.insertOne({
					...doc,
					metadata: {
						created: new Date,
						lastModified: new Date,
						__typename: 'Metadata',
					},
				}).then(result => {
					callack(result.insertedId || null)
				}).catch(error=>{
					console.error(error)
					callack(null)
				})
			}else{
				const flattendProperties = Object.entries(flatten(doc.properties,{safe:1})).map(v=>['properties.'+v[0],v[1]])
			
				const toSet = flattendProperties.filter(entry=>entry[1]!==null)
				const toUnset = flattendProperties.filter(entry=>entry[1]===null)
			
				const operations = {
					// $currentDate: {
					// 	'metadata.lastModified': true,
					// },
					// $setOnInsert: {
					// 	metadata: {
					// 		created: new Date(),
					// 		lastModified: new Date(),
					// 		__typename: 'Metadata',
					// 	},
					// },
				}
				if (toSet.length > 0) {
					toSet.push(['metadata.lastModified',new Date()])
					operations.$set = ObjectFromEntries(toSet)
				}
				if (toUnset.length > 0) {
					operations.$unset = ObjectFromEntries(toUnset)
				}

				collection.updateOne({
					_id: doc._id,
					'properties.__typename': doc.properties.__typename,
				}, operations).then(result => {
					callack(result.upsertedId || doc._id || null)
				}).catch(error=>{
					console.error(error)
					callack(null)
				})
			}
		}).catch(error=>{
			console.error(error)
			callack(null)
		})

		// collection.updateOne({
		// 	_id: doc._id || undefined,
		// 	'properties.__typename': doc.properties.__typename,
		// }, operations, {upsert:true}).then(result => {
		// 	callack(result.upsertedId || doc._id || false)
		// }).catch(error=>{
		// 	console.error('error', error)
		// 	callack(false)
		// })
	}else{
		callack(null)
	}
}

function filterOutliers(numbers){
	// https://clevercalcul.wordpress.com/2016/02/16/wie-du-ausreisser-in-deiner-datenreihe-findest/
	// https://anleitung-tipps.anleiter.de/wie-berechnet-man-quartile/

	numbers.sort((a,b) => a-b)
	
	const terciles_1_pos = Math.round(0.333*(numbers.length+1)) // terciles to have more room at the edges
	const terciles_2_pos = Math.floor(0.666*(numbers.length+1))
	const quartil_abstand = numbers[terciles_2_pos] - numbers[terciles_1_pos]
	const antenne_min = numbers[terciles_1_pos] - quartil_abstand
	const antenne_max = numbers[terciles_2_pos] + quartil_abstand

	return numbers.filter(number => number >= antenne_min && number <= antenne_max)
}


function compile_places_from_changesets(mongodb, placeIDs, callback){
	if (!(!!placeIDs) || placeIDs.length === 0) {
		callback(new Error('missing placeIDs'), [])
	}else{

	mongodb.Changesets_collection.aggregate([
		{$match:{
			"properties.forID": {$in: placeIDs},
		}},
		{$lookup:{
			from: 'Edges',
			let: {
				changesetID: '$_id',
			},
			pipeline: [
				{$match:{
					$expr:{$and:[
						{$in: ['$properties.edgeType', ["approved", "rejected", "deleted"]] },
						{$eq: ['$properties.toID',  '$$changesetID']},
					]}
				}},
				{$sort:{
					"metadata.lastModified": 1,
				}},
				{$limit: 1},
				{$project:{
					_id: false,
					edgeType: '$properties.edgeType',
				}},
			],
			as: 'edges_doc',
		}},

		{$set:{
			"tags": { $objectToArray: "$properties.tags" },
			"forID": "$properties.forID",
			"antiSpamUserIdentifier": "$properties.antiSpamUserIdentifier",
			"lastModified": "$metadata.lastModified",
			"edge_doc": { $arrayElemAt: [ "$edges_doc", 0 ] },
		}},
		{$unset: ["__typename","properties","metadata","edges_doc"]},

		{$unwind: "$tags"},
		{$set:{
			"key": "$tags.k",
			"value": "$tags.v",
		}},
		{$unset: "tags"},

		{$lookup:{
			from: 'Edges',
			let: {
				changesetID: '$_id',
				tagKey: '$key',
			},
			pipeline: [
				{$match:{
					$expr:{$and:[
						{$in: ['$properties.edgeType', ["approvedTag", "rejectedTag"]] },
						{$eq: ['$properties.toID',  '$$changesetID']},
						{$eq: ['$properties.tags.forTag',  '$$tagKey']},
					]}
				}},
				{$sort:{
					"metadata.lastModified": 1,
				}},
				{$limit: 1},
				{$project:{
					_id: true,
					edgeType: '$properties.edgeType',
				}},
			],
			as: 'edges_tags',
		}},

		{$set:{
			"edge_tag": { $arrayElemAt: [ "$edges_tags", 0 ] },
		}},
		{$set:{
			"doc_decision": '$edge_doc.edgeType',
			"tag_decision": '$edge_tag.edgeType',
		}},
		{$set:{
			doc_decision: { $ifNull: [ "$doc_decision", null ] },
			tag_decision: { $ifNull: [ "$tag_decision", null ] },
		}},
		{$unset: ['edges_tags','edge_doc','edge_tag']},


		// only get approved key-value pairs
		{$match:{
			$expr:{$and:[
				{$ne: ['$doc_decision', 'deleted']},
				{$ne: ['$doc_decision', 'rejected']},
				{$ne: ['$tag_decision', 'rejectedTag']},
				{$or:[
					{$eq: ['$doc_decision', 'approved']},
					{$eq: ['$tag_decision', 'approvedTag']},
				]},
			]}
		}},


		// START restrict to the latest answer per antiSpamUserIdentifier (and place and key).
		{$sort:{
			"lastModified": -1,
			"_id": 1,
		}},
		{$group:{
			_id: {$concat:[
				{$toString:"$forID"},
				"_",
				{$toString:"$key"},
			]},
			doc: {$first:"$$ROOT"},
		}},
		{$replaceRoot:{newRoot:"$doc"}},
		{$unset: 'antiSpamUserIdentifier'},
		// END restrict to the latest answer per antiSpamUserIdentifier (and place and key).
	])
	.toArray((error,docs)=>{

		if (error) {
			console.error(error)
		}

		if (!(!!docs)) {
			docs = []
		}

		docs = docs
		.filter(doc => doc.tag_decision !== 'rejectedTag')

		docs = docs
		.reduce((obj,doc)=>{
			const placeID = doc.forID
			const key = doc.key
			const value = doc.value

			if (!obj[placeID]) {
				obj[placeID] = {
					_id: placeID,
					__typename: 'Doc',
					properties: {
						__typename: 'Place',
						tags: {},
					}
				}
			}

			if (!(!!obj[placeID].properties.tags[key])) {
				if (
					!isNaN(value)
					&& typeof value !== 'boolean'
					&& (doc.key === 'lat' || key === 'lng')
				) {
					obj[placeID].properties.tags[key] = value*1
				}else{
					obj[placeID].properties.tags[key] = value
				}
			}

			return obj
		},{})


		docs = Object.values(docs)
		// .map(doc => {
		// 	// Add name and geometry properties.
		//
		// 	doc.properties.name = []
		// 	if (doc.properties.tags.name) {
		// 		doc.properties.name.push({
		// 			__typename: 'Text',
		// 			language: null,
		// 			text: doc.properties.tags.name,
		// 		})
		// 	}
		// 	const name_keys = Object.keys(doc.properties.tags).filter(key => key.startsWith('name:'))
		// 	for (let key of name_keys) {
		// 		doc.properties.name.push({
		// 			__typename: 'Text',
		// 			language: key.split(':')[1],
		// 			text: doc.properties.tags[key],
		// 		})
		// 	}
		//
		// 	doc.properties.geometry = {
		// 		__typename: 'GeoData',
		// 	}
		// 	if (doc.properties.tags.lat && doc.properties.tags.lng) {
		// 		doc.properties.geometry.location = {
		// 			__typename: 'GeoCoordinate',
		// 			lat: doc.properties.tags.lat,
		// 			lng: doc.properties.tags.lng,
		// 		}
		// 	}
		// 	if (
		// 		doc.properties.tags['bounds:east']
		// 		&& doc.properties.tags['bounds:north']
		// 		&& doc.properties.tags['bounds:west']
		// 		&& doc.properties.tags['bounds:south']
		// 	) {
		// 		doc.properties.geometry.boundingbox = {
		// 			__typename: 'Boundingbox',
		// 			northeast: {
		// 				__typename: 'GeoCoordinate',
		// 				lng: doc.properties.tags['bounds:east'],
		// 				lat: doc.properties.tags['bounds:north'],
		// 			},
		// 			southwest: {
		// 				__typename: 'GeoCoordinate',
		// 				lng: doc.properties.tags['bounds:west'],
		// 				lat: doc.properties.tags['bounds:south'],
		// 			},
		// 		}
		// 	}
		//
		// 	return doc
		// })

		callback(null,docs)
	})
	}
}

function compileAndUpsertPlace(mongodb, placeIDs, finished_callback) {
	compile_places_from_changesets(mongodb, placeIDs, (error,docs)=>{
		if (error) {
			console.error(error)
			finished_callback(error, false)
		}else{
			async.each(docs, (doc, callback) => {
				upsertOne(mongodb.CompiledPlaces_collection, doc, docID=>{
					callback()
				})
			}, error => {
				if (error) {
					console.error(error)
					finished_callback(error, false)					
				}else{
					finished_callback(null, true)
				}
			})
		}
	})
}


function getPreset(tags) {
	const tags_keys = Object.keys(tags)
	for (const preset_key in _presets_) {
		const preset_tags = _presets_[preset_key].tags
		const preset_tags_keys = Object.keys(preset_tags)

		const common_keys = preset_tags_keys.filter(key => tags_keys.includes(key))

		if (common_keys.length === preset_tags_keys.length) {
			const okay_keys = common_keys.filter(key => preset_tags[key] === '*' || tags[key].includes(preset_tags[key]))
			if (okay_keys.length === preset_tags_keys.length) {
				return {
					key: preset_key,
					..._presets_[preset_key],
				}
			}
		}
	}


	return {
		"key": "",
		"tags_length": 0,
		"max_tag_value_length": 0,
		"tags": {},
		"name": {},
		"terms": {}
	}
	// return _presets_[Object.keys(_presets_)[0]]
}

function getAudienceTags(tags){
	// queer:ally

	const audience_values_synonyms = {
		only			: 'only',
		primary			: 'primary',
		lgbtq			: 'primary',
		gay				: 'primary',
		majority		: 'primary',
		gay_and_friends	: 'primary',
		welcome			: 'welcome',
		yes				: 'welcome',
		friendly		: 'welcome',
	}

	const audience_sub_keys_synonyms = {
		'lgbtq'					: 'queer',
		'gay'					: 'queer',
		'gay:women'				: 'women',
		'lgbtq:women'			: 'women',
		'lgbtq:female'			: 'women',
		'gay:men'				: 'men',
		'lgbtq:men'				: 'men',
		'lgbtq:male'			: 'men',
		'gay:transgender'		: 'trans',
		'homosexual'			: 'sexuality:gay',
		'bisexual'				: 'sexuality:bi',
		'juvenile'				: 'youth',
		'youth_centre'			: 'youth',
		// 'lgbtq:bears'			: 'bears',
		// 'lgbtq:cruising'		: 'queer:cruising',
	}

	const specialTag_synonyms = {
		'community_centre:for': {
			homosexual:		{'queer': 'primary', 'sexuality:gay': 'primary'},
			bisexual:		{'queer': 'primary', 'sexuality:bi': 'primary'},
			transgender:	{'queer': 'primary', 'trans': 'primary'},
			lgbtq:			{'queer': 'primary'},
			juvenile:		{'youth': 'primary'},
		},
		'community_centre': {
			youth_centre:	{'youth': 'primary'},
			lgbtq:			{'queer': 'primary'},
		},
		'social_facility:for': {
			homosexual:		{'queer': 'primary', 'sexuality:gay': 'primary'},
			bisexual:		{'queer': 'primary', 'sexuality:bi': 'primary'},
			transgender:	{'queer': 'primary', 'trans': 'primary'},
			lgbtq:			{'queer': 'primary'},
			juvenile:		{'youth': 'primary'},
		},
		'type': {
			gay:			{'queer': 'primary'},
			lgbtq:			{'queer': 'primary'},
		},
		'sauna': {
			gay:			{'queer': 'primary'},
			lgbtq:			{'queer': 'primary'},
		},
		'club': {
			gay:			{'queer': 'primary'},
			lgbtq:			{'queer': 'primary'},
		},
		'audience': {
			gay:			{'queer': 'primary'},
			gay_and_friends:{'queer': 'primary', 'allies': 'primary'},
		},
		'gayfriendly': {
			yes:			{'queer': 'welcome'},
		},
		'gay': {
			men:			{'queer': 'welcome', 'men': 'primary'},
			women:			{'queer': 'welcome', 'men': 'primary'},
		},
		'gay:men': {
			welcome:		{'queer': 'welcome', 'men': 'welcome'},
			yes:			{'queer': 'welcome', 'men': 'welcome'},
			only:			{'queer': 'welcome', 'men': 'only'},
		},
		'gay:women': {
			welcome:		{'queer': 'welcome', 'women': 'welcome'},
			yes:			{'queer': 'welcome', 'women': 'welcome'},
			only:			{'queer': 'welcome', 'women': 'only'},
		},
		'lgbtq': {
			yes:			{'queer': 'primary'},
		},
		'gay:only': {
			no:				{'allies': 'welcome'},
		}
	}

	const value_levels = {
		only: 4,
		primary: 3,
		welcome: 2,
		no: 1,
	}


	const audienceTags = {}

	for (const entry of Object.entries(tags)) {
		const key = entry[0]
		const value = entry[1]

		if (audience_sub_keys_synonyms[key] && audience_values_synonyms[value]) {
			const currentValue = audienceTags[audience_sub_keys_synonyms[key]]
			const newValue = audience_values_synonyms[value]
			if (!(!!value_levels[currentValue]) || value_levels[currentValue] <= value_levels[newValue]) {
				audienceTags[audience_sub_keys_synonyms[key]] = newValue
			}
		}

		if (specialTag_synonyms[key]) {
			const values = entry[1].split(';')
			const specialTags_values = Object.keys(specialTag_synonyms[key]).filter(value => values.includes(value))
			for (const value of specialTags_values) {
				const newTags = specialTag_synonyms[key][value]
				for (const key of Object.keys(newTags)) {
					const currentValue = audienceTags[key]
					const newValue = newTags[key]
					if (!(!!value_levels[currentValue]) || value_levels[currentValue] <= value_levels[newValue]) {
						audienceTags[key] = newValue
					}
				}
			}
		}
	}


	return ObjectFromEntries(
		Object.entries(audienceTags)
		.map(entry => ['audience:'+entry[0], entry[1]]) // add the audience namespace
	)

	// return {
	// 	tags: audienceTags,
	// 	only: Object.entries(audienceTags).filter(entry => entry[0] !== 'queer' && entry[1] === 'only').map(entry => entry[0]),
	// 	primary: Object.entries(audienceTags).filter(entry => entry[0] !== 'queer' && entry[1] === 'primary').map(entry => entry[0]),
	// 	welcome: Object.entries(audienceTags).filter(entry => entry[0] !== 'queer' && entry[1] === 'welcome').map(entry => entry[0]),
	// }
}

function getDateTags(tags) {
	const newTags = {}

	if (!tags['opening_date'] && tags['start_date']) {
		newTags['opening_date'] = tags['start_date']
	}
	if (!tags['closing_date'] && tags['end_date']) {
		newTags['closing_date'] = tags['end_date']
	}

	return newTags
}

let key_synonyms = {
	'website': 'contact:website',
	'phone': 'contact:phone',
	'email': 'contact:email',
	'facebook': 'contact:facebook',
	'twitter': 'contact:twitter',
	'youtube': 'contact:youtube',
	'instagram': 'contact:instagram',
	'yelp': 'contact:yelp',
}
key_synonyms = {
	...key_synonyms,
	...(Object.entries(key_synonyms).reduce((key_synonyms_swapped, entry) => {
		key_synonyms_swapped[entry[1]] = entry[0]
		return key_synonyms_swapped
	}, {}))
}
function annotateTags(tags){
	// add tag synonyms
	const tagKeys = Object.keys(tags)
	for (const tagKey of tagKeys) {
		if (key_synonyms[tagKey]) {
			tags[key_synonyms[tagKey]] = tags[tagKey]
		}
	}

	let newTags = {
		...getAudienceTags(tags),
		...getDateTags(tags),
	}

	const preset = getPreset(tags)
	if (preset.key) {
		newTags.preset = preset.key
	}

	return {
		...tags,
		...newTags,
	}
}

function annotateDoc(doc){
	const tags = doc.properties.tags

	doc.properties.name = Object.entries(tags)
	.filter(([key, value]) => key === 'name' || key.startsWith('name:'))
	.map(([key, value]) => {
		const parts = key.split(':')
		return {
			__typename: 'Text',
			text: value,
			language: parts.length > 1 ? parts[1] : null,
		}
	})

	doc.properties.description = Object.entries(tags)
	.filter(([key, value]) => key === 'description' || key.startsWith('description:'))
	.map(([key, value]) => {
		const parts = key.split(':')
		return {
			__typename: 'Text',
			text: value,
			language: parts.length > 1 ? parts[1] : null,
		}
	})

	doc.properties.geometry = {
		__typename: 'GeoData',
	}
	if (tags.lng && tags.lng) {
		doc.properties.geometry.location = {
			__typename: 'GeoCoordinate',
			lng: tags.lng,
			lat: tags.lat,
		}
	}
	if (
		tags['bounds:north']
		&& tags['bounds:south']
		&& tags['bounds:east']
		&& tags['bounds:west']
	) {
		doc.properties.geometry.boundingbox = {
			__typename: 'GeoCoordinate',
			northeast: {
				__typename: 'GeoCoordinate',
				lng: tags['bounds:north'],
				lat: tags['bounds:east'],
			},
			southwest: {
				__typename: 'GeoCoordinate',
				lng: tags['bounds:south'],
				lat: tags['bounds:west'],
			},
		}
	}

	return doc
}


async function session_middleware(req, res, next) {

	if (
		!(!!req.headers.cookie)
		&& !!req.headers['-x-session']
	) {
		req.headers.cookie = '__session='+req.headers['-x-session']
	}

	const mongodb = await getMongoDbContext()

	const sessionTTL = 60 * 60 * 24 * 14 // = 14 days

	const store = new MongoStore({
		client: mongodb.client,
		dbName: 'Auth',
		collection: 'Sessions',
		autoRemove: 'native', // Default
		autoRemoveInterval: 1,
		ttl: sessionTTL,
		touchAfter: 24 * 3600, // time period in seconds
		secret: false,
		stringify: false,
	})

	const cookie_domain = (
		process.env.FUNCTIONS_EMULATOR
		? false // '192.168.2.102'
		: 'qiekub.org'
	)

	session({
		name: '__session',
		secret: await getSecretAsync('express_session_secret'),
		cookie: {
			httpOnly: false,
			domain: cookie_domain,
			sameSite: 'lax',
			secure: false, // somehow doesnt work when its true
			maxAge: 1000 * sessionTTL,
		},
		store,
		saveUninitialized: false, // don't create session until something stored
		resave: false, // don't save session if unmodified
		unset: 'destroy',
	})(req, res, next)
}
async function add_profileID_middleware(req, res, next) {
	const currentProfileID = (
		   !!req.session
		&& !!req.session.passport
		&& !!req.session.passport.user
		? req.session.passport.user
		: null
	)

	req.profileID = currentProfileID
	next()
}



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

	const query = [
		{$addFields:{score:0}},
		...scoreStages,
		{$match:{
			score: {$gte:6} // 6 is the score for wikidata. Which should be an exact match. (TODO: Is this number high enough?)
		}},
		{$sort:{
			score: -1
		}},
		{$limit: 1}
	]

	return new Promise( (resolve,reject) => {
		mongodb.CompiledPlaces_collection.aggregate(query).toArray((error,docs) => {
			if (error) {
				console.error(error)
			}

			if (error || docs.length === 0) {
				mongodb.Changesets_collection.aggregate(query).toArray((error,docs) => {
					if (error) {
						console.error(error)
					}
		
					if (error || docs.length === 0) {
						resolve(new mongodb.ObjectID())
					}else{
						resolve(new mongodb.ObjectID(docs[0].properties.forID))
					}
				})
			}else{
				resolve(new mongodb.ObjectID(docs[0]._id))
			}
		})
	})
}

function calcMissingCenters(all_elements){

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
	.map(element => {
		return {
			...element,
			tags: {
				...element.tags,
				lat: element.lat,
				lng: element.lon,
			},
		}
	})

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
			tags: {
				...element.tags,
				lat: center.geometry.coordinates[1],
				lng: center.geometry.coordinates[0],
			},
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
			tags: {
				...element.tags,
				lat: center.geometry.coordinates[1],
				lng: center.geometry.coordinates[0],
			},
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

function addMissingCenters(all_elements){

	if (all_elements.length === 0) {
		return []
	}

	const with_tags = Object.values(
		all_elements.reduce((obj, element) => {
			// merge related elements (tags, bbox, center)
			const osm_id = element.type+'/'+element.id

			if (!obj.hasOwnProperty(osm_id)) {
				obj[osm_id] = element
			}else{
				obj[osm_id] = {
					...obj[osm_id],
					...element,
				}
			}
			return obj
		}, {})
	)
	.filter(element => element.hasOwnProperty('tags')) // only keep the once that have tags. And aren't just sipporting the geometry.
	.map(element => {
		// add lat/lng, center and bbox to the tags

		if (element.lat && element.lon) {
			element.tags.lat = element.lat
			element.tags.lng = element.lon
		} else if (element.center) {
			element.tags.lat = element.center.lat
			element.tags.lng = element.center.lon
		}

		if (element.bounds) {
			element.tags['bounds:west'] = element.bounds.minlon
			element.tags['bounds:south'] = element.bounds.minlat
			element.tags['bounds:east'] = element.bounds.maxlon
			element.tags['bounds:north'] = element.bounds.maxlat
		}

		return element
	})

	if (with_tags.length === 0) {
		return []
	}

	return with_tags
}

function approveChangeset(mongodb, doc, finished_callback){
	let callback_got_called = false
	mongodb.Edges_collection.insertOne({
		__typename: 'Doc',
		properties: {
			__typename: 'Edge',
			edgeType: 'approved',
			toID: doc._id,
			fromID: new mongodb.ObjectID('5ecafac5e1a001e5cfab8e26'), // my profileID
			tags: {},
		},
		metadata: {
			created: new Date,
			lastModified: new Date,
			__typename: 'Metadata',
		},
	})
	.then(result => {
		if (!callback_got_called) {
			if (!!result.insertedId) {
				callback_got_called = true
				finished_callback(doc.properties.forID || null)
			}else{
				callback_got_called = true
				finished_callback(null)
			}
		}
	})
	.catch(error => {
		if (!callback_got_called) {
			callback_got_called = true
			finished_callback(null)
		}
	})
}

async function saveAsChangeset(mongodb, element, finished_callback){
	let tags = {
		...element.tags,
		osm_id: element.type+'/'+element.id,
	}

	tags = Object.entries(tags)
	.map(entry => [
		entry[0].replace(/\./g, '_DOT_'), // replace all dots from the keys as mongoDB doesn't like them
		entry[1]
	])
	.reduce((obj,entry) => { // this is basically Object.fromEntries()
		obj[entry[0]] = entry[1]
		return obj
	}, {})


	// Derive new tags from the existing tags (preset, audience, opening_date, ...)
	tags = annotateTags(tags)


	const changesetProperties = {
		__typename: 'Changeset',
		forID: await getExistingID(mongodb, tags),
		tags,
		sources: [
			(
				!!element.type && !!element.id
				? 'https://www.openstreetmap.org/'+element.type+'/'+element.id
				: null
			),
			(
				!!element.changeset
				? 'https://www.openstreetmap.org/changeset/'+element.changeset
				: null
			),
		].filter(v=>v).join(' '),
		fromBot: true,
		dataset: 'osm',
		antiSpamUserIdentifier: (!!element.uid ? 'osm-uid-'+element.uid : 'osm'), // `https://www.openstreetmap.org/user/${element.user}`,
	}

	addChangeset(mongodb, changesetProperties, changesetID => {
		approveChangeset(mongodb, {
			_id: changesetID,
			properties: {
				forID: changesetProperties.forID,
				__typename: 'Changeset',
			},
			__typename: 'Doc',
		}, placeID => finished_callback(placeID))
	}, ()=>{
		console.error('rejected')
		finished_callback(null)
	})
}


module.exports = {
	ObjectFromEntries,
	addAnswer,
	addChangeset,
	upsertOne,
	compile_places_from_changesets,
	compileAndUpsertPlace,
	getPreset,
	getAudienceTags,
	getDateTags,
	annotateTags,
	annotateDoc,
	key_synonyms,

	session_middleware,
	add_profileID_middleware,

	getExistingID,
	calcMissingCenters,
	addMissingCenters,
	approveChangeset,
	saveAsChangeset,
}
