
frontend
	- written in expo/react-native/javascript
	- screens/pages
		- map
			- search
				- center map at first result
			- place-markers
			- filtering by "tags", "this_is_a_place_for" and age-range
		- place-info
		- add a new place
		- contact
		- imprint + privacy-policy
		- cost vs donations overview to get people to donate
	- on every page
		- share buttons
		- language-chooser

backend
	- graphql-api
		- geocoder
		- get all places in a specific area
		- get full infos of a place
		- add a new place / add an update-proposal
	- database



----------------------------

A similar project:

https://www.queeringthemap.com/
(Is for personal experiences only.)

https://wiki.openstreetmap.org/wiki/OpenQueerMap
(Does not exist anymore. And was only in German.)

----------------------------

add / update-proposal {
	existing_id: ID,
	data_of_a_place: {},
}

data of a place {
	"name": "Anyway",
	"lat": 50.9419,
	"lng": 6.9380,
	"address": "Kamekestr. 14, 50672 Köln, Germany",
	"min_age": 14,
	"max_age": 27,
	"website": "http://www.anyway-koeln.de/",
	"this_is_a_place_for": ["queer", "undecided", "hetero-friends"],
	"tags": ["youthcenter", "cafe", "bar"]
}

https://github.com/thomasrosen/queer-centers









✅ geocoder
❓ get all places in a specific area
❓ get full infos of a place
❓ add a new place / add an update-proposal












https://nominatim.openstreetmap.org/search?q=Bonn,%20Germany&format=json&limit=1&addressdetails=0&extratags=0&namedetails=0

https://api.opencagedata.com/geocode/v1/json?key=8a904b5af9c3455fadc6360ad48ac99b&pretty=0&no_annotations=1&limit=1&no_record=1&q=Bonn,%20Germany

https://eu1.locationiq.com/v1/search.php?key=66291d9b656090&limit=1&format=json&q=Bonn,%20Germany













------------------------



https://developers.google.com/places/supported_types
https://wiki.openstreetmap.org/wiki/Map_Features

https://wiki.openstreetmap.org/wiki/Tag:building%3Dcivic

building=civic

amenity=community_centre
amenity=library
amenity=pub;bar;




------------------------

https://wiki.openstreetmap.org/wiki/Key:lgbtq
https://wiki.openstreetmap.org/wiki/Key:gay
https://wiki.openstreetmap.org/wiki/OpenQueerMap


http://overpass-turbo.eu/
https://wiki.openstreetmap.org/wiki/Overpass_API
https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL

https://overpass-api.de/api/interpreter?data=[bbox:50.6,7.0,50.8,7.3][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;

[bbox:90,-180,-90,180]




// [bbox:50.6,7.0,50.8,7.3][out:json][timeout:25];(node[~"."~"lgbt"];node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;
// ----------
[bbox:50.6,7.0,50.8,7.3]
[out:json]
[timeout:25]
;
(
  node[~"."~"lgbt"];
  node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];
  node[~"^lgbtq.*$"~"."];
  node[~"^gay.*$"~"."];
  node[~"^fetish.*$"~"."];
);
out;



// [bbox:50.6,7.0,50.8,7.3][out:json][timeout:25];(node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];node[~"^lgbtq.*$"~"."];node[~"^gay.*$"~"."];node[~"^fetish.*$"~"."];);out;
// ----------
[bbox:50.6,7.0,50.8,7.3]
[out:json]
[timeout:25]
;
(
  node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];
  node[~"^lgbtq.*$"~"."];
  node[~"^gay.*$"~"."];
  node[~"^fetish.*$"~"."];
);
out;







------------------------






Place Filters

What?
(  ) Community Centers (Community Centres, Social Facilities)
(  ) Going Out (Bars, Pubs, Nightclubs, …)
(  ) Culture (Museums, Theatres, Historical, Libraries)
(  ) Eating (Cafes, Restaurants)
(  ) Tourism (Hotels, …)
————————————————————————————
(  ) Everything

