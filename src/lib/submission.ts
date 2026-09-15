import { TARGET_DOMAIN, type BacklinkSource } from "@/lib/sources";

/**
 * Manual Submission Assistant — data & logic layer.
 *
 * IMPORTANT: this module never submits anything to any third-party site.
 * It only (a) generates ready-to-paste listing text from a profile you fill
 * in once, and (b) remembers, per platform, whether you've submitted there
 * yet. Actually creating the listing is always a manual, human action —
 * that's a deliberate choice, not a limitation: automating account
 * creation / form submission / CAPTCHA-solving across hundreds of
 * third-party sites would violate most of their terms of service and put
 * {TARGET_DOMAIN}'s own search ranking at risk (Google treats mass
 * automated directory submission as a spam signal). See the "Gönderim
 * Asistanı" tab for the human-in-the-loop workflow this powers.
 */

export interface BusinessProfile {
  name: string;
  tagline: string;
  shortDescription: string; // ~80 chars — for directories with tight limits
  mediumDescription: string; // ~160 chars — the general-purpose default
  longDescription: string; // ~400 chars — for platforms with a full "About" field
  category: string;
  keywords: string; // comma-separated
  websiteUrl: string;
  contactEmail: string;
}

const PROFILE_KEY = "backlink_business_profile_v1";

export const DEFAULT_PROFILE: BusinessProfile = {
  name: "Immaculate",
  tagline: "Kısa slogan buraya (ör. \"Temizlik ve bakım hizmetleri\")",
  shortDescription: "Immaculate — kısa açıklamanızı buraya yazın (80 karakter civarı).",
  mediumDescription:
    "Immaculate hakkında orta uzunlukta, platformların çoğu dizin/profil formunda kullanılabilecek bir açıklama buraya yazılmalı (150-160 karakter civarı).",
  longDescription:
    "Immaculate hakkında daha detaylı, 'Hakkımızda' türü alanlarda kullanılabilecek uzun açıklama buraya yazılmalı. Hizmetleriniz, hedef kitleniz ve öne çıkan özellikleriniz burada anlatılabilir (300-500 karakter civarı).",
  category: "İşletme / Hizmet",
  keywords: "immaculate, immaculate.tr",
  websiteUrl: `https://${TARGET_DOMAIN}`,
  contactEmail: "",
};

export function loadProfile(): BusinessProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: BusinessProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage unavailable (private mode, quota) — profile just won't persist across reloads
  }
}

export function isProfileDefault(profile: BusinessProfile): boolean {
  return profile.tagline === DEFAULT_PROFILE.tagline;
}

/** Builds the ready-to-paste text block for one platform, from the current profile. */
export function buildSubmissionText(
  source: BacklinkSource,
  profile: BusinessProfile
): string {
  return [
    `Site Adı: ${profile.name}`,
    `Web Sitesi: ${profile.websiteUrl}`,
    `Kategori: ${profile.category}`,
    profile.contactEmail ? `E-posta: ${profile.contactEmail}` : null,
    `Slogan: ${profile.tagline}`,
    `Kısa Açıklama (~80 karakter): ${profile.shortDescription}`,
    `Orta Açıklama (~160 karakter): ${profile.mediumDescription}`,
    `Uzun Açıklama (~400 karakter): ${profile.longDescription}`,
    `Anahtar Kelimeler: ${profile.keywords}`,
    ``,
    `Hedef platform: ${source.name} (${source.base_url})`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

// --- Submission status tracking (per source, persisted locally) ---

export type SubmissionStatus =
  | "not_started"
  | "submitted"
  | "in_review"
  | "live"
  | "rejected";

export interface SubmissionRecord {
  status: SubmissionStatus;
  note: string;
  updatedAt: string | null;
}

const STATUS_KEY = "backlink_submission_status_v1";

export function loadSubmissionStatuses(): Record<string, SubmissionRecord> {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSubmissionStatus(
  sourceId: string,
  record: Partial<SubmissionRecord>
): Record<string, SubmissionRecord> {
  const all = loadSubmissionStatuses();
  const prev: SubmissionRecord = all[sourceId] || {
    status: "not_started",
    note: "",
    updatedAt: null,
  };
  const next: SubmissionRecord = {
    ...prev,
    ...record,
    updatedAt: new Date().toISOString(),
  };
  all[sourceId] = next;
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — status change still reflected in memory for this session
  }
  return all;
}

/** Sets the same status for many sources in a single localStorage write — used by "Tümünü Seç" + bulk actions. */
export function saveBulkSubmissionStatus(
  sourceIds: string[],
  status: SubmissionStatus
): Record<string, SubmissionRecord> {
  const all = loadSubmissionStatuses();
  const now = new Date().toISOString();
  for (const id of sourceIds) {
    const prev: SubmissionRecord = all[id] || { status: "not_started", note: "", updatedAt: null };
    all[id] = { ...prev, status, updatedAt: now };
  }
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — statuses still reflected in memory for this session
  }
  return all;
}

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  not_started: "Gönderilmedi",
  submitted: "Gönderildi",
  in_review: "İncelemede",
  live: "Yayında",
  rejected: "Reddedildi",
};

/**
 * Which platform types are realistic manual-submission targets (places with
 * an actual "add your business / add a listing" flow). Wikis, Q&A sites,
 * package registries, archives, and search engines aren't submission
 * targets in this sense — you don't "list your business" on Stack Overflow.
 */
export const SUBMITTABLE_TYPES = new Set(["directory", "social", "media"]);

export function isSubmittable(source: BacklinkSource): boolean {
  return SUBMITTABLE_TYPES.has(source.platform_type);
}
