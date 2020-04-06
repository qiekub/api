const {gql} = require('apollo-server-express')

const schema = gql`
	scalar JSON
	scalar JSONObject
	scalar Timestamp

	type Query {
		search(query: String): GeoSearchResult!

		getPlace(_id: String): Doc!
		getPlaces: [Doc]!
		getMarkers: [Marker]!
		getQuestions: [Doc]!
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
		tags(keys: [String]): JSONObject
	}

	type Mutation {
		addChangeset(changeset: Changeset_Input): Doc
		answerQuestion(properties: JSONObject): JSON
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
	"""
	type Place {
		name(languages: [String]): [Text]

		geometry: GeoData

		"node/0123456789"
		osmID: ID

		tags(keys: [String]): JSONObject
		confidences(keys: [String]): JSONObject

		permanently_closed: Boolean

		formatted_address: String
		formatted_phone_number: String
		international_phone_number: String
	}

	type Changeset {
		forDoc: String
		properties: Properties
		sources: String
		comment: String
		fromBot: Boolean
		created_by: String
		created_at: Timestamp
	}
	input Changeset_Input {
		forDoc: String
		properties: JSONObject
		sources: String
		comment: String
		fromBot: Boolean
		created_by: String
		created_at: Timestamp
	}

	type Question {
		question(languages: [String]): [Text]

		condition: JSONObject
		possibleAnswers: [Answer]
	}
	type Answer {
		inputtype: String
		key: String
		icon: String
		title(languages: [String]): [Text]
		tags: JSONObject
	}

	type Metadata {
		lastModified: Timestamp
		created: Timestamp
	}
	type Error {
		error: String
	}



	union Properties = Error | Place | Changeset | Question | Answer | Text
	type Doc {
		_id: ID
		properties: Properties
		metadata: Metadata
	}
`

module.exports = schema
