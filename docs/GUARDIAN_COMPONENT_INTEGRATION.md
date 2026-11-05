# Guardian component integration

## Selection plan — 5 November 2026

The separate Expo app is the implementation target. The existing website is preserved. The user's gold/amber direction takes precedence over the attached brief's magenta examples. Reference screenshots establish information hierarchy, not permission to invent academic or financial records.

| Screens / objective | Selected source | Official documentation | Import / customization | Data |
| --- | --- | --- | --- | --- |
| All: consistent actions | gluestack Button, Link, Pressable | https://v5.gluestack.io/ui/docs/components/button | CLI-owned `src/components/ui`; amber, 44px minimum targets | Existing callbacks |
| Home, payments, updates: readable summaries | gluestack Card, Box, Badge | https://v5.gluestack.io/ui/docs/components/card | CLI source, restrained borders and selective cards | Approved wards, fees, notifications |
| Child identity, messages, profile | gluestack Avatar | https://v5.gluestack.io/ui/docs/components/avatar | Real portrait URL; initials when absent | Selected approved ward / authenticated guardian |
| Sign-in, linking, messaging | gluestack Input; evaluate Native Animation Base Sign In Block | https://v5.gluestack.io/ui/docs/components/input | Real auth callback; no simulated verification or provider login | Existing guardian endpoints |
| Academics: subject progress | gluestack Progress | https://v5.gluestack.io/ui/docs/components/progress | Actual normalized percentage; accessible values | Released report rows |
| Academics, attendance, payment tabs | Native Animation Base Tabs | https://github.com/NativeAnimation/react-native-animations/tree/main/animations/base-tabs | Free MIT source; school palette, selected state | Existing screen state |
| All: pending data | Native Animation Base Skeleton | https://github.com/NativeAnimation/react-native-animations/tree/main/animations/base-skeleton | Free MIT source, reduced motion | Real request loading only |
| More/settings | Base Settings Block / Base List Row evaluation | https://github.com/NativeAnimation/react-native-animations/tree/main/animations/base-settings-block | Use supported controlled settings; retain server persistence | Guardian notification preferences |
| Records/detail | Base List Detail Block evaluation | https://github.com/NativeAnimation/react-native-animations/tree/main/animations/base-list-detail-block | Read source; avoid exposing unsupported record edits | Read-only school records |
| Confirmation feedback | gluestack Toast | https://v5.gluestack.io/ui/docs/components/toast | Source component, announce actual successful writes only | Message and preferences responses |
| Child switching | Existing Gorhom BottomSheet | https://gorhom.dev/react-native-bottom-sheet/ | Retain working native sheet and approved-child isolation | Approved links |

## Compatibility and source policy

Original app: Expo 52, React Native 0.76, Reanimated 3. Native Animation CLI 0.4.2 explicitly rejected SDK 52; Base releases offered SDK 57 and 58. Upgrade the separate app to supported SDK 57 and use Expo's dependency version map. Do not force a Reanimated 4 component into the old runtime or relabel a custom control as imported source.

gluestack v5 documentation offers NativeWind v5 or UniWind; inspect CLI options and choose one compatible engine. HeroUI Native was reviewed as an alternative (https://heroui.com/en/docs/native/components); do not install a second component foundation. Alpha Calendar/Tabs/BottomSheet are not required where existing implementations already work.

Native Animation Base is advertised MIT with no login; retain the license copied with each source. Shimmer and premium components require separate entitlement checks. No purchase, fake login, or copied gated implementation is authorized.

## Assets and evidence

The supplied reference pack contains flattened screenshots, not original family portraits or school photography. Keep approved API image URLs and initials fallbacks; preserve the canonical ACQAD logo. No generated icons. Do not imply photographs in screenshots were recovered or licensed. Optional onboarding image remains a school-configured URL.

Capture rendered Expo web previews after integration and compare their hierarchy against the supplied screenshots. Browser rendering is not an Android/iOS emulator test; report this distinction. Preserve real API request/error/empty states and child-context reset behavior throughout.

## Base source integration

Imported with Native Animation CLI 0.4.2 on SDK 57. Each `src/components/base-*/` directory retains its upstream LICENSE, README and `nativeanimation.manifest.json`. Manifests specify Reanimated 4.5.1 and Worklets 0.10.1; copied README compatibility paragraphs describe the latest SDK 58 release, so the manifest and CLI's selected SDK 57 release are the relevant dependency evidence.

Rendered components:

- `GuardianEntry`: Base Sign In Block, with genuine auth callbacks, no provider buttons, no verification step, and school-server accessory. Added optional brand/accessory/remember visibility props to the permitted source. Recovery links explain the school-office process.
- `GuardianPreferences`: Base Settings Block with school-backed notification rows and Base Switch. Added source slots to omit unsupported language, appearance and account-deletion sections. No demo profile or default preferences are presented as school data.
- `Updates`: Base List Detail Block with persisted notices/calendar events, search, category chips and details. Added source `readOnly` mode to remove and guard all local create/edit/delete paths.
- `NativeUI.Page`, `Row`, `Feedback`: Base Header, Base List Row and Base Skeleton.
- `SegmentedControl`: controlled Base Tabs. Spring indicator and text use ACQAD amber/white; upstream reduced-motion handling retained.
- Record details: Base Sheet with safe-area bottom inset, explicit close control and scrollable content. Added shrinking content wrapper to avoid long records overflowing the sheet.

Source fixes during integration: moved Base List Row's activation spread before explicit accessibility handlers and removed duplicate ARIA fields in Base Toggle Group. This resolves TypeScript duplicate-prop errors while preserving assistive activation. The Geist font package supplies regular/medium/semibold weights; Lucide was updated for React 19 compatibility.

The account-gated Shimmer Skeleton and paid catalog examples are not represented as integrated. The free MIT Base Skeleton provides real loading feedback without requiring an account or a purchase.
