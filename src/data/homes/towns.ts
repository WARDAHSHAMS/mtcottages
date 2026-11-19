import type { HomeMicrosite, NearbyPlace, TownArea } from "./types";

/**
 * Town-level location data shared by homes whose street address is not
 * approved for publication. The coordinates are the town centre, never a
 * house, so the map and directions point at the town only.
 *
 * The nearby lists are shared by every home in the town (#88). Each place was
 * checked on `checked` against its OpenStreetMap element or its own website
 * (`source`); anything closed or uncertain was left out. Notes are one plain
 * sentence with no hours, prices, ratings or phone numbers, and no
 * third-party photos (owner decision F2). Keep street numbers out of the
 * notes: town-level homes must never show a house number.
 */

export const parkersburgArea: TownArea = { kind: "town", locality: "Parkersburg", region: "WV", lat: 39.2667, lng: -81.5615 };
export const ravenswoodArea: TownArea = { kind: "town", locality: "Ravenswood", region: "WV", lat: 38.9481, lng: -81.761 };

/** The date the shared town lists were last checked against their sources. */
export const nearbyChecked = "2026-11-17";

const osm = (element: string) => `https://www.openstreetmap.org/${element}`;

export const parkersburgNearby: NearbyPlace[] = [
  { name: "WVU Medicine Camden Clark Medical Center", kind: "health", note: "The area's main hospital campus, on Garfield Avenue. In an emergency, call 911 first.", mapsQuery: "WVU Medicine Camden Clark Medical Center Garfield Ave Parkersburg WV", source: osm("way/464109770"), checked: nearbyChecked },
  { name: "WVU Medicine Rapid Care", kind: "health", note: "A walk-in clinic on Pike Street for illnesses and injuries that are not emergencies.", mapsQuery: "WVU Medicine Rapid Care Pike St Parkersburg WV", source: osm("node/13257003603"), checked: nearbyChecked },
  { name: "CVS Pharmacy on 7th Street", kind: "health", note: "A pharmacy on the east side of town, near City Park.", mapsQuery: "CVS Pharmacy 7th St Parkersburg WV", source: osm("node/3985305857"), checked: nearbyChecked },
  { name: "Kroger on 7th Street", kind: "grocery", note: "A full-service grocery store on the east side of Parkersburg near City Park.", mapsQuery: "Kroger 7th St Parkersburg WV", source: osm("way/215927810"), checked: nearbyChecked },
  { name: "Kroger on Division Street", kind: "grocery", note: "A second Kroger, with a pharmacy, on the south side of town.", mapsQuery: "Kroger Division St Parkersburg WV", source: osm("way/209649484"), checked: nearbyChecked },
  { name: "Walmart Supercenter", kind: "grocery", note: "A large store with a grocery department on Pike Street.", mapsQuery: "Walmart Supercenter Pike St Parkersburg WV", source: osm("way/396807409"), checked: nearbyChecked },
  { name: "Mother Earth Foods", kind: "grocery", note: "A natural-foods grocery on 19th Street.", mapsQuery: "Mother Earth Foods 19th St Parkersburg WV", source: osm("node/2258202569"), checked: nearbyChecked },
  { name: "Parkersburg Brewing Company", kind: "food", note: "A brewpub with a full menu in a renovated historic building on Market Street downtown.", mapsQuery: "Parkersburg Brewing Company Market St Parkersburg WV", source: osm("node/9755841338"), checked: nearbyChecked },
  { name: "Corner Cafe", kind: "food", note: "A small café on Ann Street downtown.", mapsQuery: "Corner Cafe Ann St Parkersburg WV", source: osm("node/11455057028"), checked: nearbyChecked },
  { name: "Parkersburg City Park", kind: "park", note: "The city's largest park, with picnic shelters, playgrounds, tennis and pickleball courts, and walking paths.", mapsQuery: "Parkersburg City Park Parks Ave Parkersburg WV", source: osm("way/209561893"), checked: nearbyChecked },
  { name: "Point Park", kind: "park", note: "A riverfront park downtown where the Little Kanawha meets the Ohio, and the start of the Little Kanawha Connector Trail.", mapsQuery: "Point Park Parkersburg WV", source: osm("way/215589510"), checked: nearbyChecked },
  { name: "Fort Boreman Park", kind: "park", note: "A hilltop city park with an overlook of the two rivers and downtown.", mapsQuery: "Fort Boreman Park Parkersburg WV", source: osm("way/215925696"), checked: nearbyChecked },
  { name: "Blennerhassett Island Historical State Park", kind: "park", note: "A state park on an Ohio River island, reached by sternwheeler from Point Park in season.", mapsQuery: "Blennerhassett Island Historical State Park Parkersburg WV", source: osm("relation/12684408"), checked: nearbyChecked },
  { name: "Parkersburg High School", kind: "school", note: "The public high school for the north and central city, in a 1917 Tudor-style building.", mapsQuery: "Parkersburg High School Dudley Ave Parkersburg WV", source: osm("way/830736817"), checked: nearbyChecked },
  { name: "Parkersburg South High School", kind: "school", note: "The public high school for the south side of Wood County, on Blizzard Drive.", mapsQuery: "Parkersburg South High School Blizzard Dr Parkersburg WV", source: osm("way/396806984"), checked: nearbyChecked },
  { name: "West Virginia University at Parkersburg", kind: "school", note: "The local public college, with associate and bachelor's degrees, east of town.", mapsQuery: "West Virginia University at Parkersburg Parkersburg WV", source: osm("way/1058387903"), checked: nearbyChecked },
  { name: "Easy Rider (Mid-Ohio Valley Transit Authority)", kind: "transit", note: "The local public bus system serving Parkersburg and Vienna, from its Juliana Street hub.", mapsQuery: "Mid-Ohio Valley Transit Authority Juliana St Parkersburg WV", source: "https://easyriderbus.com/", checked: nearbyChecked },
  { name: "Grand Central Mall", kind: "shopping", note: "The region's large enclosed mall, just north in Vienna.", mapsQuery: "Grand Central Mall Vienna WV", source: osm("way/36998398"), checked: nearbyChecked },
  { name: "Parkersburg and Wood County Public Library", kind: "civic", note: "The main public library, on Emerson Avenue in the north end.", mapsQuery: "Parkersburg and Wood County Public Library Emerson Ave Parkersburg WV", source: osm("way/634304675"), checked: nearbyChecked },
  { name: "Smoot Theatre", kind: "civic", note: "A restored 1926 downtown theater that hosts live shows.", mapsQuery: "Smoot Theatre Parkersburg WV", source: osm("way/398390492"), checked: nearbyChecked },
  { name: "Oil and Gas Museum", kind: "civic", note: "A downtown museum of the region's oil and gas history.", mapsQuery: "Oil and Gas Museum Parkersburg WV", source: osm("way/398390517"), checked: nearbyChecked },
  { name: "Parkersburg Art Center", kind: "civic", note: "A downtown art center on Market Street with changing exhibits.", mapsQuery: "Parkersburg Art Center Market St Parkersburg WV", source: osm("node/3985323764"), checked: nearbyChecked },
];

