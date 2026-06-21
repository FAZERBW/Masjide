/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DEFAULT_PRAYERS } from '../data/prayers';
import { updateSyncedNumberFormats } from '../data/numberFormats';

interface SplashVerifierProps {
  onVerified: (data: {
    timings: any;
    announcements: any[];
    galleryImages: any[];
    fridayBayan?: any;
  }) => void;
}

export default function SplashVerifier({ onVerified }: SplashVerifierProps) {
  const [log, setLog] = useState('Connecting securely to Quba Cloud...');
  const databaseURL = 'https://masjid-e-quba-dhule-default-rtdb.asia-southeast1.firebasedatabase.app';

  useEffect(() => {
    runVerification();
  }, []);

  const runVerification = async () => {
    try {
      // 1. Fetch data from FM DB Cloud Server
      const response = await fetch(`${databaseURL}/.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const dbData = await response.json();
      setLog('Sync complete! Loading configurations...');

      if (dbData && dbData.numberFormats) {
        updateSyncedNumberFormats(dbData.numberFormats);
      }

      // Parse prayer timings from DB
      let parsedTimings = { ...DEFAULT_PRAYERS };
      if (dbData && dbData.prayers) {
        const iq = dbData.prayers.iqamah_times || {};
        
        const isEidEnabled = dbData.prayers.eid_enabled !== undefined 
          ? dbData.prayers.eid_enabled 
          : (iq.eid_enabled !== undefined ? iq.eid_enabled : DEFAULT_PRAYERS.eid_enabled);
          
        const isEidFitrEnabled = dbData.prayers.eid_fitr_enabled !== undefined 
          ? dbData.prayers.eid_fitr_enabled 
          : (iq.eid_fitr_enabled !== undefined ? iq.eid_fitr_enabled : (dbData.prayers.eid_enabled !== undefined ? dbData.prayers.eid_enabled : DEFAULT_PRAYERS.eid_fitr_enabled));
          
        const isEidAdhaEnabled = dbData.prayers.eid_adha_enabled !== undefined 
          ? dbData.prayers.eid_adha_enabled 
          : (iq.eid_adha_enabled !== undefined ? iq.eid_adha_enabled : (dbData.prayers.eid_enabled !== undefined ? dbData.prayers.eid_enabled : DEFAULT_PRAYERS.eid_adha_enabled));
          
        const eidulfitrTime = dbData.prayers.eidulfitr || iq.eidulfitr || DEFAULT_PRAYERS.eidulfitr;
        const eiduladhaTime = dbData.prayers.eiduladha || iq.eiduladha || DEFAULT_PRAYERS.eiduladha;

        parsedTimings = {
          ...DEFAULT_PRAYERS,
          fajr: {
            azan: iq.fajr?.azan || '05:00 AM',
            jamat: iq.fajr?.jamat || '05:15 AM',
            start: iq.fajr?.start || '04:45 AM',
            end: iq.fajr?.end || '06:00 AM'
          },
          zuhr: {
            azan: iq.duhr?.azan || iq.zuhr?.azan || '01:10 PM',
            jamat: iq.duhr?.jamat || iq.zuhr?.jamat || '01:30 PM',
            start: iq.duhr?.start || iq.zuhr?.start || '12:27 PM',
            end: iq.duhr?.end || iq.zuhr?.end || '05:10 PM'
          },
          asr: {
            azan: iq.asr?.azan || '05:10 PM',
            jamat: iq.asr?.jamat || '05:20 PM',
            start: iq.asr?.start || '05:10 PM',
            end: iq.asr?.end || '06:00 PM'
          },
          maghrib: {
            azan: iq.maghrib?.azan || '06:00 PM',
            jamat: iq.maghrib?.jamat || '06:00 PM',
            start: iq.maghrib?.start || '06:00 PM',
            end: iq.maghrib?.end || '08:15 PM'
          },
          isha: {
            azan: iq.isha?.azan || '08:00 PM',
            jamat: iq.isha?.jamat || '08:15 PM',
            start: iq.isha?.start || '08:00 PM',
            end: iq.isha?.end || '05:00 AM'
          },
          juma: {
            azan: iq.juma?.azan || '01:10 PM',
            jamat: iq.juma?.jamat || '01:30 PM'
          },
          sahr: iq.fajr?.start || dbData.prayers.sahr || '04:45 AM',
          iftar: iq.maghrib?.jamat || dbData.prayers.iftar || '06:00 PM',
          sunrise: dbData.prayers.sunrise || '05:55 AM',
          sunset: dbData.prayers.sunset || '07:12 PM',
          midday: dbData.prayers.midday || '12:27 PM',
          eid_enabled: isEidEnabled,
          eid_fitr_enabled: isEidFitrEnabled,
          eid_adha_enabled: isEidAdhaEnabled,
          eidulfitr: eidulfitrTime,
          eiduladha: eiduladhaTime
        };
      }

      // Parse Gallery and announcements
      const listAnnouncements: any[] = [];
      if (dbData && dbData.announcements && dbData.announcements.list) {
        Object.entries(dbData.announcements.list).forEach(([key, val]: any) => {
          listAnnouncements.push({
            id: val.id || key,
            title: val.title || 'Announcement',
            content: val.content || '',
            timestamp: val.timestamp || Date.now(),
            type: val.type || 'info',
            schedule_time: val.schedule_time,
            valid_from: val.valid_from,
            valid_till: val.valid_till,
            imageUrl: val.imageUrl || val.image_url,
            image: val.image || val.image_url
          });
        });
      }

      const listGallery: any[] = [];
      if (dbData && dbData.gallery && dbData.gallery.images) {
        Object.entries(dbData.gallery.images).forEach(([key, val]: any) => {
          listGallery.push({
            id: val.id || key,
            title: val.title || '',
            url: val.url || '',
            timestamp: val.timestamp || Date.now(),
            category: val.category || 'scenes'
          });
        });
      }

      // Parse Friday Bayan details if any
      let fridayBayan = null;
      if (dbData && dbData.prayers) {
        const rawBayan = dbData.prayers["friday Bayan"] || dbData.prayers.fridayBayan || dbData.prayers["friday_bayan"] || dbData.friday_bayan;
        if (rawBayan) {
          fridayBayan = {
            bayan: typeof rawBayan.bayan === 'boolean' ? rawBayan.bayan : (typeof rawBayan.enabled === 'boolean' ? rawBayan.enabled : true),
            by: rawBayan.by || rawBayan.speaker || ''
          };
        }
      }

      // Directly launch on success without any blockade checklist
      setTimeout(() => {
        onVerified({
          timings: parsedTimings,
          announcements: listAnnouncements.reverse(),
          galleryImages: listGallery,
          fridayBayan: fridayBayan
        });
      }, 300);

    } catch (e: any) {
      console.warn("Connection/parsing error, loading secure defaults", e);
      setLog('Connecting with secure default systems...');
      setTimeout(() => {
        onVerified({
          timings: DEFAULT_PRAYERS,
          announcements: [],
          galleryImages: []
        });
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 text-center font-sans space-y-6">
      <div className="w-28 h-28 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-[2rem] flex items-center justify-center relative shadow-2xl animate-pulse">
        <div className="absolute inset-1.5 bg-emerald-500/15 rounded-[1.7rem] blur-md" />
        <span className="text-5xl relative z-10 select-none">🕌</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase">MASJID E QUBA</h1>
        <p className="text-xs font-bold tracking-widest text-emerald-450 uppercase">Dhule, Maharashtra</p>
      </div>

      <div className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 shadow-lg">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <div className="text-[11px] font-mono text-slate-400 text-center truncate w-full">
          {log}
        </div>
      </div>
      
      <p className="text-slate-600 font-mono text-[9px] uppercase tracking-wider">Prince InfoTech & FM Graphics Partner</p>
    </div>
  );
}
