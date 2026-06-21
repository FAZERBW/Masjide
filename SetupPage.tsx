/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AppTheme, AppLanguage, AppPreferences } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Check, Languages } from 'lucide-react';

interface SetupPageProps {
  onSetupComplete: (prefs: AppPreferences) => void;
}

export default function SetupPage({ onSetupComplete }: SetupPageProps) {
  const [lang, setLang] = useState<AppLanguage>('ur');
  const [theme, setTheme] = useState<AppTheme>('emerald-dark');

  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const languages: Array<{ code: AppLanguage; label: string }> = [
    { code: 'ur', label: 'اردو (Urdu)' },
    { code: 'ar', label: 'العربية (Arabic)' },
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'mr', label: 'मराठी (Marathi)' }
  ];

  const handleFinish = () => {
    onSetupComplete({
      language: lang,
      uiStyle: 'simple',
      theme: theme,
      firstTimeSetup: false
    });
  };

  const isRtl = lang === 'ur' || lang === 'ar';

  return (
    <div className="min-h-screen bg-[#060a07] text-[#ecf3ee] flex flex-col items-center justify-center p-4 md:p-8 text-center font-sans relative overflow-hidden">
      
      {/* Immersive ambient colored orbs floating in background */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[280px] h-[280px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-xl w-full bg-[#0d1310]/95 border-2 border-[#1b2620] rounded-[2.5rem] p-6 md:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative space-y-8 backdrop-blur-md">
        
        {/* Banner with Animated Glowing Aura */}
        <div className="space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-ping" />
            <div className="relative w-24 h-24 bg-gradient-to-tr from-emerald-600 to-teal-600 border border-emerald-400/30 rounded-full flex items-center justify-center text-4xl shadow-inner animate-bounce duration-1000">
              🕌
            </div>
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent uppercase tracking-tight font-serif">
              MASJID E QUBA
            </h1>
            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
              {dict.setup_title || 'Smart Hub Configuration'}
            </p>
            <p className="text-sm text-slate-405 max-w-sm mx-auto leading-relaxed font-semibold">
              {dict.setup_sub || 'Customize your beautiful local spiritual helper in Dhule, Maharashtra'}
            </p>
          </div>
        </div>

        {/* Feature Highlights Card with Larger text & clear items */}
        <div className="bg-[#060a07]/60 border-2 border-[#1b2620] rounded-2xl p-5 text-left space-y-3">
          <h4 className="text-[10px] font-black text-[#52d69f] tracking-widest uppercase flex items-center gap-1">
            <span>✨</span> System Innovations Loaded
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-350 font-bold leading-relaxed">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Separate Eid Toggles
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Real-time Live Broadcasts
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> High-contrast Hero Bar
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Large Elderly-Friendly Fonts
            </li>
          </ul>
        </div>

        {/* 1. Language Sector */}
        <div className="space-y-3 text-left">
          <label className="text-[11px] font-black tracking-widest text-[#7c9081] uppercase flex items-center gap-2">
            <Languages className="w-4 h-4 text-emerald-400 animate-pulse" /> {dict.select_language || 'Select System Language'}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`py-3 px-4 rounded-xl text-xs font-black transition-all border flex items-center justify-between hover:scale-[1.01] active:scale-99 ${
                  lang === l.code
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-[#060a07]/40 border-[#1b2620] hover:border-emerald-950 text-slate-400'
                }`}
              >
                <span>{l.label}</span>
                {lang === l.code && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Finish button */}
        <div className="pt-6 border-t border-slate-800/85 space-y-4">
          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-650 text-white text-xs font-bold uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
          >
            <span>{dict.proceed || 'Proceed and Enter'}</span>
            <span className={`${isRtl ? 'rotate-180' : ''}`}>➔</span>
          </button>

          {/* Humble Creative Team credit at bottom */}
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest leading-relaxed pt-2 border-t border-slate-900">
            Crafted by <span className="text-slate-400 font-bold">PRINCE INFOTECH DHULE</span> • UI Graphics by <span className="text-slate-400 font-bold">FM GRAPHICS</span>
          </div>
        </div>

      </div>
    </div>
  );
}
