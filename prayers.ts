/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrayerTimings, AppLanguage } from '../types';

// Static fallbacks exactly corresponding to the physical panel in the user photo
export const DEFAULT_PRAYERS: PrayerTimings = {
  fajr: { azan: '05:10 AM', jamat: '05:30 AM', start: '05:00 AM', end: '05:51 AM' },
  zuhr: { azan: '01:10 PM', jamat: '01:30 PM', start: '12:27 PM', end: '05:10 PM' },
  asr: { azan: '05:10 PM', jamat: '05:30 PM', start: '05:10 PM', end: '07:03 PM' },
  maghrib: { azan: '07:03 PM', jamat: '07:12 PM', start: '07:03 PM', end: '08:30 PM' },
  isha: { azan: '08:30 PM', jamat: '08:45 PM', start: '08:30 PM', end: '05:00 AM' },
  juma: { azan: '01:10 PM', jamat: '01:30 PM' },
  sahr: '04:23 AM',
  iftar: '07:05 PM',
  sunrise: '05:51 AM',
  midday: '12:27 PM', // Zawal time
  sunset: '07:03 PM',
  ishraqStart: '06:11 AM',
  ishraqEnd: '09:09 AM',
  chashtStart: '09:30 AM',
  chashtEnd: '11:45 AM',
  eidulfitr: '06:30 AM',
  eiduladha: '06:45 AM',
  eid_enabled: true,
  eid_fitr_enabled: true,
  eid_adha_enabled: true
};

/**
 * Converts a time string "HH:MM AM/PM" or "HH.MM AM/PM" to minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  
  // Clean string and standardize separators
  let cleanStr = timeStr.trim().replace('.', ':');
  const parts = cleanStr.split(/\s+/);
  if (!parts[0]) return 0;
  
  let [hStr, mStr] = parts[0].split(':');
  let hours = parseInt(hStr, 10);
  let minutes = parseInt(mStr, 10);
  
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;
  
  const ampm = (parts[1] || '').toUpperCase();
  
  // Logical determination if AM/PM indicator is missing but implicit (by hour magnitudes)
  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  } else if (!parts[1]) {
    // If no explicit AM/PM:
    if (hours < 12 && (cleanStr.includes('PM') || cleanStr.includes('pm'))) {
      hours += 12;
    }
  }
  
  return hours * 60 + minutes;
}

/**
 * Convert minutes back to standard localized AM/PM string formats.
 */
