# Guardian follow-up audit

The current request implements Admin/Teacher/Student refinements first. This Guardian audit records follow-up work, not completed fixes or native Expo delivery. Existing routes use Next.js, Material UI, Radix and the shared mobile shell. Review preserves the linked-child context and authenticated APIs.

| Surface | Finding and next action |
| --- | --- |
| Dashboard | Child-first overview is in place. Confirm missing metrics display unavailable rather than implying zero activity; validate every quick-tool destination. |
| Children / profile | Shared selector and linked-ID guard exist. Verify switching a child while a profile is open keeps identity and detail scope unambiguous. |
| Results | Highest priority: report preview includes a fixed session label and fallback CA/exam scores. Use the actual academic period and server scores; preserve real zeros and distinguish withheld from missing results. |
| Reports | Highest priority: attendance uses a sample 92% fallback. Replace with unavailable state and verify report/share failures leave a useful recovery path. |
| Performance | Validate chart axes, empty trends and published-only score scope. Do not represent missing history as improvement. |
| Attendance | Calendar labels and sample day counts were corrected earlier. Next verify request races on child changes, failed-load feedback, and year navigation. |
| Calendar | Fixed year remains in heading. Derive the heading and event filtering from one selected month/year state; provide empty agenda and error recovery. |
| Examinations | Sample 60-minute / 40-question fallbacks remain. Show only actual metadata and use unknown/untimed states correctly. |
| Fees | Separate due balance, invoices and recorded payments. Verify unsuccessful payment retains inputs; do not imply receipt before server confirmation. |
| Messages | Verify thread/recipient child scope, retained drafts on failure and mobile list/detail back navigation. |
| Notifications | Verify unread actions and keyboard access; distinguish no notifications from fetch failure. |
| Announcements | Verify category changes, long notice content and detail dismissal preserve list position. |
| Child linking | Keep pending/approved/rejected states explicit. Verify retry, cancellation and validation preserve registration input. |
| Settings | Real profile loading/error handling exists. Review field-level validation, independent save states and theme control discoverability. |
| Registration / sign-in | Sign-in layout is shared. Review registration validation, password visibility accessibility and phone keyboard/safe-area behavior. |

Recommended order: correct missing-data presentation and period labels; then validate child-scoped requests and recovery; then polish individual page hierarchy. Browser emulation cannot establish physical-device gesture quality or backend authorization isolation.
