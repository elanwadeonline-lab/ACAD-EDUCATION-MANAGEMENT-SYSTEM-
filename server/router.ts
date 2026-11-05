// server/router.ts
// Route zones consulted by handleApi before the legacy fallback chain.
// Order mirrors the original source order of the extracted zones.
import { tryPracticeContentOffline } from "./handlers/practice-content-offline";
import { tryV2AcademicCore, tryV2Calendar } from "./handlers/v2-academic";
import { tryGuardianLinksAdmin } from "./handlers/guardian-links";
import {
  tryGuardianPortalZoneA,
  tryGuardianPortalZoneB,
  tryGuardianPortalZoneC,
} from "./handlers/guardian-portal";
import { tryAdminMessages } from "./handlers/admin-messages";
import { tryPracticeArena } from "./handlers/practice-arena";
import { tryLearningCommunity } from "./handlers/learning-community";

type ZoneHandler = (req: Request, method: string, pathname: string, url: URL) => Promise<Response | null>;

const zones: ZoneHandler[] = [
  tryLearningCommunity,
  tryPracticeArena,
  tryPracticeContentOffline,
  tryV2AcademicCore,
  tryGuardianLinksAdmin,
  tryV2Calendar,
  tryGuardianPortalZoneA,
  tryGuardianPortalZoneB,
  tryGuardianPortalZoneC,
  tryAdminMessages,
];

export async function handleRouted(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  for (const zone of zones) {
    const res = await zone(req, method, pathname, url);
    if (res) return res;
  }
  return null;
}