export function minutesToTimeString(minutes: number): string {
  let h = Math.floor(minutes / 60);
  let m = minutes % 60;
  const modifier = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${modifier}`;
}

/**
 * Find current and upcoming prayer indices based on local clock time.
 */
export function calculateCurrentAndNext(
  timings: PrayerTimings,
  nowMin: number,
  isFriday: boolean
): {
  currentId: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'juma';
  nextId: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'juma';
} {
  const getStartMin = (key: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'juma'): number => {
    const item = timings[key];
    if (key === 'juma' && !item?.start) {
      return timeStringToMinutes(timings.zuhr?.start || '12:27 PM');
    }
    return timeStringToMinutes(item?.start || item?.jamat || '12:00 AM');
  };

  const fajrStart = getStartMin('fajr');
  const zuhrStart = getStartMin(isFriday ? 'juma' : 'zuhr');
  const asrStart = getStartMin('asr');
  const maghribStart = getStartMin('maghrib');
  const ishaStart = getStartMin('isha');

  let currentId: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'juma' = 'isha';
  let nextId: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'juma' = 'fajr';

  if (nowMin >= fajrStart && nowMin < zuhrStart) {
    currentId = 'fajr';
    nextId = isFriday ? 'juma' : 'zuhr';
  } else if (nowMin >= zuhrStart && nowMin < asrStart) {
    currentId = isFriday ? 'juma' : 'zuhr';
    nextId = 'asr';
  } else if (nowMin >= asrStart && nowMin < maghribStart) {
    currentId = 'asr';
    nextId = 'maghrib';
  } else if (nowMin >= maghribStart && nowMin < ishaStart) {
    currentId = 'maghrib';
    nextId = 'isha';
  } else {
    // This is the Isha interval (runs across midnight, e.g. from ishaStart to 23:59 and from 00:00 to fajrStart)
    currentId = 'isha';
    nextId = 'fajr';
  }

  return { currentId, nextId };
}

/**
 * Simple calculation of approximate Hijri date for the given date.
 */
export function getApproxHijriDate(date: Date, lang: AppLanguage): string {
  const hMonthsEn = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah'];
  
  const hMonthsUr = ['محرم الحرام', 'صفر المظفر', 'ربیع الاول', 'ربیع الثانی', 'جمادی الاول', 'جمادی الثانی', 'رجب المرجب', 'شعبان المعظم', 'رمضان المبارک', 'شوال المکرم', 'ذوالقعدہ', 'ذوالحجہ'];

  const hMonthsHi = ['मुहर्रम', 'सफ़र', 'रबी अल-अव्वल', 'रबी अल-थानी', 'जुमादा अल-उला', 'जुमादा अल-थानी', 'रजब', 'शाबान', 'रमज़ान', 'शव्वाल', 'धुल क़ादा', 'धुल हिज्जाह'];

  const hMonthsMr = ['मुहर्रम', 'सफर', 'रबी अल-अव्वल', 'रबी अल-थानी', 'जुमादा अल-उला', 'जुमादा अल-थानी', 'रजब', 'शाबान', 'रमजान', 'शव्वाल', 'धुल कादा', 'धुल हिज्जाह'];

  const hMonthsAr = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

  let hMonths = hMonthsEn;
  if (lang === 'ur') hMonths = hMonthsUr;
  else if (lang === 'hi') hMonths = hMonthsHi;
  else if (lang === 'mr') hMonths = hMonthsMr;
  else if (lang === 'ar') hMonths = hMonthsAr;

  // Let's do an approximate algorithm (offset reference: Oct 1, 1447 is approx June 2026/May 2026)
  // Let's use the standard Intl approximation in a safe try-catch
  try {
    const formatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    let hd = '';
    let hm = 1;
    let hy = '';
    parts.forEach(p => {
      if (p.type === 'day') hd = p.value;
      if (p.type === 'month') hm = parseInt(p.value, 10);
      if (p.type === 'year') hy = p.value;
    });

    const mName = hMonths[hm - 1] || hMonths[0];
    
    // Arabic or Urdu numerals could be outputted, but let's keep it clean
    if (lang === 'ur' || lang === 'ar') {
      return `${hd} ${mName} ${hy}ھ`;
    }
    return `${hd} ${mName}, ${hy} AH`;
  } catch (e) {
    // Simple manual fallback model if Intl fails
    // May 23 2026 is approx 6th Dhul-Hijjah 1447 Hijri
    const sampleDate = new Date('2026-05-23T18:30:00Z');
    const MathMsInDay = 86400000;
    const diffDays = Math.round((date.getTime() - sampleDate.getTime()) / MathMsInDay);
    
    // Hijri year has ~354.36 days
    // Start approximate count on 6 Dhul-Hijjah 1447
    let totalHijriDays = 6 + diffDays;
    let hijriYear = 1447;
    let hijriMonthIdx = 11; // Dhul Hijjah (0-indexed is 11)
    
    // Simple month lengths (odd is 30, even is 29)
    const getMonthLength = (m: number) => (m % 2 === 0 ? 30 : 29);
    
    if (totalHijriDays > 0) {
      while (totalHijriDays > getMonthLength(hijriMonthIdx)) {
        totalHijriDays -= getMonthLength(hijriMonthIdx);
        hijriMonthIdx++;
        if (hijriMonthIdx > 11) {
          hijriMonthIdx = 0;
          hijriYear++;
        }
      }
    } else {
      while (totalHijriDays <= 0) {
        hijriMonthIdx--;
        if (hijriMonthIdx < 0) {
          hijriMonthIdx = 11;
          hijriYear--;
        }
        totalHijriDays += getMonthLength(hijriMonthIdx);
      }
    }

    const mName = hMonths[hijriMonthIdx];
    if (lang === 'ur' || lang === 'ar') {
      return `${totalHijriDays} ${mName} ${hijriYear}ھ`;
    }
    return `${totalHijriDays} ${mName}, ${hijriYear} AH`;
  }
}
