const {gql} = require('apollo-server-express')

const schema = gql`
	scalar JSON
	scalar JSONObject
	scalar Timestamp

	type Query {
		getID: ID
		search(query: String): GeoSearchResult
		isGeoCoordinateLegal(lat: Float, lng: Float): Boolean

		getPlace(_id: String): Doc
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
		tags(keys: [String]): JSONObject
	}

	type Mutation {
		addSources(properties: Sources_input): ID
		addChangeset(changeset: Changeset_Input): Doc
		answerQuestion(properties: JSONObject): ID
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
		sources(keys: [String]): JSONObject
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
		description(languages: [String]): [Text]
		followUpQuestionIDs: [ID]
		tags: JSONObject
		hidden: Boolean
	}
	type Sources {
		forIDs: [ID]
		sources: String
		dataset: String
	}
	input Sources_input {
		forIDs: [ID]
		sources: String
		dataset: String
	}

	type Metadata {
		lastModified: Timestamp
		created: Timestamp
	}
	type Error {
		error: String
	}



	union Properties = Error | Place | Changeset | Question | Answer | Sources | Text
	type Doc {
		_id: ID
		properties: Properties
		metadata: Metadata
	}
`

module.exports = schema
