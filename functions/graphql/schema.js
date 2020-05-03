const {gql} = require('apollo-server-express')

const schema = gql`
	scalar JSON
	scalar JSONObject
	scalar Timestamp

	type Query {
		getID: ID
		search(query: String): GeoSearchResult
		isGeoCoordinateLegal(lat: Float, lng: Float): Boolean

		getPlace(_id: ID): Doc
		getChangeset(_id: ID): Doc

		getPlaces: [Doc]
		getMarkers: [Marker]
		getQuestions: [Doc]
	}

	type Text {
		text: String
		language: String
	}

	type Marker {
		_id: ID
		name(languages: [String]): [Text]
		lng: Float
		lat: Float
		preset: String
		tags: JSONObject
	}

	type Mutation {
		addChangeset(properties: Changeset_Input): ID
		compilePlace(_id: ID): Boolean
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

	type GeoSearchResult {
		geometry: GeoData
		licence: String
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

		condition: JSONObject
		possibleAnswers: [Answer]
	}
	type Answer {
		inputtype: String
		parsers: [String]
		key: String
		icon: String
		title(languages: [String]): [Text]
		description(languages: [String]): [Text]
		followUpQuestionIDs: [ID]
		tags: JSONObject
		hidden: Boolean
	}

	type Metadata {
		lastModified: Timestamp
		created: Timestamp
	}
	type Error {
		error: String
	}



	union Properties = Error | Place | Changeset | Question | Text
	type Doc {
		_id: ID
		properties: Properties
		metadata: Metadata
	}
`

module.exports = schema
