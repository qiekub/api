// http://overpass-turbo.eu/

/*
This has been generated by the overpass-turbo wizard.
The original search was:
“community_centre=lgbtq”
*/
/*
[out:json][timeout:25];
// gather results
(
  // query part for: “community_centre=lgbtq”
  node["community_centre"="lgbtq"](50.93925729988074,6.931622028350829,50.94973522111774,6.94859504699707);
  way["community_centre"="lgbtq"](50.93925729988074,6.931622028350829,50.94973522111774,6.94859504699707);
  relation["community_centre"="lgbtq"](50.93925729988074,6.931622028350829,50.94973522111774,6.94859504699707);
);
// print results
out body;
>;
out skel qt;
*/
[out:json][timeout:25][bbox:50.6,7.0,50.8,7.3];
// [out:json][timeout:25][bbox:50.6299,6.8047,51.0833,7.2867];
(  
  // node[~"."~"lgbt"];
  node[~"^community_centre.*$"~"(lgbt|homosexual|gay)"];
  node[~"^lgbtq.*$"~"."];
  node[~"^gay.*$"~"."];
  node[~"^fetish.*$"~"."]; 
);
out body;
>;
out skel qt;

/*  

"amenity"="community_centre"
"community_centre"="youth_centre"
"community_centre:for"="lgbtq"
"lgbtq"="primary"

"gay": "men"
"description": "Gay bar for younger people"

[out:json][timeout:25][bbox:50.6,7.0,50.8,7.3];

50.6299/6.8047
51.0833/7.2867

*/
