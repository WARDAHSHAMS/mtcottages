// Stubs the stay host (stay.mtcottages.com) for "never submit" tests.
//
// The production build's Analytics.astro posts its cookieless visit and
// cta_click beacons to /api/collect on the same host, so a guard that counts
// every request there fails on the live site although no form was ever sent
// (Pages runs 43834346843, 43843076124). The collector is answered with 204,
// so no test pageview reaches production counts, and not recorded. Every other
// request gets a stub page, and its method goes into `methods`, so the caller
// can assert the stay form was only ever opened (GET), never posted.
const stubStayHost = async (context, stay = "https://stay.mtcottages.com/") => {
  const methods = [];
  await context.route(`${stay}**`, (route) => {
    const request = route.request();
    if (new URL(request.url()).pathname === "/api/collect") return route.fulfill({ status: 204 });
    methods.push(request.method());
    return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><title>Stay form stub</title><p>stub</p>" });
  });
  return methods;
};

module.exports = { stubStayHost };