export const parkersburgDirectionsFrom: HomeMicrosite["directionsFrom"] = [
  { label: "WVU Medicine Camden Clark Medical Center", origin: "WVU Medicine Camden Clark Medical Center, 800 Garfield Ave, Parkersburg, WV 26101" },
  { label: "Mid-Ohio Valley Regional Airport", origin: "Mid-Ohio Valley Regional Airport, Williamstown, WV" },
  { label: "Downtown Parkersburg (Point Park)", origin: "Point Park, Parkersburg, WV" },
];

export const ravenswoodNearby: NearbyPlace[] = [
  { name: "Jackson General Hospital", kind: "health", note: "The county's hospital, a WVU Medicine facility on Pinnell Street in Ripley. In an emergency, call 911 first.", mapsQuery: "Jackson General Hospital Pinnell St Ripley WV", source: osm("way/464098158"), checked: nearbyChecked },
  { name: "Walgreens", kind: "health", note: "A pharmacy on Washington Street in Ravenswood.", mapsQuery: "Walgreens Washington St Ravenswood WV", source: osm("way/920024387"), checked: nearbyChecked },
  { name: "Ravenswood Foodfair", kind: "grocery", note: "A grocery store on Washington Street in Ravenswood.", mapsQuery: "Foodfair Washington St Ravenswood WV", source: osm("way/376917601"), checked: nearbyChecked },
  { name: "Walmart Supercenter", kind: "shopping", note: "A larger store for groceries and household needs on Academy Drive in Ripley.", mapsQuery: "Walmart Supercenter Academy Dr Ripley WV", source: osm("way/391140591"), checked: nearbyChecked },
  { name: "Gino's Pizza & Spaghetti House", kind: "food", note: "A sit-down pizza and pasta restaurant on Washington Street.", mapsQuery: "Gino's Pizza Spaghetti House Washington St Ravenswood WV", source: osm("way/613971563"), checked: nearbyChecked },
  { name: "Dairy Queen", kind: "food", note: "Ice cream and quick meals in town.", mapsQuery: "Dairy Queen Ravenswood WV", source: osm("node/8570494063"), checked: nearbyChecked },
  { name: "Washington Riverfront Park", kind: "park", note: "Ravenswood's park on the Ohio River, with a playground, walking paths, picnic areas and a boat launch.", mapsQuery: "Washington Riverfront Park Ravenswood WV", source: osm("way/215882060"), checked: nearbyChecked },
  { name: "Veterans Park", kind: "park", note: "A small city park in town.", mapsQuery: "Veterans Park Ravenswood WV", source: osm("way/918080881"), checked: nearbyChecked },
  { name: "Turkey Run Lake Wildlife Management Area", kind: "park", note: "A state wildlife area with a fishing lake, a short drive from town.", mapsQuery: "Turkey Run Lake Wildlife Management Area Ravenswood WV", source: osm("relation/11139424"), checked: nearbyChecked },
  { name: "Cedar Lakes Conference Center", kind: "park", note: "A state conference center near Ripley with lakes and wooded grounds.", mapsQuery: "Cedar Lakes Conference Center Ripley WV", source: osm("way/678496704"), checked: nearbyChecked },
  { name: "Ravenswood Branch Library", kind: "civic", note: "The Ravenswood branch of the Jackson County public libraries, on Virginia Street.", mapsQuery: "Jackson County Public Library Ravenswood Branch Ravenswood WV", source: osm("way/918080882"), checked: nearbyChecked },
  { name: "Ravenswood City Hall", kind: "civic", note: "The city's municipal offices, including the city clerk.", mapsQuery: "Ravenswood City Hall Ravenswood WV", source: osm("way/920024200"), checked: nearbyChecked },
  { name: "The Great Bend Museum", kind: "civic", note: "A free local-history museum in the old lock powerhouse at Riverfront Park.", mapsQuery: "The Great Bend Museum Ravenswood WV", source: "https://wvtourism.com/company/the-great-bend-museum/", checked: nearbyChecked },
  { name: "Henry J. Kaiser Elementary School", kind: "school", note: "A public elementary school in Ravenswood (Jackson County Schools).", mapsQuery: "Henry J Kaiser Elementary School Ravenswood WV", source: osm("way/688421672"), checked: nearbyChecked },
  { name: "Ravenswood Grade School", kind: "school", note: "Public school for grades 3 to 5.", mapsQuery: "Ravenswood Grade School Ravenswood WV", source: osm("way/688421673"), checked: nearbyChecked },
  { name: "Ravenswood Middle School", kind: "school", note: "Public middle school for grades 6 to 8 on South Ritchie Avenue.", mapsQuery: "Ravenswood Middle School S Ritchie Ave Ravenswood WV", source: osm("way/1161799367"), checked: nearbyChecked },
  { name: "Ravenswood High School", kind: "school", note: "Public high school for grades 9 to 12 on Plaza Drive.", mapsQuery: "Ravenswood High School Plaza Dr Ravenswood WV", source: osm("node/356530045"), checked: nearbyChecked },
];

export const ravenswoodDirectionsFrom: HomeMicrosite["directionsFrom"] = [
  { label: "I-77 Ravenswood exit", origin: "I-77 Exit 146 Ravenswood WV" },
  { label: "Jackson General Hospital", origin: "Jackson General Hospital 122 Pinnell St Ripley WV 25271" },
  { label: "Downtown Parkersburg", origin: "Downtown Parkersburg WV" },
];
