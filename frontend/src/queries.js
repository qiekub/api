import {gql} from 'apollo-boost'

export const loadPoi = gql`
	query($_id: String=""){
		getPlace(_id: $_id){
			_id
			properties {
				... on Place {
					name
					geometry {
						location {
							lng
							lat
						}
					}
					osmID
					tags
					permanently_closed
				}
			}
		}
	}
`

export const loadPois = gql`
	query($wantedTags: [String]){
		getPlaces{
			_id
			properties {
				... on Place {
					geometry {
						location {
							lng
							lat
						}
					}
					tags(keys: $wantedTags)
				}
			}
		}
	}
`

export const loadMarkers = gql`
	query($wantedTags: [String]){
		getMarkers{
			_id
			name
			lng
			lat
			tags(keys: $wantedTags)
		}
	}
`

export const search = gql`
	query($query: String=""){
		search(query: $query){	
			geometry {
				boundingbox {
					northeast {
						lng
						lat
					}
					southwest {
						lng
						lat
					}
				}
			}
		}
	}
`

export const answerQuestion = gql`
	mutation($properties: JSONObject){
		answerQuestion(properties: $properties)
	}
`