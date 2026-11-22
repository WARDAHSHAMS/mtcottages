/**
 * The monthly furnished stays hub (#64), /stays/monthly/. It explains stay
 * lengths across every town and routes to the homes. Terms are only what is
 * confirmed: the one-month minimum and utilities come from src/data/terms.json
 * (checked for every home in src/data/policies.ts); the lease term beyond the
 * minimum, month-to-month notice and a 13-week end date are confirmed with the
 * guest, never stated here.
 */
import { policiesHref } from "./policies";

export const monthlyHref = "/stays/monthly/";

export const stayLengths = [
  { title: "30 days or more", body: "Every Mt Cottages stay is at least one month (30 nights). A month is enough to start a job, wait out a repair or try a town before you commit.", href: policiesHref, linkLabel: "Stay policies" },
  { title: "13 weeks", body: "A thirteen-week travel contract fits inside one stay. Send your contract dates and we check which home is free for all of them.", href: "/travel-nurses/", linkLabel: "Travel nurse housing" },
  { title: "Month to month", body: "If you do not know your end date yet, say so when you ask. The lease you sign sets the term and notice, and we confirm them with you before you commit.", href: policiesHref, linkLabel: "How leases and deposits work" },
] as const;

export const townLinks = [
  { name: "Marietta, Ohio", href: "/marietta/index.html" },
  { name: "Parkersburg, West Virginia", href: "/parkersburg/index.html" },
  { name: "Ravenswood, West Virginia", href: "/ravenswood/index.html" },
] as const;

/** Shown word for word on /stays/monthly/ and published as its FAQPage. */
export const monthlyFaqs: { q: string; a: string }[] = [
  { q: "What is the shortest stay you offer?", a: "One month (30 nights). We do not offer nightly or weekend stays at any home." },
  { q: "Can I stay for a 13-week contract?", a: "Yes. Send your contract start and end dates, and we tell you which homes are free for the whole contract." },
  { q: "Can I rent month to month?", a: "Tell us when you ask. Stays start at one month, and the lease you sign sets the term and notice period; we confirm both with you before you commit." },
  { q: "What does the monthly rate include?", a: "A whole furnished home with utilities included. Each home's page lists its rooms, furnishings and kitchen, and marks anything still to confirm." },
];
