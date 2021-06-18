const {gql} = require('apollo-server-express')

// scalar Date
// scalar Time
// scalar DateTime
//
// scalar Timestamp

const schema = gql`
	scalar JSON
	scalar JSONObject
	scalar DateTime

	type Query {
		id: ID
		whoami: ID

		search(query: String, languages: [String]): SearchInfo
		countrycode(lat: Float, lng: Float): String

		undecidedPlaces(forID: ID): [Doc]
		undecidedTags(forID: ID): [JSONObject]

		place(_id: ID): Doc
		places: [Doc]

		changeset(_id: ID): Doc
		changesets(forID: ID): [Doc]

		country(countryCode: ID): Doc
		countries: [Doc]

		markers: [Marker]
		questions: [Doc]

		sessions: [Doc]
		accounts: [Doc]

		similarProjects: JSONObject
	}

	type Mutation {
		addChangeset(properties: Changeset_Input): ID
		addEdge(properties: Edge_Input): ID
		recompile(_id: ID): Boolean
	}

	type Text {
		text: String
		language: String
	}

	type Marker {
		_id: ID
		originalTypename: String
		name(languages: [String]): [Text]
		lng: Float
		lat: Float
		preset: String
		status: String
		tags: JSONObject
	}

	type GeoCoordinate {
		"Longitude"
		lng: Float
		"Latitude"
		lat: Float
	}
	type Boundingbox {
		northeast: GeoCoordinate
		southwest: GeoCoordinate
	}
	type GeoData {
		location: GeoCoordinate
		boundingbox: Boundingbox
		_viewport: Boundingbox
	}

	type SearchInfo {
		query: String
		results: [GeoSearchResult]
	}
	type GeoSearchResult {
		placeID: ID
		preset: String
		name: [Text]
		address: String
		geometry: GeoData
	}

	"""
	lgbtq:welcomes = undecided;friends;family;trans;inter;gay;hetero;bi;lesbian;woman;man
	lgbtq_58_welcomes: String
	formatted_address: String
	formatted_phone_number: String
	international_phone_number: String
	"""
	type Place {
		name(languages: [String]): [Text]
		description(languages: [String]): [Text]

		geometry: GeoData

		"node/0123456789"
		osmID: ID

		tags(keys: [String]): JSONObject
		confidences(keys: [String]): JSONObject
		changesetIDs(keys: [String]): JSONObject
	}

	type Changeset {
		forID: ID
		tags: JSONObject

		"Links and any other reference"
		sources: String

		fromBot: Boolean

		"osm / qiekub"
		dataset: ID

		"anything to identify the user who created the change"
		antiSpamUserIdentifier: ID
	}
	input Changeset_Input {
		forID: ID
		tags: JSONObject

		"Links and any other reference"
		sources: String

		fromBot: Boolean

		"osm / qiekub"
		dataset: ID

		"anything to identify the user who created the change"
		antiSpamUserIdentifier: ID
	}

	type Question {
		question(languages: [String]): [Text]
		in_one_word(languages: [String]): [Text]
		description(languages: [String]): [Text]
		icon: String
		possibleAnswers: [Answer]
	}
	type Answer {
		inputtype: String
		inputOptions: JSONObject
		namespace: String
		parsers: [String]
		key: String
		icon: String
		title(languages: [String]): [Text]
		description(languages: [String]): [Text]
		followUpQuestionIDs: [ID]
		tags: JSONObject
		hidden: Boolean
	}

	type Profile {
        displayName: String
	}
	type Account {
        uid: String
        provider: String
        username: String
        displayName: String
        forProfileID: ID
	}
	type Session {
		profileID: ID
		user_agent: String
		started: DateTime
		expires: DateTime
		lastModified: DateTime
	}

	type Edge {
		edgeType: EdgeTypes
		fromID: ID
		toID: ID
		tags(keys: [String]): JSONObject
	}
	input Edge_Input {
		edgeType: EdgeTypes
		fromID: ID
		toID: ID
		tags: JSONObject
	}

	"EdgeTypes are in past-tense."
	enum EdgeTypes {
		approved
		approvedTag
		rejected
		rejectedTag
		deleted
	}

	type Metadata {
		lastModified: DateTime
		created: DateTime
	}
	type Error {
		error: String
	}



	union Properties = Error | Edge | Place | Changeset | Question | Text | Session | Account
	type Doc {
		_id: ID
		properties: Properties
		metadata: Metadata
	}
`

module.exports = schema
