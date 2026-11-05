// ACQAD Guardian Native API Client

export let API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export function setApiBaseUrl(url: string) {
  const value=url.trim().replace(/\/$/, '');
  if(value&&!/^https?:\/\//i.test(value))throw new Error('Use a full https:// school server address.');
  if(value&&!__DEV__&&!/^https:\/\//i.test(value))throw new Error('School connections must use HTTPS in a release build.');
  API_BASE_URL=value;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: json?.error || json?.message || `Request failed with status ${response.status}`,
      };
    }

    return {
      success: true,
      data: json.data !== undefined ? json.data : json,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network request failed. Ensure ACQAD server is running.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Guardian Portal Typed Endpoints ──────────────────────────────────────────

export interface Ward {
  id: number;
  name: string;
  reg_id: string;
  grade: string;
  class_name?: string;
  avatar?: string;
  term_average?: number;
  attendance_rate?: number;
  student_id?: number;
  image_url?: string;
  average_score?: number | null;
  attendance_pct?: number | null;
  completed_exams?: number;
  total_exams?: number;
  class_position?: string;
  school_name?: string;
  subjects_performance?: Array<{subject_name:string; score:number; grade?:string; subject_code?:string}>;
  attendance?: {present_days:number; absent_days?:number; late_days?:number; total_days:number};
  fees?: {balance:number};
  recent_activity?: Array<{id:string;title:string;date_label:string;type?:string}>;
}

export interface WardPerformance {
  overall_average: number;
  improvement_pct: number;
  subjects: Array<{
    id: number;
    name: string;
    score: number;
    grade: string;
    teacher_name?: string;
  }>;
}

export interface WardAttendance {
  attendance_rate: number;
  improvement_pct: number;
  days_present: number;
  days_absent: number;
  days_late: number;
  monthly_trend: Array<{
    month: string;
    percentage: number;
  }>;
}

export interface FeeItem {
  id: number;
  title: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  due_date: string;
}

export interface FeeSummary {
  outstanding_balance: number;
  due_date: string;
  fees: FeeItem[];
}

export interface MessageThread {
  id: number;
  recipient_name: string;
  recipient_role: string;
  subject: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  category: "teacher" | "school" | "system" | "admin";
  avatar?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  time_str?: string;
  type: string;
  venue?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  priority: string;
  date: string;
  date_str?: string;
  banner_url?: string;
}

export const guardianApi = {
  // Wards & Switching
  getWards: () => apiRequest<{ wards: Ward[]; stats: any }>("/api/guardian/wards"),
  getWardPerformance: (wardId: number) => apiRequest<WardPerformance>(`/api/guardian/wards/${wardId}/performance`),
  getWardAttendance: (wardId: number) => apiRequest<WardAttendance>(`/api/guardian/wards/${wardId}/attendance`),
  getWardFees: (wardId: number) => apiRequest<FeeSummary>(`/api/guardian/wards/${wardId}/fees`),
  payWardFee: (wardId: number, feeId: number, amount: number, method: string) =>
    apiRequest(`/api/guardian/wards/${wardId}/fees/pay`, {
      method: "POST",
      body: JSON.stringify({ fee_id: feeId, amount, method }),
    }),

  // Messaging
  getMessageThreads: () => apiRequest<MessageThread[]>("/api/guardian/messages/threads"),
  getThreadMessages: (threadId: number) => apiRequest<any[]>(`/api/guardian/messages/threads/${threadId}`),
  sendMessage: (threadId: number, text: string) =>
    apiRequest(`/api/guardian/messages/threads/${threadId}`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // Calendar & Updates
  getCalendar: () => apiRequest<CalendarEvent[]>("/api/v2/calendar"),
  getAnnouncements: (category?: string) =>
    apiRequest<Announcement[]>(`/api/guardian/announcements${category ? `?category=${category}` : ""}`),

  // Profile & Links
  getProfile: () => apiRequest<any>("/api/guardian/profile"),
  getLinks: () => apiRequest<any[]>("/api/guardian/links"),
  requestStudentLink: (regId: string, relationship: string) =>
    apiRequest("/api/guardian/links", {
      method: "POST",
      body: JSON.stringify({ student_reg_id: regId, relationship }),
    }),
};

export async function requestData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const result=await apiRequest<T>(endpoint,options);
  if(!result.success)throw new Error(result.error || 'The school could not be reached.');
  return result.data as T;
}