For whom?
(  ) Only for Trans
(  ) Only for Women
(  ) Only for Men
————————————————————————————
(  ) For all Queers

For whom?
(  ) Women  [Only | Primary]
(  ) Men    [Only | Primary]
————————————————————————————
(  ) For all Queers

More
(  ) For Age Range
	[Min] bis [Max]
	(Only showing places with a known age range.)
(  ) Wheelchair Support


——————————————————————————————————————————

What {
	presets: []
}

For whom?
Only for Women [
	{tags: {gay:"women"}},
	{tags: {"gay:women":"only"}},
	{tags: {"lgbtq:women":"only"}},
}

For Age Range {
	tags: {
		min_age: {$gte: 1234567}, // gte = Matches values that are greater than or equal to a specified value.
		max_age: {$lte: 1234567}, // lte = Matches values that are less than or equal to a specified value.
	},
}

——————————————————————————————————————————


[or
	{and}
]

and: {
	presets: [],
	tags: {
		min_age: {$gte: 1234567}, // gte = Matches values that are greater than or equal to a specified value.
		max_age: {$lte: 1234567}, // lte = Matches values that are less than or equal to a specified value.
	},
}


or: [{and}, {and}]













——————————————————————————————————————————








# What to show?



## What is this?
- Place Type
- Name

