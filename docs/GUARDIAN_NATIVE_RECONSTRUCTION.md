# Guardian native reconstruction — 5 November 2026

Confirmed scope: reconstruct the separate `apps/mobile-guardian` Expo application; preserve the existing Guardian website. The user's current gold/amber branding takes precedence over magenta in the attached templates and reference screenshots. References determine composition and component order; they do not authorize fabricated records.

## Initial implementation audit

The repository now contains an Expo SDK 52 / React Native 0.76.7 app, Expo Router entry, Lucide Native and React Native SVG. The native screens exist, but their identity, transactions, attendance, subjects and calendar are mostly sample arrays/fallback literals. Authentication starts with `mock-guardian-jwt-session`, and the child context starts with three fictional approved wards. The API types do not match several actual server responses. Fee collection calls an endpoint previously audited as lacking provider settlement verification. The native logo is an invented delta, while the web brand contains the approved tilted gold emblem.

| Reference | Initial implementation | Reconstruction contract |
|---|---|---|
| Home / compact home | Two cards present; fictional child, average, attendance and deltas | Live selected child, two primary cards, compact academic/fee/report details, four quick actions, real updates |
| Child switcher | Native modal with mock default children | Gorhom bottom sheet, approved links only, explicit loading/empty/error state and link request |
| Academics | Tabs change selection but show the same sample subjects | Actual overview/results/subjects, recorded grading, report details and period context |
| Attendance | Fixed counts and default monthly bars | Actual recorded present/absent/late counts and monthly dates; no invented improvement |
| Payments | Fixed invoice amounts; arbitrary successful payment flow | Reconciled server-recorded ledger/history; collection unavailable until verified provider flow exists |
| Messages | Fixed names/previews and dead search | Real threads, search/filter, messages and reply submission with retry state |
| Calendar | Fixed reference month/events | Current month, date selection, real persisted `/api/v2/calendar` events |
| Updates | Sample notice/photo data | Persisted notifications/notices and calendar records; optional actual school media |
| Profile / More | Reference identity and placeholder controls | Real profile, approved wards, preferences, account support and actual sign-out |
| Onboarding | New approximation of logo/photo | Approved gold emblem, reference CTA hierarchy, genuine sign-in; original family photo remains an asset dependency |

## Libraries and compatibility

Keep Expo 52 and existing StyleSheet tokens rather than migrating the web app or combining competing styling frameworks. The installed Expo `bundledNativeModules.json` selects SecureStore ~14.0.1, Gesture Handler ~2.20.2 and Reanimated ~3.16.1. Gorhom Bottom Sheet 5.0.6 is selected for its Reanimated 3/gesture-handler integration. Existing Lucide Native supplies actual external icons; React Native SVG supplies data graphics and the exact approved brand geometry.

Official references: [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [Gorhom installation](https://gorhom.dev/react-native-bottom-sheet/), [React Native Reusables](https://reactnativereusables.com/), [Lucide](https://lucide.dev/). Current Expo documentation redirects old SDK URLs to latest; installed SDK compatibility metadata, not the latest documentation version number, determines dependency versions. React Native Reusables was evaluated; introducing NativeWind and a second styling pipeline is unnecessary for this existing StyleSheet app. Victory/Skia is unnecessary for the small ring/bar graphics and would add a larger native dependency surface.

## Layout specification

Image-derived proportions are estimates, not Figma measurements. Use 18–20 logical px side gutters, 44px minimum action targets, 14–18px card radii, 13–15px body text, 18–20px headers and 30–38px primary metric text. White/warm-neutral surfaces, deep amber controls, soft amber selected cards, restrained green for positive recorded states. Navigation remains Home / Academics / Payments / More. Secondary screens have a contextual back header. Keep dense rows and useful metadata instead of expanding every section into a large card.

Home: greeting/bell → selected-child row → paired academic/attendance cards → four quick actions → fee/report summaries → updates. Academics: header/period → segmented tabs → open ring → subject rows. Attendance: header/period → metric plus calendar symbol → three counts → recorded chart/history. Fees: segmented overview/history → balance card → honest payment availability → invoices. Messages: segmented list/search → real conversation. Calendar: month navigation → Monday-first grid → day events. Profile: identity/avatar → account/children/preferences/security/support rows → sign-out. Child sheet: handle/title → selectable approved children → link-child action.

## Assets and data integrity

- Approved emblem source: `frontend/components/brand/AcqadLogo.tsx`; reuse exact geometry with native SVG primitives. Gold stops: #F59E0B / #D97706 / #92400E.
- Supplied layout references: `C:/Users/HP/Downloads/ACQAD_Mobile_Reference_Wireframe_Pack/screens/guardian_*.png`. These flattened screenshots are references, not original portrait/campus/photo exports.
- No separate high-resolution onboarding family photo or original reference portraits were found in the supplied pack. Use authenticated profile/ward image URLs where provided, otherwise initials. Do not substitute unrelated stock people or generated artwork.
- An optional configured, school-approved onboarding image can fill the reference hero. Its absence is documented, not presented as recovered imagery.
- Server response errors remain errors. Empty records remain empty. Notifications/calendar examples from mock endpoints must not be represented as real school events.

## Implementation and validation

Replace mock authentication and fallback children first; normalize actual API envelopes, cancel stale child/account requests, then reconstruct reusable native screen compositions. Use real SecureStore on devices and ephemeral preview storage on web. Preserve data authority and expose available metadata only. Verify types, Expo web export, browser-rendered reference comparisons with labelled QA fixtures, and real HTTP integration against a disposable backend. Android/iOS device validation and original-photo fidelity require separate evidence; compilation and web screenshots alone do not establish those claims.
