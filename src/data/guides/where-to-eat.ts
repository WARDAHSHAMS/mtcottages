/**
 * "Where to eat in Parkersburg, Marietta, Ohio, and Ravenswood" (#57). Targets
 * the "<town> restaurants" rows of docs/marketing/keyword-universe.csv.
 *
 * Honesty rules for this guide:
 * - No ratings, rankings, reviews or business photos (owner decision F2: we
 *   hold no rights to them). Text and links only.
 * - Every place links to its own site, or, where it has none, to the page the
 *   town's official directory links for it (usually its Facebook page).
 * - Every place comes from an official directory: the Marietta-Washington
 *   County CVB dining directory, the Greater Parkersburg CVB restaurant
 *   directory, or the City of Ravenswood restaurant list. Its kind of food is
 *   the one that directory or its own site gives.
 * - Hours are quoted only where the operator or the town publishes them, with
 *   the date we read them; no street addresses (scripts/check-addresses.sh).
 */
import type { GuideArticle } from "./types";

/** The day the directories and every linked page were read for this guide. */
const checked = "2026-11-22";
const readOn = "November 22, 2026";

export const whereToEat: GuideArticle = {
  slug: "where-to-eat-parkersburg-marietta-ravenswood",
  seoTitle: "Restaurants: Parkersburg, Marietta, Ravenswood",
  description: "Where to eat in Parkersburg, WV, Marietta, Ohio, and Ravenswood, WV: local restaurants by town, late-night food for shift workers, and each place's own link.",
  h1: "Where to eat in Parkersburg, Marietta, Ohio, and Ravenswood",
  lede: "Restaurants in the three towns where Mt Cottages has homes, one section per town, each taken from that town's official visitor or city directory. We do not rate or rank anyone: every name links to the place's own site, so you can read its menu and hours from the source.",
  published: checked,
  updated: checked,
  towns: ["parkersburg", "marietta", "ravenswood"],
  topics: ["dining", "things-to-do"],
  audiences: ["visitor", "healthcare", "crew", "long-term"],
  homeIds: ["frederick", "broad", "oak", "buck", "henrietta", "virginia"],
  sections: [
    {
      id: "how-we-list",
      heading: "How this list works",
      blocks: [
        {
          kind: "p",
          text: `Each place below is listed in its town's official directory, and links to its own website or, where it has none, to the page that directory links for it. We copy no reviews or ratings and show no photos of businesses. Menus and hours change often, so check the place's own page on the day you go. We last checked every link on ${readOn}.`,
        },
      ],
    },
    {
      id: "parkersburg",
      heading: "Parkersburg, WV",
      blocks: [
        {
          kind: "p",
          text: "Downtown Parkersburg and the stretch toward the river hold most of the sit-down places. The Greater Parkersburg Convention and Visitors Bureau keeps the official restaurant directory, grouped into casual cuisine, fine dining, craft breweries, international flavors and sweet treats.",
        },
        {
          kind: "places",
          places: [
            { name: "Huffman's Prime Steakhouse", kind: "Steakhouse", url: "https://www.huffmansprime.com/" },
            { name: "North End Tavern & Brewery", kind: "Restaurant and brewery", url: "https://www.netbrewery.com/" },
            { name: "Parkersburg Brewing Company", kind: "Craft brewery", url: "https://www.parkersburgbrewing.com/" },
            { name: "The Bakery and Coffeehouse", kind: "Bakery and coffee", url: "https://www.bakeryandcoffeehouse.com/" },
            { name: "Cham's Lebanese Cuisine", kind: "Lebanese", url: "https://www.facebook.com/ChamsLebaneseCuisine", via: "Facebook page" },
            { name: "Southern Craft Restaurant & Bar", kind: "Restaurant and bar", url: "https://www.facebook.com/SouthernCraftWV", via: "Facebook page" },
            { name: "J.P. Henry's", kind: "Restaurant", url: "https://www.facebook.com/j.p.henrysrestaurant/", via: "Facebook page" },
          ],
        },
      ],
    },
    {
      id: "marietta",
      heading: "Marietta, Ohio",
      blocks: [
        {
          kind: "p",
          text: "Most of Marietta, Ohio's restaurants sit in the walkable downtown along Front Street and the levee, a short walk from Frederick Cottage. The Marietta-Washington County Convention and Visitors Bureau keeps the official dining directory.",
        },
        {
          kind: "places",
          places: [
            { name: "Busy Bee Restaurant", kind: "Restaurant", url: "https://www.busybeerestaurant.com/" },
            { name: "The Galley", kind: "Restaurant", url: "https://www.thegalleymarietta.com/" },
            { name: "Levee House Bistro", kind: "Bistro: seafood and wine", url: "https://www.leveehousebistro.com/" },
            { name: "Austyns", kind: "Fine dining", url: "https://www.austyns.com/" },
            { name: "The Gun Room at the Lafayette Hotel", kind: "Hotel restaurant", url: "https://lafayettehotel.com/the-gun-room/" },
            { name: "Tampico", kind: "Mexican", url: "https://tampicomexicanrestaurant.com/" },
            { name: "Over the Moon Pizzeria", kind: "Pizza", url: "https://moonpizza.net/" },
            { name: "The Original Pizza Place", kind: "Pizza", url: "https://www.theoriginalpizzaplace.com/" },
            { name: "Black Diamond Brewery & Distillery", kind: "Brewery and distillery", url: "https://www.blackdiamondbreweryanddistillery.com/" },
            { name: "Wilky's Sports Bar", kind: "Sports bar", url: "https://wilkysbar.com/" },
            { name: "Stoked Coffee", kind: "Coffee", url: "https://www.stokedcoffee.com/" },
            { name: "Whit's Frozen Custard", kind: "Frozen custard", url: "https://www.whitsfrozencustard.com/" },
            { name: "Cone & Shake at the Oasis", kind: "Ice cream", url: "https://www.coneandshakeattheoasis.com/" },
          ],
        },
      ],
    },
    {
      id: "ravenswood",
      heading: "Ravenswood, WV",
      blocks: [
        {
          kind: "p",
          text: "Ravenswood is a small river town, and most of its places to eat are on or near Washington Street downtown. The City of Ravenswood keeps the official list, with each place's hours; for a wider choice, Ripley, the county seat, is a short drive south and Parkersburg is up the river.",
        },
        {
          kind: "places",
          places: [
            { name: "Steaming Cup Cafe", kind: "Coffee and cafe", url: "https://www.facebook.com/steamingcupcafewv/", via: "Facebook page" },
            { name: "Santee Sweets", kind: "Bakery and sweets", url: "https://www.facebook.com/profile.php?id=61561474259758", via: "Facebook page" },
            { name: "Las Fajitas Mexican Grill", kind: "Mexican", url: "https://www.facebook.com/lasfajitasmexicangrillwv", via: "Facebook page" },
            { name: "The Dawg Pound", kind: "American", url: "https://www.facebook.com/DawgPoundRestaurant", via: "Facebook page" },
            { name: "Inaka Hibachi and Sushi", kind: "Japanese", url: "https://www.facebook.com/profile.php?id=61567644182982", via: "Facebook page" },
            { name: "Gino's Pizza and Spaghetti House", kind: "Pizza and spaghetti", url: "https://ginospizza.com/" },
            { name: "Tudor's Biscuit World", kind: "Breakfast and biscuits", url: "https://tudorsbiscuitworld.com/" },
          ],
        },
      ],
    },
    {
      id: "late-night",
      heading: "Late-night food for shift workers",
      blocks: [
        {
          kind: "p",
          text: "Coming off a night shift at a hospital or a plant, most sit-down kitchens are closed. These are the places whose own pages, or the town's official list, showed late hours when we checked. Hours change, so confirm on the linked page the same day.",
        },
        {
          kind: "places",
          places: [
            { name: "Denny's, Marietta, Ohio", kind: "Diner; its location page lists it as open 24 hours", url: "https://locations.dennys.com/oh/marietta/249690" },
            { name: "Omelet Shoppe, Parkersburg", kind: "Diner; its location page lists 24-hour hours", url: "https://www.theomeletshoppe.com/parkersburg" },
            { name: "Taco Bell and McDonald's, Ravenswood", kind: `Fast food; the City of Ravenswood list showed Taco Bell open until 1 AM daily and McDonald's until 1 AM on Fridays and Saturdays (read ${readOn})`, url: "https://www.cityofravenswood.com/1197/Restaurants", via: "City of Ravenswood list" },
          ],
        },
        {
          kind: "p",
          text: "A furnished month with a full kitchen also means you can cook on your own schedule: every Mt Cottages home has one, so a late shift does not depend on what is still open.",
        },
      ],
    },
    {
      id: "staying",
      heading: "A month near your table",
      blocks: [
        {
          kind: "p",
          text: "Mt Cottages homes are furnished stays of 30 nights or more in Marietta, Ohio, Parkersburg and Ravenswood, for travel nurses, contractors, people moving to the valley and families visiting for a season.",
        },
        { kind: "cta", heading: "Spend a month in the Mid-Ohio Valley.", text: "Send your dates and what brings you to the valley, and we will confirm which home is free." },
      ],
    },
  ],
  sources: [
    { label: `Greater Parkersburg CVB: restaurant directory (read ${readOn})`, url: "https://www.greaterparkersburg.com/directory/category/restaurant/" },
    { label: `Marietta-Washington County CVB: dining directory (read ${readOn})`, url: "https://mariettaohio.org/categories/dine/" },
    { label: `City of Ravenswood: restaurants, with hours (read ${readOn})`, url: "https://www.cityofravenswood.com/1197/Restaurants" },
  ],
};
