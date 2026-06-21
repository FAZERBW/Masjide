/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UIStyle = 'glass' | 'metro' | 'simple';

export type AppTheme = 
  | 'emerald-light' | 'emerald-dark'
  | 'gold-light' | 'gold-dark'
  | 'sky-light' | 'sky-dark'
  | 'rose-light' | 'rose-dark'
  | 'teal-light' | 'teal-dark'
  | 'indigo-light' | 'indigo-dark'
  | 'violet-light' | 'violet-dark'
  | 'amethyst-light' | 'amethyst-dark'
  | 'amber-light' | 'amber-dark'
  | 'crimson-light' | 'crimson-dark'
  | 'coral-light' | 'coral-dark'
  | 'slate-light' | 'slate-dark';

export type AppLanguage = 'en' | 'ur' | 'hi' | 'mr' | 'ar';

export type ActiveTab = 'home' | 'gallery' | 'query' | 'about' | 'settings' | 'about-app' | 'about-developer' | 'notifications' | 'read';

export interface PrayerTime {
  azan: string;
  jamat: string;
  start?: string;
  end?: string;
}

export interface PrayerTimings {
  fajr: PrayerTime;
  zuhr: PrayerTime;
  asr: PrayerTime;
  maghrib: PrayerTime;
  isha: PrayerTime;
  juma: PrayerTime;
  sahr: string;
  iftar: string;
  sunrise: string;
  midday: string;
  sunset: string;
  ishraqStart: string;
  ishraqEnd: string;
  chashtStart: string;
  chashtEnd: string;
  eidulfitr?: string;
  eiduladha?: string;
  eid_enabled?: boolean;
  eid_fitr_enabled?: boolean;
  eid_adha_enabled?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  type: 'info' | 'alert' | 'event' | 'warning' | 'reminder' | 'update';
  schedule_time?: string;
  valid_from?: string;
  valid_till?: string;
  imageUrl?: string;
  image?: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  category?: string;
}

export interface AppPreferences {
  uiStyle: UIStyle;
  language: AppLanguage;
  theme: AppTheme;
  firstTimeSetup: boolean;
}

export interface AppStatus {
  active: boolean;
  packageName: string;
}

export interface AppVersion {
  versionCode: number;
  versionName: string;
  title: string;
  description: string;
  downloadUrl: string;
  forceUpdate: boolean;
}

export interface QuerySubmission {
  name: string;
  mobile: string;
  address: string;
  query: string;
}
