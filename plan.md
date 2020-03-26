
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




------------------------


## How to compile a place from answers
- get the 4 latest answers for a specfic place and a question
- get the answer with the highest amount of votes or the latest answer-date
- get the tags of that answer
- overwrite the old place data with these tags


------------------------


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








