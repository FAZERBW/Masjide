/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLanguage } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { 
  Cpu, Database, GitBranch, Smartphone, Code, Heart, 
  MapPin, ShieldCheck, Mail, ExternalLink 
} from 'lucide-react';

interface AboutViewProps {
  lang: AppLanguage;
  mode: 'app' | 'developer' | 'all';
  isDark?: boolean;
}

export default function AboutView({ lang, mode, isDark = true }: AboutViewProps) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const appSpecs = [
    { label: lang === 'ur' ? 'ایپ کا نام' : lang === 'hi' ? 'ऐप का नाम' : lang === 'mr' ? 'अ‍ॅपचे नाव' : 'Application Name', value: TRANSLATIONS[lang]?.mosque_title ? `${TRANSLATIONS[lang]?.mosque_title} Hub` : 'Masjid E Quba Hub' },
    { label: lang === 'ur' ? 'ورژن' : lang === 'hi' ? 'संस्करण' : lang === 'mr' ? 'आवृत्ती' : 'Bundle Version', value: 'v1.0.1 (STABLE)' },
    { label: lang === 'ur' ? 'ٹارگٹ ماحول' : lang === 'hi' ? 'विकास लक्ष्य' : lang === 'mr' ? 'लक्ष्य वातावरण' : 'Environment Target', value: 'Production Clustered Container' },
    { label: lang === 'ur' ? 'بنیادی انجن' : lang === 'hi' ? 'मुख्य इंजन' : lang === 'mr' ? 'मुख्य इंजिन' : 'Primary Engine', value: 'PITD DEVELOPMENT KIT' },
    { label: lang === 'ur' ? 'ڈیٹا کی بنیاد' : lang === 'hi' ? 'डेटाबेस' : lang === 'mr' ? 'डेटाबेस' : 'Data Infrastructure', value: 'FM DB' },
    { label: lang === 'ur' ? 'سرور سروس' : lang === 'hi' ? 'सर्वर सेवा' : lang === 'mr' ? 'सर्व्हर सेवा' : 'Server Service', value: 'PITD SERVER' }
  ];

  const textDarkClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const textSlateClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const cardBgClass = isDark 
    ? 'bg-gradient-to-br from-emerald-900/50 via-slate-900/50 to-slate-950 border-white/[0.08]' 
    : 'bg-emerald-50/50 border-emerald-500/15 shadow-sm';
  const devCardBgClass = isDark
    ? 'bg-gradient-to-strong from-amber-950/25 via-slate-900/40 to-slate-950 border-white/[0.08]'
    : 'bg-amber-50/45 border-amber-500/20 shadow-sm';
  const tableBgClass = isDark ? 'bg-black/45 border-white/[0.04] divide-white/[0.03]' : 'bg-white border-slate-200 divide-slate-100 shadow-xs';
  const rowBtnBgClass = isDark ? 'bg-white/[0.02] border-white/[0.02]' : 'bg-slate-50 border-slate-150';

  const renderAppSpecs = () => (
    <div className="space-y-5 text-left font-sans animate-fadeIn">
      
      {/* iOS App Store style feature logo card */}
      <div className={`p-5 rounded-3xl border relative overflow-hidden flex gap-4 items-center select-none ${cardBgClass}`}>
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* App Icon Rounded Squircle Logo */}
        <div className="w-16 h-16 bg-gradient-to-br from-[#00ff88] to-emerald-700 p-0.5 rounded-[1.2rem] shadow-md flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-slate-950 rounded-[1rem] flex items-center justify-center text-[#00ff88] text-2xl font-black font-serif">
            M
          </div>
        </div>

        <div className="space-y-0.5 z-10 flex-1">
          <h3 className={`text-lg font-black tracking-tight leading-tight ${textDarkClass}`}>
            {TRANSLATIONS[lang]?.mosque_title ? `${TRANSLATIONS[lang]?.mosque_title} Hub` : 'Masjid E Quba Hub'}
          </h3>
          <p className="text-xs text-[#00ff88] font-bold font-mono tracking-widest uppercase">
            Product version 1.0.1
          </p>
          <p className={`text-[10px] font-semibold max-w-[200px] ${textMutedClass}`}>
            Designed for high performance mobile device interfaces.
          </p>
        </div>
      </div>

      {/* iOS Inset Grouped Specs Table */}
      <div className="space-y-1">
        <span className={`text-[10px] font-black uppercase tracking-wider block px-2.5 ${textSlateClass}`}>
          Software & System Specifications
        </span>
        <div className={`rounded-2xl border overflow-hidden divide-y select-none ${tableBgClass}`}>
          {appSpecs.map((spec, i) => (
            <div key={i} className="p-3 px-4 flex items-center justify-between gap-4 text-xs">
              <span className={`font-extrabold font-sans flex items-center gap-2 ${textMutedClass}`}>
                {spec.label === 'Primary Library' ? <Cpu className="w-3.5 h-3.5 text-slate-500" /> : 
                 spec.label === 'Remote Database' ? <Database className="w-3.5 h-3.5 text-slate-500" /> :
                 spec.label === 'Bundle Version' ? <GitBranch className="w-3.5 h-3.5 text-slate-500" /> :
                 <Smartphone className="w-3.5 h-3.5 text-slate-500" />}
                {spec.label}
              </span>
              <span className={`font-bold font-mono text-right px-2.5 py-1 rounded-lg border ${rowBtnBgClass} ${isDark ? 'text-slate-205' : 'text-slate-800'}`}>
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic status sync controller board representer */}
      <div className={`p-4 rounded-2xl border flex gap-3 items-start select-none ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/10">
          <ShieldCheck className="w-4.5 h-4.5" />
        </div>
        <div className="space-y-0.5 text-left">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Persistent Client Session Secure
          </span>
          <p className={`text-xs font-semibold leading-normal ${textMutedClass}`}>
            Local database registers write changes instantly. Synchronization processes with local storage servers are automated over robust connection pools.
          </p>
        </div>
      </div>

    </div>
  );

  const renderDevSpecs = () => (
    <div className="space-y-5 text-left font-sans animate-fadeIn">
      
      {/* iOS App Store Editor Spotlight Card */}
      <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col gap-4 select-none ${devCardBgClass}`}>
        <div className="absolute top-[-10%] left-[-10%] w-44 h-44 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest font-mono">
            Meet the Authors
          </span>
          <h3 className={`text-xl font-black tracking-tight flex items-center gap-2 ${textDarkClass}`}>
            <Code className="w-5 h-5 text-amber-500" /> Professional Presentation
          </h3>
        </div>

        <div className={`text-xs font-semibold leading-relaxed space-y-4 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">Developer</p>
            <p className={`text-sm font-black ${textDarkClass}`}>Developed By: Prince InfoTech Dhule</p>
            <p className="text-xs font-medium text-slate-500">Pathan Fardeen Khan Shakil Khan</p>
            <p className="text-xs font-mono mt-0.5 text-amber-550">princeit.dh@gmail.com | +91 8788273897</p>
          </div>

          <div className="border-t border-black/[0.05] dark:border-white/[0.05] pt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">Creative</p>
            <p className="text-xs font-bold text-slate-400">UI and design graphic by</p>
            <p className={`text-sm font-black ${textDarkClass}`}>FM GRAPHICS</p>
            <p className="text-xs text-emerald-500 font-mono">instahandle @fmgr.aphics</p>
          </div>
        </div>

        {/* Lead specs items list format */}
        <div className={`rounded-2xl border p-4 space-y-2.5 ${isDark ? 'bg-black/40 border-white/[0.04]' : 'bg-white border-slate-205 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <span className="p-1 rounded-md bg-white/[0.03] text-amber-500 border border-white/[0.03]">
              <Heart className="w-3.5 h-3.5" />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider leading-none">Craft Ethos</p>
              <p className={`text-xs font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>100% Client-Centric & Stable Experience</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="p-1 rounded-md bg-white/[0.03] text-amber-500 border border-white/[0.03]">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider leading-none">Global HQ</p>
              <p className={`text-xs font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Dhule, Maharashtra, India</p>
            </div>
          </div>
        </div>

        {/* iOS grouped row contact integrations */}
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 leading-none">Official Channels</p>
          <div className={`rounded-2xl border overflow-hidden divide-y ${tableBgClass}`}>
            <a 
              href="mailto:princeit.dh@gmail.com" 
              className="p-3 px-4 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors"
            >
              <span className={`font-extrabold flex items-center gap-2 ${textMutedClass}`}>
                <Mail className="w-3.5 h-3.5 text-slate-500" /> Send Email Query
              </span>
              <span className="font-bold text-amber-500 flex items-center gap-1 font-mono font-bold">
                Email Us <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      {mode === 'app' && renderAppSpecs()}
      {mode === 'developer' && renderDevSpecs()}
      {mode === 'all' && (
        <div className="space-y-10">
          {renderAppSpecs()}
          <hr className={isDark ? "border-white/[0.05]" : "border-slate-200"} />
          {renderDevSpecs()}
        </div>
      )}
    </div>
  );
}
