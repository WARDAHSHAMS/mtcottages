import type { HomeMicrosite, NearbyPlace, TownArea } from "./types";

/**
 * Town-level location data shared by homes whose street address is not
 * approved for publication. The coordinates are the town centre, never a
 * house, so the map and directions point at the town only.
 */

export const parkersburgArea: TownArea = { kind: "town", locality: "Parkersburg", region: "WV", lat: 39.2667, lng: -81.5615 };
export const ravenswoodArea: TownArea = { kind: "town", locality: "Ravenswood", region: "WV", lat: 38.9481, lng: -81.761 };

export const parkersburgNearby: NearbyPlace[] = [
  { name: "WVU Medicine Camden Clark Medical Center", kind: "health", note: "The area's main hospital campus, on Garfield Avenue in Parkersburg.", mapsQuery: "WVU Medicine Camden Clark Medical Center 800 Garfield Ave Parkersburg WV" },
  { name: "Kroger on 7th Street", kind: "grocery", note: "A full-service grocery store on the east side of Parkersburg near City Park.", mapsQuery: "Kroger 2007 7th St Parkersburg WV" },
  { name: "Parkersburg City Park", kind: "park", note: "The city's largest park, with picnic shelters, playgrounds, tennis and pickleball courts, and walking paths.", mapsQuery: "Parkersburg City Park 1920 Parks Ave Parkersburg WV" },
  { name: "Point Park", kind: "park", note: "A riverfront park where the Little Kanawha meets the Ohio River, and the start of the Little Kanawha Connector Trail.", mapsQuery: "Point Park Parkersburg WV" },
  { name: "Smoot Theatre", kind: "civic", note: "A restored 1926 downtown theater that hosts live shows.", mapsQuery: "Smoot Theatre 213 5th St Parkersburg WV" },
  { name: "Parkersburg High School", kind: "school", note: "The public high school for the city, in a 1917 Tudor-style building.", mapsQuery: "Parkersburg High School 2101 Dudley Ave Parkersburg WV" },
  { name: "Easy Rider (Mid-Ohio Valley Transit Authority)", kind: "transit", note: "The local public bus system serving Parkersburg and Vienna.", mapsQuery: "Mid-Ohio Valley Transit Authority 520 Juliana St Parkersburg WV" },
];

export const parkersburgDirectionsFrom: HomeMicrosite["directionsFrom"] = [
  { label: "WVU Medicine Camden Clark Medical Center", origin: "WVU Medicine Camden Clark Medical Center, 800 Garfield Ave, Parkersburg, WV 26101" },
  { label: "Mid-Ohio Valley Regional Airport", origin: "Mid-Ohio Valley Regional Airport, Williamstown, WV" },
  { label: "Downtown Parkersburg (Point Park)", origin: "Point Park, Parkersburg, WV" },
];

export const ravenswoodNearby: NearbyPlace[] = [
  { name: "Jackson General Hospital", kind: "health", note: "The county's hospital, a WVU Medicine facility on Pinnell Street in Ripley.", mapsQuery: "Jackson General Hospital 122 Pinnell St Ripley WV" },
  { name: "Ravenswood Foodfair", kind: "grocery", note: "A grocery store on Washington Street in Ravenswood.", mapsQuery: "Foodfair 423 Washington St Ravenswood WV" },
  { name: "Walmart Supercenter", kind: "shopping", note: "A larger store for groceries and household needs on Academy Drive in Ripley.", mapsQuery: "Walmart Supercenter 200 Academy Dr Ripley WV" },
  { name: "Washington Riverfront Park", kind: "park", note: "Ravenswood's park on the Ohio River, where the city has been adding river access and a marina.", mapsQuery: "Riverfront Park Ravenswood WV" },
  { name: "Gino's Pizza & Spaghetti House", kind: "food", note: "A sit-down pizza and pasta restaurant on Washington Street.", mapsQuery: "Gino's Pizza Spaghetti House 404 Washington St Ravenswood WV" },
  { name: "Ravenswood Branch Library", kind: "civic", note: "The Ravenswood branch of the Jackson County public libraries.", mapsQuery: "Jackson County Public Library Ravenswood Branch Ravenswood WV" },
  { name: "Ravenswood Middle School", kind: "school", note: "Public middle school for grades 6 to 8 on South Ritchie Avenue.", mapsQuery: "Ravenswood Middle School 514 S Ritchie Ave Ravenswood WV" },
  { name: "Ravenswood High School", kind: "school", note: "Public high school for grades 9 to 12 on Plaza Drive.", mapsQuery: "Ravenswood High School 100 Plaza Dr Ravenswood WV" },
];

export const ravenswoodDirectionsFrom: HomeMicrosite["directionsFrom"] = [
  { label: "I-77 Ravenswood exit", origin: "I-77 Exit 146 Ravenswood WV" },
  { label: "Jackson General Hospital", origin: "Jackson General Hospital 122 Pinnell St Ripley WV 25271" },
  { label: "Downtown Parkersburg", origin: "Downtown Parkersburg WV" },
];