## Can I go there?
- Age Range
- Wheelchair support
- Targetgroup (It's only for specific people)
- (Oppening Hours)
- (How can I get there?)

## Want I go there?
- Groups / Events / Campains / Equipment (Games, ...) (What can you do here?)
- Do I know people there? / Will I meet people there?

## Where can I get more info?
- Contact options
- Website
- OpenStreetMap
- Facebook, ...




——————————————————————————————————————————


## How to compile a place from answers
- get the 4 latest answers for a specfic place and a question
- get the answer with the highest amount of votes or the latest answer-date
- get the tags of that answer
- overwrite the old place data with these tags


——————————————————————————————————————————


## Wheelchair support
{
	question: 'Can wheelchair users access this place on their own?',
	answers: [
		{
			name: 'Yes',
			tags: {
				wheelchair: 'yes',
			},
		}
	]
}





## I want to highlight places for young people!
- Is this place good for teenagers?
- Can you go here when your under 18?
























——————————————————————————————————————————



(
	God gave me depression, cause he knew, if I only had mania, I would try to overthrough him.
)




## How to compile a place from answers
- get the 4 latest answers for a specfic place and a question
- get the answer with the highest amount of votes or the latest answer-date
- get the tags of that answer
- overwrite the old place data with these tags





db.getCollection('Answers').aggregate([
	// START get answers
	/*{$match:{
		"properties.forID": ObjectId("5e743d99d083985272c9bf99"),
	}},*/
	{$sort:{
		"metadata.lastModified": -1
	}},
	{$group:{
		_id: {$concat:[
			{$toString:"$properties.forID"},
			"_",
			{$toString:"$properties.questionID"},
		]},
		docs: {$push:"$$ROOT"},
	}},
	{$project:{
		docs: {$slice:["$docs",0,10]}
	}},
	{$unwind:"$docs"},
	{$replaceRoot:{newRoot:"$docs"}},
	// END get answers
	
	
	// START group answers
	{$group:{
		_id: {$concat:[
			{$toString:"$properties.forID"},
			"_",
			{$toString:"$properties.questionID"},
			"_",
			{$toString:"$properties.answer"}
		]},
		forID: { $first: "$properties.forID" },
		questionID: { $first: "$properties.questionID" },
		answer: { $first: "$properties.answer" },
		count: { $sum: 1 },
	}},
	{$sort:{
		count: -1,
		_id: 1,
	}},
	{$group:{
		_id: {$concat:[
			{$toString:"$forID"},
			"_",
			{$toString:"$questionID"},
		]},
		forID: { $first: "$forID" },
		questionID: { $first: "$questionID" },
		answer: { $first: "$answer" },
		this_answer_count: { $first: "$count" },
		all_answers_count: { $sum: "$count" },
	}},
	{$addFields:{
		confidence: {$divide:["$this_answer_count",{$max:[10,"$all_answers_count"]}]}
	}},
	// END group answers
	
	
	// START compile tags
	{$lookup:{
		from: "Questions",
		localField: "questionID",
		foreignField: "_id",
		as: "question_doc"
	}},
	{$addFields:{
		question_doc: {$arrayElemAt:["$question_doc",0]}
	}},
	{$addFields:{
		// condition: {$ifNull:["$question_doc.properties.condition",null]},
		// question_doc: null,
		tags: {$arrayElemAt:[{ "$setDifference": [
			{ "$map": {
				"input": "$question_doc.properties.possibleAnswers",
				"as": "a",
				"in": { "$cond": [
					{$eq:["$$a.key","$answer"]},
					"$$a.tags",
					false
				]}
			}},
			[false]
		]},0]},
	}},
	// END compile tags
	
	
	// START seperate confidences
	{$addFields:{
		confidences: {$arrayToObject:{$map:{
			input: {$objectToArray:"$tags"},
			as: "a",
			in: {k:"$$a.k",v:"$confidence"}
		}}},
	}},
	// END seperate confidences
	
	
	// START combine tags by forID
	{$sort:{
		confidence: 1,
		_id: 1,
	}},
	{$group:{
		_id: "$forID",
		tags: {$mergeObjects:"$tags"},
		confidences: {$mergeObjects:"$confidences"},
	}},
	// END combine tags by forID
	
	// START for the eye
	{$sort:{
		_id: 1
	}},
])
























const __last_n_answers__ = 10
db.getCollection('Answers').aggregate([
    // START get answers
    /*{$match:{
        "properties.forID": ObjectId("5e743d99d083985272c9bfd3"),
    }},*/
    {$sort:{
        "metadata.lastModified": -1
    }},
    {$set:{
        "properties.answer": { $objectToArray: "$properties.answer" },
    }},
    {$unwind: "$properties.answer"},
    {$group:{
        _id: {$concat:[
            {$toString:"$properties.forID"},
            "_",
            {$toString:"$properties.questionID"},
            "_",
            {$toString:"$properties.answer.k"},
        ]},
        docs: {$push:"$$ROOT"},
    }},
    {$set:{
        docs: {$slice:["$docs",0,__last_n_answers__]}
    }},
    {$set:{
        all_answers_count: {$size:"$docs"}
    }},
    {$unwind:"$docs"},
    // END get answers
    
    
    // START group answers
    {$set:{
        "forID": "$docs.properties.forID",
        "questionID": "$docs.properties.questionID",
        "answer": "$docs.properties.answer",
    }},
    {$set:{
         "value_as_string": {$switch:{
            branches: [
                {case: {$eq:[{$type:"$answer.v"},"string"]}, then: "$answer.v"},
            ],
            default: ""
         }},
    }},
    {$group: {
        _id: {$concat:[
            {$toString:"$forID"},
            "_",
            {$toString:"$questionID"},
            "_",
            {$toString:"$answer.k"},
            "_",
            {$toString:"$value_as_string"},
        ]},
        
        forID: { $first: "$forID" },
        questionID: { $first: "$questionID" },
        answer: { $first: "$answer" },
        // value_as_string: { $first: "$value_as_string" },
        
        all_answers_count: { $first: "$all_answers_count" },
        this_answer_count: { $sum: 1 },
    }},
    {$sort:{
        all_answers_count: -1,
        this_answer_count: -1,
        _id: 1,
    }},
    {$group: {
        _id: {$concat:[
            {$toString:"$forID"},
            "_",
            {$toString:"$questionID"},
            "_",
            {$toString:"$answer.k"},
        ]},
        
        forID: { $first: "$forID" },
        questionID: { $first: "$questionID" },
        answer: { $first: "$answer" },
        // value_as_string: { $first: "$value_as_string" },
        
        all_answers_count: { $first: "$all_answers_count" },
        this_answer_count: { $first: "$this_answer_count" },
    }},
    {$set:{
        confidence: {$divide:["$this_answer_count",{$max:[__last_n_answers__,"$all_answers_count"]}]}
    }},
    // END group answers
    
    
    // START compile tags
    {$lookup:{
        from: "Questions",
        localField: "questionID",
        foreignField: "_id",
        as: "question_doc"
    }},
    {$set:{
        question_doc: {$arrayElemAt:["$question_doc",0]}
    }},
    {$set:{
        // question_doc: null,
        tags: {$arrayElemAt:[{ "$setDifference": [
            { "$map": {
                "input": "$question_doc.properties.possibleAnswers",
                "as": "a",
                "in": { "$cond": {
                    if: {$eq:["$$a.key","$answer.k"]},
                    then: { "$cond": {
                        if: {$eq:["$answer.v",true]},
                        then: "$$a.tags",
                        else: {$arrayToObject:{$map:{
                            input: {$objectToArray:"$$a.tags"},
                            as: "a",
                            in: {k:"$$a.k",v: {$switch:{
                                    branches: [
                                        {case: {$and:[
                                            {$eq:[{$type:"$answer.v"},"bool"]},
                                            {$eq:["$answer.v",true]},
                                        ]}, then: "$$a.tags"},

                                        {case: {$eq:[{$type:"$answer.v"},"double"]}, then: "$answer.v"},
                                        {case: {$eq:[{$type:"$answer.v"},"string"]}, then: "$answer.v"},
                                        {case: {$eq:[{$type:"$answer.v"},"int"]}, then: "$answer.v"},
                                        {case: {$eq:[{$type:"$answer.v"},"long"]}, then: "$answer.v"},

                                        // {case: {$eq:[{$type:"$answer.v"},"object"]}, then: {
                                        //     $arrayToObject:{$map:{
                                        //         input: {$objectToArray:"$$a.tags"},
                                        //         as: "a",
                                        //         in: {k:"$$a.k",v:"$$a.v"}
                                        //     }}}
                                        // },
                                    ],
                                    default: false
                                }},
                           }
                        }}},
                    }},
                    else: false
                 }}
            }},
            [false]
        ]},0]},
    }},
    
    {$project:{
        question_doc: false
    }},
    // END compile tags
    
    
    // START seperate confidences
    {$set:{
        confidences: {$arrayToObject:{$map:{
            input: {$objectToArray:"$tags"},
            as: "a",
            in: {k:"$$a.k",v:"$confidence"}
        }}},
    }},
    // END seperate confidences
    
    
    // START combine tags by forID
    {$sort:{
        confidence: 1,
        _id: 1,
    }},
    {$group:{
        _id: "$forID",
        tags: {$mergeObjects:"$tags"},
        confidences: {$mergeObjects:"$confidences"},
    }},
    // END combine tags by forID
    
    // START for the eye
    {$sort:{
        _id: 1
    }},
])





















——————————————————————————————————————————



Suggest a question!

What would you want to know?
Which information are we missing?
Which information is missing?
What's missing?





——————————————————————————————————————————







https://api.mapbox.com/geocoding/v5/mapbox.places/-73.989,40.733.json?types=country&limit=1&access_token=pk.eyJ1IjoicWlla3ViIiwiYSI6ImNrOGF1ZGlpdzA1dDgzamx2ajNua3picmMifQ.OYr_o4fX7vPTvZCWZsUs4g


https://ilga.org/maps-sexual-orientation-laws
https://ilga.org/trans-legal-mapping-report
https://de.wikipedia.org/wiki/Liste_von_L%C3%A4ndern_nach_pers%C3%B6nlicher_Freiheit#Liste










