/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, X, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { setupFCMTokenHandshake } from '../lib/firebase';

interface NotificationPermissionBannerProps {
  lang: 'en' | 'ur' | 'hi' | 'mr' | 'ar';
}

export default function NotificationPermissionBanner({ lang }: NotificationPermissionBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');

  useEffect(() => {
    // 1. Check if notifications are supported by browser
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    const currentPermission = Notification.permission;
    
    if (currentPermission === 'granted') {
      setStatus('granted');
      // Already granted, execute silent handshake in the background on load
      performHandshake();
    } else if (currentPermission === 'denied') {
      setStatus('denied');
    } else {
      // Permission is 'default' (not yet prompted).
      // Trigger the intuitive dark-themed UI banner overlay after a tiny load delay (600ms)
      const t = setTimeout(() => {
        setShowBanner(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const performHandshake = async () => {
    setSyncState('syncing');
    try {
      const token = await setupFCMTokenHandshake();
      if (token) {
        setSyncState('completed');
      } else {
        setSyncState('error');
      }
    } catch (e) {
      console.error("[Banner Handshake Error] ", e);
      setSyncState('error');
    }
  };

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    try {
      setSyncState('syncing');
      // Call standard native browser permission prompt
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setStatus('granted');
        await performHandshake();
        // Keep completion visible for 2 seconds before closing
        setTimeout(() => {
          setShowBanner(false);
        }, 2200);
      } else if (permission === 'denied') {
        setStatus('denied');
        setSyncState('idle');
        setShowBanner(false);
      } else {
        setSyncState('idle');
      }
    } catch (e) {
      console.error("[Permission Request Error]", e);
      setSyncState('error');
    }
  };

  // Human translations for localized prompt messaging
  const labels = {
    title: {
      en: "Live Azan & Notice Alerts",
      ur: "لائیو اذان اور اہم اعلانات",
      hi: "लाइव अज़ान और सूचना अलर्ट",
      mr: "थेट अझान आणि सूचना",
      ar: "تنبيهات الأذان والإعلانات الحية"
    },
    subtitle: {
      en: "Receive automatic top tray alerts for congregation safety, lecture schedules, and time changes directly under Hanafi guidance.",
      ur: "نماز کے اوقات میں تبدیلی اور اہم دینی مجالس کی فوری اطلاعات براہ راست موبائل پینल پر حاصل کریں۔",
      hi: "जमाअत के समय में बदलाव और विशेष व्याख्यानों के बारे में तुरंत सूचनाएं प्राप्त करें।",
      mr: "जमात वेळ बदल आणि विशेष घोषणांचे थेट अलर्ट थेट तुमच्या मोबाइलवर मिळवा.",
      ar: "احصل على تنبيهات فورية لتغير أوقات الصلاة والدروس والمجالس الدينية في المسجد."
    },
    btnEnable: {
      en: "Enable Push Notifications",
      ur: "پش نوٹیفکیشن فعال کریں",
      hi: "पुश नोटिफिकेशन चालू करें",
      mr: "सूचना सुरू करा",
      ar: "تفعيل التنبيهات الفورية"
    },
    btnLater: {
      en: "Later",
      ur: "بعد میں",
      hi: "बाद में",
      mr: "नंतर",
      ar: "لاحقاً"
    },
    statusSyncing: {
      en: "Connecting Secure Node...",
      ur: "محفوظ رابطہ قائم ہو رہا ہے...",
      hi: "सुरक्षित कनेक्शन स्थापित हो रहा है...",
      mr: "कनेक्शन जोडत आहे...",
      ar: "جاري تأمين الاتصال..."
    },
    statusCompleted: {
      en: "FCM Handshake Synced ✔",
      ur: "اطلاعات کامیابی سے مربوط ہوگئیں ✔",
      hi: "सफलतापूर्वक सिंक किया गया ✔",
      mr: "यशस्वीरित्या कनेक्ट झाले ✔",
      ar: "تم مزامنة الجهاز بنجاح ✔"
    }
  };

  const getLabel = (key: keyof typeof labels) => {
    return labels[key][lang] || labels[key]['en'];
  };

  const isRtl = lang === 'ur' || lang === 'ar';

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="fixed bottom-[80px] left-0 right-0 z-[999] px-4 max-w-md mx-auto pointer-events-none select-none"
        >
          <div className="w-full rounded-2xl p-5 border border-[#00ff88]/20 bg-slate-950/95 backdrop-blur-2xl shadow-2xl relative overflow-hidden pointer-events-auto">
            {/* Ambient emerald radial light representing safety and beauty */}
            <div className="absolute right-0 top-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-[#00ff88]/10 blur-2xl pointer-events-none" />

            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-3 right-3 p-1 rounded-full text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>

            <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div className="p-3 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] mt-0.5">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>

              <div className="flex-1 space-y-1">
                <div className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight font-sans">
                    {getLabel('title')}
                  </h4>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-medium">
                  {getLabel('subtitle')}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between gap-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                SECURE FCM HANDSHAKE
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBanner(false)}
                  className="px-3 py-1.5 text-xs text-slate-405 font-bold hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {getLabel('btnLater')}
                </button>
                
                <button
                  disabled={syncState === 'syncing' || syncState === 'completed'}
                  onClick={handleRequestPermission}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                    syncState === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : syncState === 'syncing'
                      ? 'bg-slate-900 text-slate-400 border border-white/10 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                  }`}
                >
                  {syncState === 'syncing' && getLabel('statusSyncing')}
                  {syncState === 'completed' && (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {getLabel('statusCompleted')}
                    </>
                  )}
                  {syncState !== 'syncing' && syncState !== 'completed' && (
                    <>
                      {getLabel('btnEnable')}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
