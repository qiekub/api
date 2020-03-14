const {gql} = require('apollo-server-express')

const schema = gql`
	scalar JSON
	scalar JSONObject
	scalar Timestamp

	type Query {
		getPlace(_id: String): Doc
		getAllPlaces: [Doc]
		search(query: String): GeoSearchResult
	}

	type Mutation {
		addChangeset(changeset: Changeset_Input): Doc
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
	}

	type GeoSearchResult {
		geometry: GeoData
		licence: String
	}

	type Place {
		name: String
		
		location: GeoCoordinate
		address: String

		min_age: Int
		max_age: Int
		links: String
		this_is_a_place_for: [String]
		tags: [String]
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

	type Metadata {
		lastModified: Timestamp
		created: Timestamp
	}
	type Error {
		error: String
	}



	union Properties = Error | Place | Changeset
	type Doc {
		_id: ID
		properties: Properties
		metadata: Metadata
	}
`

module.exports = schema
