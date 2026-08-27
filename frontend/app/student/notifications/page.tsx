"use client";

import { RequireRole } from "../../../components/auth/RequireRole";
import { NotificationsPage } from "../../../components/ui/NotificationsPage";

export default function StudentNotificationsRoute() {
  return (
    <RequireRole role="student">
      <NotificationsPage />
    </RequireRole>
  );
}
