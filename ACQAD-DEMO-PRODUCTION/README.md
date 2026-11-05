# ACQAD / eCard School Management Platform — Client Product Demonstration Package

Welcome to the autonomous demonstration production directory for the **eCard / ACQAD School Management & CBT Ecosystem**.

This directory contains the complete commercial presentation suite produced directly from the live application codebase, featuring 77 authentic screenshots, 2 user interaction screencasts, a scene-by-scene storyboard, neural voiceover narration audio, timed subtitles, architectural reports, and the final 1080p demonstration video.

---

## Deliverables Directory Structure

```text
ACQAD-DEMO-PRODUCTION/
├── final/
│   └── ACQAD-Client-Demo.mp4             # Rendered 1080p 30fps presentation (07:40, 10.37 MB)
├── captions/
│   ├── subtitles.srt                     # Timed SRT subtitles (59 cues)
│   └── on-screen-captions.json           # On-screen headline and card metadata
├── scripts/
│   ├── narration_script.txt              # Full 13-scene narration script (954 words, 460s)
│   └── voiceover_guide.md                # Delivery pacing, pronunciation, and tone guide
├── storyboard/
│   ├── STORYBOARD.md                     # Executive storyboard & timeline guide
│   └── storyboard.json                   # Machine-readable storyboard specification
├── screenshots/
│   ├── manifest.json                     # Metadata index for all 77 screenshots
│   ├── README.md                         # Screenshot gallery guide & module index
│   └── *.png                             # 77 authentic desktop & mobile screenshots
├── recordings/
│   ├── R01_admin_navigation-tour.mp4     # Admin portal walkthrough screencast
│   ├── R03_guardian_mobile-tour.mp4      # Guardian mobile portal screencast
│   └── frames/                           # Raw high-resolution captured JPEG frames
├── video-project/
│   ├── audio/                            # 13 scene audio files + master narration MP3
│   ├── scenes/                           # 13 rendered scene MP4 video clips
│   └── automation/                       # Puppeteer automated browser capture harness
└── reports/
    ├── 01-Architecture-and-Module-Analysis.md         # Full codebase tech stack & DB audit
    ├── 02-User-Journeys-and-Missing-Functionality.md   # Cross-role journey maps & edge cases
    ├── 03-QA-Verification-Report.md                   # Full QA verification & test results
    └── capture-log.json                               # Raw telemetry and redaction logs
```

---

## Quick Start for Client Presentations

1. **Watch the Master Video:**
   - Open [`final/ACQAD-Client-Demo.mp4`](final/ACQAD-Client-Demo.mp4) in VLC, QuickTime, or any modern browser.
   - The video includes embedded English soft subtitles (`mov_text`) and synchronized neural audio (`en-GB-RyanNeural`).
   - Duration is exactly **7 minutes 40 seconds (460.56 seconds)**.

2. **Review the Storyboard:**
   - Read [`storyboard/STORYBOARD.md`](storyboard/STORYBOARD.md) for scene-by-scene timing, on-screen headlines, and institutional benefits.

3. **Inspect the Screenshots:**
   - Browse [`screenshots/manifest.json`](screenshots/manifest.json) or [`screenshots/`](screenshots/) to view the 77 high-resolution interface captures across all roles.

4. **Technical & QA Reports:**
   - Read [`reports/01-Architecture-and-Module-Analysis.md`](reports/01-Architecture-and-Module-Analysis.md) for database and network architecture.
   - Read [`reports/03-QA-Verification-Report.md`](reports/03-QA-Verification-Report.md) for complete compliance and test sign-offs.

