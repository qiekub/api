const presets = {
	// source: https://raw.githubusercontent.com/openstreetmap/iD/2.x/data/presets/presets.json
	"amenity/bar/lgbtq": {"icon": "maki-bar", "geometry": ["point", "area"], "terms": ["gay bar", "lesbian bar", "lgbtq bar", "lgbt bar", "lgb bar"], "tags": {"amenity": "bar", "lgbtq": "primary"}, "name": "LGBTQ+ Bar"},
	"amenity/community_centre/lgbtq": {"icon": "maki-town-hall", "geometry": ["point", "area"], "terms": ["lgbtq event", "lgbtq hall", "lgbt event", "lgbt hall", "lgb event", "lgb hall"], "tags": {"amenity": "community_centre", "lgbtq": "primary"}, "name": "LGBTQ+ Community Center"},
	"amenity/nightclub/lgbtq": {"icon": "maki-bar", "geometry": ["point", "area"], "tags": {"amenity": "nightclub", "lgbtq": "primary"}, "terms": ["gay nightclub", "lesbian nightclub", "lgbtq nightclub", "lgbt nightclub", "lgb nightclub"], "name": "LGBTQ+ Nightclub"},
	"amenity/pub/lgbtq": {"icon": "maki-beer", "geometry": ["point", "area"], "tags": {"amenity": "pub", "lgbtq": "primary"}, "terms": ["gay pub", "lesbian pub", "lgbtq pub", "lgbt pub", "lgb pub"], "name": "LGBTQ+ Pub"},
	"shop/erotic/lgbtq": {"icon": "maki-shop", "geometry": ["point", "area"], "terms": ["sex", "porn"], "tags": {"shop": "erotic", "lgbtq": "primary"}, "name": "LGBTQ+ Erotic Store"},
}


if (module && module.exports) {
	module.exports = presets
}else{
	export default presets
}