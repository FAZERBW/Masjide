/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { AppTheme, AppLanguage, ActiveTab, PrayerTimings, AppPreferences } from './types';
import { TRANSLATIONS } from './data/translations';
import { DEFAULT_PRAYERS, timeStringToMinutes, calculateCurrentAndNext, getApproxHijriDate } from './data/prayers';
import { THEME_COLORS } from './data/themes';
import { updateSyncedNumberFormats } from './data/numberFormats';
import { motion, AnimatePresence } from 'motion/react';

import SplashVerifier from './components/SplashVerifier';
import SetupPage from './components/SetupPage';
import SimpleLayout from './components/SimpleLayout';
import GalleryView from './components/GalleryView';
import QueryModal from './components/QueryModal';
import AboutView from './components/AboutView';
import NotificationsView from './components/NotificationsView';
import NotificationPermissionBanner from './components/NotificationPermissionBanner';
import ThemeTransitionOverlay from './components/ThemeTransitionOverlay';
import { subscribeToAnnouncements, setupForegroundMessageListener } from './lib/firebase';

import { Home, Image as ImageIcon, BookOpen, HelpCircle, Info, Settings, Palette, Languages, Moon, Sun, Code, Smartphone, X, Bell, ChevronRight, ChevronLeft, Activity } from 'lucide-react';

const DEFAULT_FRIDAY_BAYAN = {
  bayan: true,
  by: "MUFTI QUASIM SAHAB DB"
};

export default function App() {
  const [stages, setStages] = useState<'verification' | 'setup' | 'main'>('verification');
  
  // Real-time fetched data states
  const [timings, setTimings] = useState<PrayerTimings>(DEFAULT_PRAYERS);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>([]);
  const [fridayBayan, setFridayBayan] = useState<any>(null);
  const [appConfig, setAppConfig] = useState({
    appName: "Masjid E Quba",
    defaultLanguage: "ur" as AppLanguage,
    supportedLanguages: ['en', 'hi', 'mr', 'ur', 'ar'] as AppLanguage[]
  });

  // User preference states
  const [prefs, setPrefs] = useState<AppPreferences>({
    uiStyle: 'simple',
    language: 'ur',
    theme: 'emerald-dark',
    firstTimeSetup: true
  });

  const [showThemePopup, setShowThemePopup] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [settingsSubView, setSettingsSubView] = useState<'main' | 'about-app' | 'about-developer'>('main');

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const showSettingsDrawerRef = useRef(showSettingsDrawer);
  showSettingsDrawerRef.current = showSettingsDrawer;

  // Reset settingsSubView whenever drawer is closed
  useEffect(() => {
    if (!showSettingsDrawer) {
      setSettingsSubView('main');
    }
  }, [showSettingsDrawer]);

  // Synchronize document body class for light/dark theme to fully eliminate flashes
  useEffect(() => {
    const isThemeDark = prefs.theme.endsWith('dark');
    if (isThemeDark) {
      document.body.classList.remove('light-mode-body');
    } else {
      document.body.classList.add('light-mode-body');
    }
  }, [prefs.theme]);

  // Sync ActiveTab with browser state
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 1. Handle closing settings drawer on back press
      if (showSettingsDrawerRef.current) {
        setShowSettingsDrawer(false);
      }
      
      // 2. Adjust activeTab
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else if (event.state && event.state.drawer === 'settings') {
        setShowSettingsDrawer(true);
        setActiveTab('home');
      } else {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Force home to be the default page on clean initial loading
    setActiveTab('home');
    setShowSettingsDrawer(false);
    if (window.location.hash && window.location.hash !== '' && window.location.hash !== '#/home' && window.location.hash !== '#') {
      try {
        window.history.replaceState({ tab: 'home' }, '', '#/home');
      } catch (e) {
        window.location.hash = '#/home';
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSubPage = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.history.pushState({ tab }, '', `#/${tab}`);
  };

  const closeSubPage = () => {
    if (activeTab !== 'home') {
      window.history.back();
    } else {
      setActiveTab('home');
    }
  };

  const openSettings = () => {
    setShowSettingsDrawer(true);
    window.history.pushState({ drawer: 'settings' }, '', '#/settings');
  };

  const closeSettings = () => {
    if (showSettingsDrawer) {
      window.history.back();
    } else {
      setShowSettingsDrawer(false);
    }
  };
  
  // Clock state variables
  const [time, setTime] = useState(new Date());
  const [countdownStr, setCountdownStr] = useState('--:--:--');
  const [isFriday, setIsFriday] = useState(false);
  const [currId, setCurrId] = useState<'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'juma'>('fajr');
  const [nextId, setNextId] = useState<'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'juma'>('zuhr');

  // Load preferences on startup
  useEffect(() => {
    const rawLang = (localStorage.getItem('mq_lang') || appConfig.defaultLanguage) as AppLanguage;
    const rawTheme = localStorage.getItem('mq_theme') as AppTheme;
    const rawSetup = localStorage.getItem('mq_setup');

    if (rawLang && rawTheme) {
      setPrefs({
        uiStyle: 'simple',
        language: rawLang,
        theme: rawTheme,
        firstTimeSetup: rawSetup === 'true'
      });
    } else if (rawLang) {
      setPrefs(p => ({ ...p, language: rawLang }));
    }

    try {
      const savedRead = localStorage.getItem('mq_read_announcements');
      if (savedRead) {
        setReadAnnouncementIds(JSON.parse(savedRead));
      }
    } catch (e) {
      console.warn("Could not read mq_read_announcements from storage:", e);
    }
  }, []);

  const handleReadNotification = (id: string) => {
    setReadAnnouncementIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('mq_read_announcements', JSON.stringify(next));
      return next;
    });
  };

  const unreadAnnouncementsCount = announcements.filter(a => !readAnnouncementIds.includes(a.id)).length;

  // Set Juma checker based on day of week
  useEffect(() => {
    setIsFriday(time.getDay() === 5);
  }, [time]);

  // Master Clock & Calculation Tick Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);

      const nowMin = now.getHours() * 60 + now.getMinutes();
      const { currentId, nextId: upcomingId } = calculateCurrentAndNext(timings, nowMin, now.getDay() === 5);
      
      setCurrId(currentId);
      setNextId(upcomingId);

      // Countdown generator to upcoming prayer's start time
      let nextTimeStr = timings[upcomingId]?.start || timings[upcomingId]?.jamat || '12:00 AM';
      if (upcomingId === 'juma' && !timings.juma?.start) {
        nextTimeStr = timings.zuhr?.start || timings.zuhr?.jamat || '12:00 AM';
      }
      const targetMin = timeStringToMinutes(nextTimeStr);
      let diffMin = targetMin - nowMin;
      if (diffMin < 0) {
        diffMin += 1440; // wrap around 24 hours
      }

      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      const s = 59 - now.getSeconds();

      setCountdownStr(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );

    }, 1000);

    return () => clearInterval(interval);
  }, [timings]);

  // Background Database polling effect (runs when the app is active in main mode)
  useEffect(() => {
    if (stages !== 'main') return;

    const databaseURL = 'https://masjid-e-quba-dhule-default-rtdb.asia-southeast1.firebasedatabase.app';
    let isFetching = false;
    let timeoutId: any = null;

    const fetchLatestUpdates = async () => {
      // Guard against concurrent overlapping fetches
      if (isFetching) return;
      isFetching = true;

      try {
        const response = await fetch(`${databaseURL}/.json`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        });

        if (!response.ok) {
          isFetching = false;
          return;
        }

        const dbData = await response.json();
        isFetching = false;

        if (!dbData) return;

        // Custom defer execution helper to process data on idle time and keep UI interactions butter-smooth
        const deferProcess = (fn: () => void, delayMs = 16) => {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(fn, { timeout: 2000 });
          } else {
            setTimeout(fn, delayMs);
          }
        };

        // Stagger stage 1: update synced text settings and primary timings block
        deferProcess(() => {
          if (dbData.appConfig) {
            const config = dbData.appConfig;
            let supportedLanguages = ['en', 'hi', 'mr', 'ur', 'ar'];
            
            if (config.supportedLanguages) {
              if (Array.isArray(config.supportedLanguages)) {
                supportedLanguages = config.supportedLanguages;
              } else if (typeof config.supportedLanguages === 'object') {
                supportedLanguages = Object.values(config.supportedLanguages);
              }
            }

            setAppConfig({
              appName: "Masjid E Quba",
              defaultLanguage: config.defaultLanguage || "ur",
              supportedLanguages: supportedLanguages as AppLanguage[]
            });
          }

          if (dbData.numberFormats) {
            updateSyncedNumberFormats(dbData.numberFormats);
          }

          // 1. Process Prayer Timings
          if (dbData.prayers) {
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

            const parsedTimings = {
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
                jamat: iq.maghrib?.jamat || '06:05 PM',
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
              iftar: iq.maghrib?.jamat || dbData.prayers.iftar || '06:05 PM',
              sunrise: dbData.prayers.sunrise || '05:55 AM',
              sunset: dbData.prayers.sunset || '07:12 PM',
              midday: dbData.prayers.midday || '12:27 PM',
              eid_enabled: isEidEnabled,
              eid_fitr_enabled: isEidFitrEnabled,
              eid_adha_enabled: isEidAdhaEnabled,
              eidulfitr: eidulfitrTime,
              eiduladha: eiduladhaTime
            };

            setTimings(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(parsedTimings)) {
                return parsedTimings;
              }
              return prev;
            });
          }
        }, 16);

        // Stagger stage 2: update gallery files and friday sermons on separate frame loop to avoid concurrent state update lag
        deferProcess(() => {
          // 3. Process Gallery Images
          if (dbData.gallery && dbData.gallery.images) {
            const listGallery: any[] = [];
            Object.entries(dbData.gallery.images).forEach(([key, val]: any) => {
              listGallery.push({
                id: val.id || key,
                title: val.title || '',
                url: val.url || '',
                timestamp: val.timestamp || Date.now(),
                category: val.category || 'scenes'
              });
            });
            setGalleryImages(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(listGallery)) {
                return listGallery;
              }
              return prev;
            });
          }

          // 4. Process Friday Bayan
          if (dbData.prayers) {
            const rawBayan = dbData.prayers["friday Bayan"] || dbData.prayers.fridayBayan || dbData.prayers["friday_bayan"] || dbData.friday_bayan;
            if (rawBayan) {
              setFridayBayan({
                bayan: typeof rawBayan.bayan === 'boolean' ? rawBayan.bayan : (typeof rawBayan.enabled === 'boolean' ? rawBayan.enabled : true),
                by: rawBayan.by || rawBayan.speaker || ''
              });
            }
          }
        }, 120);

      } catch (e) {
        console.warn("Background auto-refresh failed:", e);
        isFetching = false;
      }
    };

    // Safe visibility aware scheduler
    const scheduleNextPoll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        // Only run fetch if page is currently visible to user
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchLatestUpdates().then(scheduleNextPoll);
        } else {
          // If app is closed/hidden, sleep and check again in a minute with no CPU cost
          timeoutId = setTimeout(scheduleNextPoll, 60000);
        }
      }, 300000); // Polling interval (5 minutes)
    };

    // Immediate update when recovering tab focus (e.g. unlocks screen, switches back to browser tab)
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLatestUpdates();
        scheduleNextPoll();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Start polling cycle
    scheduleNextPoll();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [stages]);

  // Real-time Announcements & FCM foreground listeners via Firebase Realtime Database
  useEffect(() => {
    if (stages !== 'main') return;

    // Subscribe to announcements on Firebase real-time node `/announcements/list/`
    const unsubscribe = subscribeToAnnouncements((updatedAnnouncements) => {
      setAnnouncements(updatedAnnouncements);
    });

    // Handle optional foreground notifications as a premium helper
    const unsubscribeForeground = setupForegroundMessageListener((payload) => {
      console.log("[FCM Foreground Broadcast received]", payload);
    });

    return () => {
      unsubscribe();
      unsubscribeForeground();
    };
  }, [stages]);

  // Handle successful verification callback
  const handleVerificationSuccess = (data: {
    timings: any;
    announcements: any[];
    galleryImages: any[];
    fridayBayan?: any;
  }) => {
    setTimings(data.timings);
    setAnnouncements(data.announcements);
    setGalleryImages(data.galleryImages);
    if (data.fridayBayan) {
      setFridayBayan(data.fridayBayan);
    }

    const hasConfig = localStorage.getItem('mq_setup') === 'false';
    if (hasConfig) {
      setStages('main');
    } else {
      setStages('setup');
    }
  };

  // Handle setup form completions
  const handlePreferencesComplete = (updatedPrefs: AppPreferences) => {
    localStorage.setItem('mq_style', 'simple');
    localStorage.setItem('mq_lang', updatedPrefs.language);
    localStorage.setItem('mq_theme', updatedPrefs.theme);
    localStorage.setItem('mq_setup', 'false');

    setPrefs({
      uiStyle: 'simple',
      language: updatedPrefs.language,
      theme: updatedPrefs.theme,
      firstTimeSetup: false
    });
    setStages('main');
  };

  const updateLang = (lang: AppLanguage) => {
    // Validate if the language is supported
    const isSupported = appConfig.supportedLanguages.includes(lang);
    const finalLang = isSupported ? lang : appConfig.defaultLanguage;
    localStorage.setItem('mq_lang', finalLang);
    setPrefs(p => ({ ...p, language: finalLang }));
  };

  const [themeOrigin, setThemeOrigin] = useState({ x: 0, y: 0 });

  const updateTheme = (theme: AppTheme, event?: React.MouseEvent) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setThemeOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    localStorage.setItem('mq_theme', theme);
    setPrefs(p => ({ ...p, theme: theme }));
  };

  const cycleLanguage = () => {
    const lgList: AppLanguage[] = appConfig.supportedLanguages;
    const idx = lgList.indexOf(prefs.language);
    // Find next valid language if current is no longer supported (idx === -1)
    const nextIdx = idx === -1 ? 0 : (idx + 1) % lgList.length;
    updateLang(lgList[nextIdx]);
  };

  const dict = TRANSLATIONS[prefs.language] || TRANSLATIONS.en;
  const col = THEME_COLORS[prefs.theme] || THEME_COLORS['emerald-dark'];

  const bayanInfo = fridayBayan || DEFAULT_FRIDAY_BAYAN;
  const isBayanEnabled = !!bayanInfo && bayanInfo.bayan !== false && !!bayanInfo.by;
  const activeSpeaker = (bayanInfo && bayanInfo.by) || "MUFTI QUASIM SAHAB DB";

  if (stages === 'verification') {
    return <SplashVerifier onVerified={handleVerificationSuccess} />;
  }

  if (stages === 'setup') {
    return <SetupPage onSetupComplete={handlePreferencesComplete} />;
  }

  const daysListEn = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const daysListUr = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
  const daysListHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const daysListMr = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const daysListAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  let activeDayName = daysListEn[time.getDay()];
  if (prefs.language === 'ur') activeDayName = daysListUr[time.getDay()];
  else if (prefs.language === 'hi') activeDayName = daysListHi[time.getDay()];
  else if (prefs.language === 'mr') activeDayName = daysListMr[time.getDay()];
  else if (prefs.language === 'ar') activeDayName = daysListAr[time.getDay()];

  const monthsList = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const currentEngDate = `${time.getDate()} ${monthsList[time.getMonth()]} ${time.getFullYear()}`;

  const isRtl = prefs.language === 'ur' || prefs.language === 'ar';

  const getsVgColorClass = (theme: string) => {
    if (theme.startsWith('emerald')) return 'text-emerald-500';
    if (theme.startsWith('gold') || theme.startsWith('amethyst') || theme.startsWith('violet') || theme.startsWith('amber')) return 'text-amber-500';
    if (theme.startsWith('sky')) return 'text-sky-500';
    if (theme.startsWith('rose') || theme.startsWith('crimson') || theme.startsWith('coral')) return 'text-rose-550';
    if (theme.startsWith('teal')) return 'text-teal-500';
    if (theme.startsWith('indigo')) return 'text-indigo-500';
    if (theme.startsWith('slate')) return 'text-slate-500';
    return 'text-amber-500';
  };

  const getActiveNavClass = (theme: string) => {
    if (theme.startsWith('emerald')) return 'bg-emerald-600 shadow-emerald-500/30';
    if (theme.startsWith('gold')) return 'bg-amber-600 shadow-amber-500/30';
    if (theme.startsWith('sky')) return 'bg-sky-600 shadow-sky-500/30';
    if (theme.startsWith('rose')) return 'bg-rose-600 shadow-rose-500/30';
    if (theme.startsWith('teal')) return 'bg-teal-600 shadow-teal-500/30';
    if (theme.startsWith('indigo')) return 'bg-indigo-600 shadow-indigo-500/30';
    if (theme.startsWith('violet')) return 'bg-violet-600 shadow-violet-500/30';
    if (theme.startsWith('amethyst')) return 'bg-fuchsia-600 shadow-fuchsia-500/30';
    if (theme.startsWith('amber')) return 'bg-amber-500 shadow-amber-500/30';
    if (theme.startsWith('crimson')) return 'bg-red-600 shadow-red-500/30';
    if (theme.startsWith('coral')) return 'bg-rose-500 shadow-rose-450/30';
    if (theme.startsWith('slate')) return 'bg-slate-600 shadow-slate-500/30';
    return 'bg-emerald-600 shadow-emerald-500/30';
  };

  // Helper to retrieve translated labels for the 5 nav buttons
  const getNavLabel = (key: string, lang: AppLanguage) => {
    const labels: Record<string, Record<AppLanguage, string>> = {
      home: { ur: 'ہوم', ar: 'الرئيسية', en: 'Home', hi: 'होम', mr: 'होम' },
      gallery: { ur: 'گیلری', ar: 'المعرض', en: 'Gallery', hi: 'गैलरी', mr: 'गॅलरी' },
      ask: { ur: 'سوال', ar: 'اسأل', en: 'Ask', hi: 'सवाल', mr: 'प्रश्न' },
      notification: { ur: 'اعلانات', ar: 'الإعلانات', en: 'Notices', hi: 'सूचनाएं', mr: 'सूचना' },
      settings: { ur: 'ترجیحات', ar: 'الإعدادات', en: 'Settings', hi: 'सेटिंग्स', mr: 'सेटिंग्ज' }
    };
    return labels[key]?.[lang] || labels[key]?.en || '';
  };

  const isDark = prefs.theme.endsWith('dark');

  const currentShade = prefs.theme.split('-')[0] || 'emerald';
  const currentMode = prefs.theme.split('-')[1] || 'dark';

  const shadesList = [
    'emerald', 'gold', 'sky', 'rose', 'teal', 'indigo', 
    'violet', 'amethyst', 'amber', 'crimson', 'coral', 'slate'
  ];

  const inlineNavigationBar = (
    <div className={`p-2 rounded-[2.3rem] ${
      isDark 
        ? 'bg-slate-950/85 border-slate-800/60 backdrop-blur-3xl shadow-2xl shadow-black/80' 
        : 'bg-white/95 border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)]'
    } border grid grid-cols-5 gap-1`}>
      
      {/* 1. Home Button */}
      <button
        type="button"
        onClick={() => {
          setActiveTab('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`p-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.9] cursor-pointer ${
          activeTab === 'home' ? 'scale-[1.03]' : 'opacity-70 hover:opacity-100'
        }`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
          activeTab === 'home'
            ? `bg-${col.accent}/15 text-${col.accent} border border-${col.accent}/25 shadow-md`
            : isDark ? 'bg-white/[0.02] text-slate-400 border border-transparent' : 'bg-slate-100 text-slate-500 border border-transparent'
        }`}>
          <Home className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[8px] font-black tracking-tight uppercase leading-none ${
          activeTab === 'home' ? `text-${col.accent} font-black` : 'text-slate-550'
        }`}>
          {getNavLabel('home', prefs.language)}
        </span>
      </button>

      {/* 2. Gallery Button */}
      <button
        type="button"
        onClick={() => openSubPage('gallery')}
        className={`p-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.9] cursor-pointer ${
          activeTab === 'gallery' ? 'scale-[1.03]' : 'opacity-70 hover:opacity-100'
        }`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
          activeTab === 'gallery'
            ? `bg-${col.accent}/15 text-${col.accent} border border-${col.accent}/25 shadow-md`
            : isDark ? 'bg-white/[0.02] text-slate-400 border border-transparent' : 'bg-slate-100 text-slate-500 border border-transparent'
        }`}>
          <ImageIcon className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[8px] font-black tracking-tight uppercase leading-none ${
          activeTab === 'gallery' ? `text-${col.accent} font-black` : 'text-slate-550'
        }`}>
          {getNavLabel('gallery', prefs.language)}
        </span>
      </button>

      {/* 3. Notification Button */}
      <button
        type="button"
        onClick={() => openSubPage('notifications')}
        className={`p-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.9] cursor-pointer ${
          activeTab === 'notifications' ? 'scale-[1.03]' : 'opacity-70 hover:opacity-100'
        }`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all relative ${
          activeTab === 'notifications'
            ? `bg-${col.accent}/15 text-${col.accent} border border-${col.accent}/25 shadow-md`
            : isDark ? 'bg-white/[0.02] text-slate-400 border border-transparent' : 'bg-slate-100 text-slate-500 border border-transparent'
        }`}>
          <Bell className="w-4.5 h-4.5" />
          {unreadAnnouncementsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2 z-20">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
          )}
        </div>
        <span className={`text-[8px] font-black tracking-tight uppercase leading-none ${
          activeTab === 'notifications' ? `text-${col.accent} font-black` : 'text-slate-550'
        }`}>
          {getNavLabel('notification', prefs.language)}
        </span>
      </button>

      {/* 4. Ask (Query) Button */}
      <button
        type="button"
        onClick={() => openSubPage('query')}
        className={`p-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.9] cursor-pointer ${
          activeTab === 'query' ? 'scale-[1.03]' : 'opacity-70 hover:opacity-100'
        }`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
          activeTab === 'query'
            ? `bg-${col.accent}/15 text-${col.accent} border border-${col.accent}/25 shadow-md`
            : isDark ? 'bg-white/[0.02] text-slate-400 border border-transparent' : 'bg-slate-100 text-slate-500 border border-transparent'
        }`}>
          <HelpCircle className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[8px] font-black tracking-tight uppercase leading-none ${
          activeTab === 'query' ? `text-${col.accent} font-black` : 'text-slate-550'
        }`}>
          {getNavLabel('ask', prefs.language)}
        </span>
      </button>

      {/* 5. Settings Button */}
      <button
        type="button"
        onClick={() => openSettings()}
        className={`p-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.9] cursor-pointer ${
          showSettingsDrawer ? 'scale-[1.03]' : 'opacity-70 hover:opacity-100'
        }`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
          showSettingsDrawer
            ? `bg-${col.accent}/15 text-${col.accent} border border-${col.accent}/25 shadow-md`
            : isDark ? 'bg-white/[0.02] text-slate-400 border border-transparent' : 'bg-slate-100 text-slate-500 border border-transparent'
        }`}>
          <Settings className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[8px] font-black tracking-tight uppercase leading-none ${
          showSettingsDrawer ? `text-${col.accent} font-black` : 'text-slate-550'
        }`}>
          {getNavLabel('settings', prefs.language)}
        </span>
      </button>

    </div>
  );

  return (
    <div className={`min-h-screen ${col.bg} transition-all duration-500 pb-32 select-none overflow-x-hidden font-sans relative`}>
      
      {/* Gorgeous Premium Hanging Islamic Lanterns (Fanoos) & Glowing Starlight backdrop */}
      {isDark && (
        <div className="absolute top-0 left-0 right-0 h-[240px] pointer-events-none z-0 overflow-hidden select-none opacity-40 dark:opacity-75">
          <svg width="100%" height="100%" className="w-full h-full max-w-xl mx-auto overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="lantern-gold-glow" cx="50%" cy="50%" r="40%">
                <stop offset="0%" stopColor="#fada5e" stopOpacity="0.8"/>
                <stop offset="40%" stopColor="#f2b93b" stopOpacity="0.45"/>
                <stop offset="100%" stopColor="#ff8c00" stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* Glowing halos */}
            <circle cx="18%" cy="95" r="28" fill="url(#lantern-gold-glow)" />
            <circle cx="50%" cy="65" r="32" fill="url(#lantern-gold-glow)" />
            <circle cx="82%" cy="115" r="28" fill="url(#lantern-gold-glow)" />

            {/* Subtle soft background dust stars */}
            <circle cx="33%" cy="40" r="1" fill="#fada5e" opacity="0.6"/>
            <circle cx="65%" cy="80" r="1.5" fill="#ffffff" opacity="0.4"/>
            <circle cx="10%" cy="130" r="1" fill="#fada5e" opacity="0.5"/>
            <circle cx="90%" cy="50" r="1.2" fill="#ffffff" opacity="0.6"/>
            <circle cx="75%" cy="30" r="1" fill="#fada5e" opacity="0.3"/>

            {/* Hanging Cord Line 1 --- Left side (hanging low) */}
            <line x1="18%" y1="0" x2="18%" y2="70" stroke="#f2b93b" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
            
            {/* Detailed Lantern Group 1 (Left) */}
            <g transform="translate(0, 72)" stroke="#fada5e" strokeWidth="1" fill="none" opacity="0.85">
              {/* dome caps */}
              <path d="M 18%, 0 C 15%,-4 13%,-10 18%,-14 C 23%,-10 21%,-4 18%,0 Z" stroke="#f2b93b" strokeWidth="1.2" />
              {/* glass frame cage */}
              <path d="M 14%, 0 L 15%, 15 C 15%, 18 16%, 22 18%, 22 C 20%, 22 21%, 18 21%, 15 L 22%, 0" stroke="#f2b93b" strokeWidth="1.2" />
              {/* glass segments */}
              <line x1="18%" y1="0" x2="18%" y2="22" stroke="#f2b93b" strokeWidth="0.8" opacity="0.7" />
              <line x1="16.5%" y1="0" x2="17%" y2="18" stroke="#f2b93b" strokeWidth="0.6" opacity="0.5" />
              <line x1="19.5%" y1="0" x2="19%" y2="18" stroke="#f2b93b" strokeWidth="0.6" opacity="0.5" />
              {/* base cap */}
              <path d="M 15%, 22 L 14%, 26 L 22%, 26 L 21%, 22 Z" fill="#f2b93b" opacity="0.2"/>
              <path d="M 15%, 22 L 14%, 26 L 22%, 26 L 21%, 22 Z" stroke="#f2b93b" strokeWidth="1.2"/>
              {/* bottom finel tip hanging bell */}
              <path d="M 18%, 26 L 18%, 32 M 17.5%, 32 L 18.5%, 32" stroke="#f2b93b" strokeWidth="1.2"/>
            </g>

            {/* Hanging Cord Line 2 --- Middle (hanging high) */}
            <line x1="50%" y1="0" x2="50%" y2="40" stroke="#f2b93b" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
            {/* Detailed Lantern Group 2 (Center - Slightly bigger, majestic) */}
            <g transform="translate(0, 40)" stroke="#fada5e" strokeWidth="1.2" fill="none" opacity="0.95">
              {/* top cap */}
              <path d="M 50%, 0 C 46%,-5 44%,-12 50%,-18 C 56%,-12 54%,-5 50%,0 Z" stroke="#f2b93b" strokeWidth="1.3" />
              {/* cage body */}
              <path d="M 45%, 0 L 46.5%, 18 C 46.5%, 22 48%, 26 50%, 26 C 52%, 26 53.5%, 22 53.5%, 18 L 55%, 0" stroke="#f2b93b" strokeWidth="1.3" />
              {/* vertical cage lines */}
              <line x1="50%" y1="0" x2="50%" y2="26" stroke="#f2b93b" strokeWidth="0.9" opacity="0.8" />
              <line x1="48%" y1="0" x2="48.5%" y2="22" stroke="#f2b93b" strokeWidth="0.7" opacity="0.6" />
              <line x1="52%" y1="0" x2="51.5%" y2="22" stroke="#f2b93b" strokeWidth="0.7" opacity="0.6" />
              {/* base cap */}
              <path d="M 46.5%, 26 L 45%, 31 L 55%, 31 L 53.5%, 26 Z" fill="#f2b93b" opacity="0.2"/>
              <path d="M 46.5%, 26 L 45%, 31 L 55%, 31 L 53.5%, 26 Z" stroke="#f2b93b" strokeWidth="1.3" />
              {/* lower tip */}
              <path d="M 50%, 31 L 50%, 38 M 49%, 38 L 51%, 38" stroke="#f2b93b" strokeWidth="1.3" />
            </g>

            {/* Hanging Cord Line 3 --- Right side (hanging lower) */}
            <line x1="82%" y1="0" x2="82%" y2="90" stroke="#f2b93b" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
            {/* Detailed Lantern Group 3 (Right) */}
            <g transform="translate(0, 90)" stroke="#fada5e" strokeWidth="1" fill="none" opacity="0.85">
              {/* dome caps */}
              <path d="M 82%, 0 C 79%,-4 77%,-10 82%,-14 C 87%,-10 85%,-4 82%,0 Z" stroke="#f2b93b" strokeWidth="1.2" />
              {/* glass frame cage */}
              <path d="M 78%, 0 L 79%, 15 C 79%, 18 80%, 22 82%, 22 C 84%, 22 85%, 18 85%, 15 L 86%, 0" stroke="#f2b93b" strokeWidth="1.2" />
              {/* glass segments */}
              <line x1="82%" y1="0" x2="82%" y2="22" stroke="#f2b93b" strokeWidth="0.8" opacity="0.7" />
              <line x1="80.5%" y1="0" x2="81%" y2="18" stroke="#f2b93b" strokeWidth="0.6" opacity="0.5" />
              <line x1="83.5%" y1="0" x2="83%" y2="18" stroke="#f2b93b" strokeWidth="0.6" opacity="0.5" />
              {/* base cap */}
              <path d="M 79%, 22 L 78%, 26 L 86%, 26 L 85%, 22 Z" fill="#f2b93b" opacity="0.2"/>
              <path d="M 79%, 22 L 78%, 26 L 86%, 26 L 85%, 22 Z" stroke="#f2b93b" strokeWidth="1.2" />
              {/* bottom finel tip */}
              <path d="M 82%, 26 L 82%, 32 M 81.5%, 32 L 82.5%, 32" stroke="#f2b93b" strokeWidth="1.2" />
            </g>
          </svg>
        </div>
      )}

      <ThemeTransitionOverlay isDark={isDark} origin={themeOrigin} />

      {/* Intricate floating particles aura */}
      <div className="w-full max-w-xl mx-auto px-6 pt-4 pb-1 relative z-10">
        {/* iOS Spotlight Mosque Header - Branded Hero Bar */}
        <div className="relative px-2 py-4 flex items-center justify-between min-h-[64px] border-b border-black/[0.05] dark:border-white/[0.05]">
          
          {/* Left/Center: Sleek Single-Language Mosque Name Card with Location */}
          <div className="space-y-0.5 relative z-10 flex flex-col items-start justify-center max-w-[70%] select-none">
            <motion.h1 
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={`text-left ${
                isDark ? 'text-white' : 'text-slate-900'
              } cursor-pointer leading-[1.1] ${
                prefs.language === 'ur'
                  ? 'font-nas-urdu text-[22px] sm:text-[24px] font-medium'
                  : prefs.language === 'ar'
                  ? 'font-reem text-[22px] sm:text-[24px] font-bold'
                  : prefs.language === 'hi' || prefs.language === 'mr'
                  ? 'font-devanagari text-[19px] sm:text-[21px] font-bold'
                  : 'font-cinzel text-[17px] sm:text-[19px] font-black uppercase tracking-wider'
              }`}
            >
              {appConfig.appName || 'Masjid E Quba'}
            </motion.h1>
            <p className={`text-[8px] font-bold tracking-[0.2em] uppercase font-mono ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {TRANSLATIONS[prefs.language]?.mosque_location || 'Dhule, Maharashtra'}
            </p>
          </div>

          {/* Right: Premium Language Cycler and Animated Theme Popup triggers */}
          <div className="flex items-center gap-2 z-20 select-none shrink-0">
            {/* Language Cycler button */}
            <button
              type="button"
              onClick={cycleLanguage}
              className={`h-9 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all text-[11px] font-black tracking-wider uppercase border active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-white/[0.04] border-white/[0.06] text-amber-400 hover:bg-white/[0.08]' 
                  : 'bg-slate-100 border-slate-200 text-emerald-850 hover:bg-slate-202'
              }`}
              title="Switch Language"
            >
              <span className="text-xs">🌐</span>
              <span>
                {prefs.language === 'ur' ? 'اردو' : 
                 prefs.language === 'ar' ? 'عربى' : 
                 prefs.language === 'en' ? 'ENG' : 
                 prefs.language === 'hi' ? 'हिंदी' : 'मराठी'}
              </span>
            </button>

            {/* Theme trigger button (Direct Light/Dark toggle) */}
            <button
              type="button"
              id="theme-trigger-btn"
              onClick={(e) => updateTheme(isDark ? 'emerald-light' : 'emerald-dark', e)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
                isDark 
                  ? 'bg-white/[0.04] border-white/[0.06] text-emerald-400 hover:bg-white/[0.08]' 
                  : 'bg-[#e6eee9] border-[#cbd8cf] text-emerald-800 hover:bg-[#d6ded9]'
              } active:scale-90 cursor-pointer`}
              title={isDark ? "Switch to Premium Light Mode" : "Switch to Premium Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-emerald-800" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Elegant sub-row including Hijri date and standard clock summary */}
      <div className="w-full max-w-xl mx-auto px-6 pt-1 pb-1 relative z-10 select-none">
        <div className={`flex justify-between items-center px-4 py-1.5 rounded-full border ${
          isDark ? 'bg-black/25 border-white/[0.03] text-slate-400' : 'bg-slate-50 border-slate-200/50 text-slate-600'
        } text-[9px] font-bold`}>
          <span className={`font-mono uppercase tracking-widest ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{activeDayName}</span>
          <span className="text-amber-500 font-serif text-sm font-semibold tracking-wide">{getApproxHijriDate(time, prefs.language)}</span>
          <span className="font-mono uppercase tracking-widest">{currentEngDate}</span>
        </div>
      </div>

      {/* Large elegant Arabic Bismillah Calligraphy (Non-boxed as requested) */}
      <div className="w-full max-w-xl mx-auto px-6 pt-2 pb-1 text-center select-none relative z-10">
        <div className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-300 font-serif font-extrabold text-2.5xl sm:text-3.5xl tracking-widest leading-relaxed drop-shadow-[0_2px_8px_rgba(242,185,59,0.25)]">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
        <p className={`text-[8.5px] font-black uppercase tracking-widest font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          In the Name of Allah, the Most Gracious, the Most Merciful
        </p>
      </div>

      {/* Core Layout container with beautiful Tab/Page Transition animations */}
      <main className="max-w-xl mx-auto px-6 relative z-10 font-sans pb-10">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="page-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="space-y-4"
            >
              <SimpleLayout
                timings={timings}
                lang={prefs.language}
                theme={prefs.theme}
                currentId={currId}
                nextId={nextId}
                countdownStr={countdownStr}
                isFriday={isFriday}
                announcements={announcements}
              />
            </motion.div>
          )}

          {activeTab === 'gallery' && (
            <motion.div
              key="page-gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={`p-6 rounded-[2.5rem] border text-left ${
                isDark 
                  ? 'bg-black/30 border-white/[0.04]' 
                  : 'bg-white border-slate-205/60 shadow-sm shadow-slate-100/30'
              }`}
            >
              {/* Grand Gallery Title Header */}
              <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-4 mb-6">
                <div className="flex items-center gap-3 select-none">
                  <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-amber-500/10 text-amber-850 border border-amber-500/15'}`}>
                    <ImageIcon className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-black font-serif tracking-wide ${isDark ? 'text-amber-100' : 'text-slate-800'}`}>
                      {dict.gallery_title || 'Islamic Gallery'}
                    </h2>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-mono mt-0.5">
                      {prefs.language === 'ur' ? 'مسجد کی خوبصورت تصاویر اور اعلانات' : 'Mosque Visual Archive'}
                    </p>
                  </div>
                </div>

                {/* Go Back to Timetable Home page */}
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase font-sans tracking-wider transition-all duration-200 active:scale-95 cursor-pointer hover:bg-amber-550/5 hover:text-amber-500 hover:border-amber-500/35 ${
                    isDark ? 'border-white/[0.06] text-slate-400 bg-white/[0.01]' : 'border-slate-200 text-slate-650 bg-slate-50 shadow-xs'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {prefs.language === 'ur' ? 'واپس' : 'Go Back'}
                </button>
              </div>
              <GalleryView images={galleryImages} lang={prefs.language} isDark={isDark} />
            </motion.div>
          )}

          {activeTab === 'query' && (
            <motion.div
              key="page-query"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={`p-6 rounded-[2.5rem] border text-left ${
                isDark 
                  ? 'bg-black/30 border-white/[0.04]' 
                  : 'bg-white border-slate-205/60 shadow-sm shadow-slate-100/30'
              }`}
            >
              {/* Grand Ask Title Header */}
              <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-4 mb-6">
                <div className="flex items-center gap-3 select-none">
                  <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-amber-500/10 text-amber-850 border border-amber-500/15'}`}>
                    <HelpCircle className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-black font-serif tracking-wide ${isDark ? 'text-amber-100' : 'text-slate-800'}`}>
                      {getNavLabel('ask', prefs.language)}
                    </h2>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-mono mt-0.5">
                      {prefs.language === 'ur' ? 'علمائے کرام سے شرعی سوالات کے جوابات حاصل کریں' : 'Islamic Assistance / Ask Scholars'}
                    </p>
                  </div>
                </div>

                {/* Go Back to Timetable Home page */}
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase font-sans tracking-wider transition-all duration-200 active:scale-95 cursor-pointer hover:bg-amber-550/5 hover:text-amber-500 hover:border-amber-500/35 ${
                    isDark ? 'border-white/[0.06] text-slate-400 bg-white/[0.01]' : 'border-slate-200 text-slate-650 bg-slate-50 shadow-xs'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {prefs.language === 'ur' ? 'واپس' : 'Go Back'}
                </button>
              </div>
              <QueryModal lang={prefs.language} isDark={isDark} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* iOS PAGE SHEET PRESENTATION CONTROLLER Wrapper (For sub views) */}
      <AnimatePresence>
        {['about', 'about-app', 'about-developer'].includes(activeTab) && (
          <>
            {/* Sheet backdrop dim blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-[5000] cursor-pointer"
              onClick={() => closeSubPage()}
            />

            {/* Inset floating sheet container */}
            <div className="fixed inset-0 pointer-events-none z-[5100] flex items-end justify-center">
              <motion.div 
                initial={{ y: "100%", opacity: 0.95 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.95 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className={`pointer-events-auto w-full max-w-xl border-t rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.35)] flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden relative ${
                  isDark ? 'bg-[#090a0f] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Beautiful Top-Right Close Button */}
                <button
                  type="button"
                  onClick={() => closeSubPage()}
                  className={`absolute top-4 right-4 w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer z-50 shadow-xs ${
                    isDark
                      ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.16] text-slate-400 hover:text-white'
                      : 'bg-slate-100 border-slate-250 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Native iOS Page Sheet Horizontal Drag handle shape */}
                <div className="flex justify-center pt-3 pb-2 shrink-0 select-none cursor-pointer" onClick={() => closeSubPage()}>
                  <div className={`w-12 h-1.5 rounded-full transition-colors ${isDark ? 'bg-white/20 hover:bg-white/35' : 'bg-slate-300 hover:bg-slate-400'}`} />
                </div>

                {/* Subview scroll core */}
                <div className="overflow-y-auto px-6 py-4 flex-1 scrollbar-thin scrollbar-thumb-slate-800 pb-24">
                  {activeTab === 'about' && (
                    <AboutView lang={prefs.language} mode="all" isDark={isDark} />
                  )}

                  {activeTab === 'about-app' && (
                    <AboutView lang={prefs.language} mode="app" isDark={isDark} />
                  )}

                  {activeTab === 'about-developer' && (
                    <AboutView lang={prefs.language} mode="developer" isDark={isDark} />
                  )}
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* iOS NOTIFICATION CENTER DRAWER SHEET */}
      <AnimatePresence>
        {activeTab === 'notifications' && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[5000] cursor-pointer"
              onClick={() => closeSubPage()}
            />
            <div className="fixed inset-0 pointer-events-none z-[5100] flex items-end justify-center">
              <motion.div
                initial={{ y: "100%", opacity: 0.95 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.95 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className={`pointer-events-auto w-full max-w-xl border-t rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.35)] flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden relative ${
                  isDark ? 'bg-[#090a0f] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Beautiful Top-Right Close Button */}
                <button
                  type="button"
                  onClick={() => closeSubPage()}
                  className={`absolute top-4 right-4 w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer z-50 shadow-xs ${
                    isDark
                      ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.16] text-slate-400 hover:text-white'
                      : 'bg-slate-100 border-slate-250 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2 shrink-0 select-none cursor-pointer" onClick={() => closeSubPage()}>
                  <div className={`w-12 h-1.5 rounded-full transition-colors ${isDark ? 'bg-white/20 hover:bg-white/35' : 'bg-slate-300 hover:bg-slate-400'}`} />
                </div>

                {/* Body Core */}
                <div className="overflow-y-auto px-6 py-4 flex-1 scrollbar-thin scrollbar-thumb-slate-800 pb-24">
                  <NotificationsView 
                    announcements={announcements} 
                    lang={prefs.language} 
                    isDark={isDark} 
                    readAnnouncementIds={readAnnouncementIds}
                    onReadNotification={handleReadNotification}
                  />
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* iOS SETTINGS PANEL SHEET (Inset grouped selection panel) */}
      <AnimatePresence>
        {showSettingsDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-[5000] cursor-pointer"
              onClick={() => closeSettings()}
            />
            <div className="fixed inset-0 pointer-events-none z-[5100] flex items-end justify-center">
              <motion.div 
                initial={{ y: "100%", opacity: 0.95 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.95 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className={`pointer-events-auto w-full max-w-xl border-t rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.35)] flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden ${
                  isDark ? 'bg-[#090a0f]/95 border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-2 shrink-0 select-none cursor-pointer" onClick={() => closeSettings()}>
                  <div className={`w-12 h-1.5 rounded-full transition-colors ${isDark ? 'bg-white/20 hover:bg-white/35' : 'bg-slate-300 hover:bg-slate-400'}`} />
                </div>

                {/* Header title */}
                <div className={`flex justify-between items-center px-6 py-2 pb-4 border-b shrink-0 select-none ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                  {settingsSubView === 'main' ? (
                    <span className={`font-black flex items-center gap-2 text-xs uppercase tracking-wider font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Settings className="w-4 h-4 text-amber-500" /> Preference Dashboard
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSettingsSubView('main')}
                      className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-500 hover:text-amber-400 transition-colors font-mono cursor-pointer"
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                        setSettingsSubView('main');
                        setShowSettingsDrawer(false);
                        setActiveTab('home');
                    }}
                    className={`px-4 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none font-mono cursor-pointer ${
                      isDark 
                        ? 'bg-white/5 border-white/5 hover:bg-white/10 text-white' 
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    Done
                  </button>
                </div>

                {/* Grouped scroll layout body */}
                <div className="overflow-y-auto px-6 py-4 flex-1 space-y-6 scrollbar-none pb-24">
                  {settingsSubView === 'main' && (
                    <div className="space-y-6 animate-fadeIn">
                      
                      {/* Section: Language (iOS Inset Segment Category) */}
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 font-mono select-none px-1.5">
                          <Languages className="w-4.5 h-4.5 text-sky-400" /> Primary App Language
                        </label>
                        <div className={`grid grid-cols-5 gap-1 border p-1 rounded-2xl font-bold select-none ${isDark ? 'bg-black/45 border-white/[0.03]' : 'bg-slate-100 border-slate-200'}`}>
                          {appConfig.supportedLanguages.map((l, index) => {
                            const labels: Record<string, string> = {
                              ur: 'اردو',
                              ar: 'العربية',
                              en: 'English',
                              hi: 'हिंदी',
                              mr: 'मराठी',
                            };
                            return (
                              <button
                                key={`${l}-${index}`}
                                type="button"
                                onClick={() => updateLang(l as AppLanguage)}
                                className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                                  prefs.language === l 
                                    ? isDark
                                      ? 'bg-white/10 text-sky-450 font-extrabold shadow' 
                                      : 'bg-white text-sky-700 font-extrabold shadow-sm'
                                    : isDark
                                      ? 'text-slate-400 hover:text-slate-200'
                                      : 'text-slate-655 hover:text-slate-900'
                                }`}
                              >
                                {labels[l] || l.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section: Light & Dark Modes */}
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 font-mono select-none px-1.5">
                          <Palette className="w-4.5 h-4.5 text-emerald-500" /> Active Screen Mode
                        </label>
                        <div className={`grid grid-cols-2 gap-1.5 border p-1 rounded-2xl font-bold select-none ${isDark ? 'bg-black/45 border-white/[0.03]' : 'bg-[#eef3ef] border-[#cbd8cf]'}`}>
                          <button
                            type="button"
                            onClick={() => updateTheme('emerald-dark')}
                            className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isDark
                                ? 'bg-[#132018] border border-emerald-500/20 text-emerald-400 font-extrabold shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <Moon className="w-3.5 h-3.5" /> Dark
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTheme('emerald-light')}
                            className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              !isDark
                                ? 'bg-white border border-[#cbd8cf] text-emerald-800 font-black shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5" /> Light
                          </button>
                        </div>
                      </div>
                      {/* Section: Apple spec links */}
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 font-mono select-none px-1.5">
                          <Info className="w-4.5 h-4.5 text-emerald-400" /> Device & Creative Profilers
                        </label>
                        
                        {/* iOS Grouped Link table list */}
                        <div className={`rounded-2xl border overflow-hidden divide-y select-none shadow-xs text-xs ${
                          isDark ? 'bg-black/45 border-white/[0.03] divide-white/[0.03]' : 'bg-slate-50 border-slate-200 divide-slate-150'
                        }`}>
                          {/* App About cell link */}
                          <button
                            type="button"
                            onClick={() => setSettingsSubView('about-app')}
                            className={`w-full p-3.5 px-4 flex items-center justify-between transition-colors text-left cursor-pointer ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-100'}`}
                          >
                            <span className={`font-extrabold flex items-center gap-3 ${isDark ? 'text-slate-300' : 'text-slate-705'}`}>
                              <Smartphone className="w-4 h-4 text-slate-500" /> {dict.btn_about_app || 'About This Application'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-505 font-mono font-bold uppercase">Specs</span>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </button>

                          {/* Developer Bio cell link */}
                          <button
                            type="button"
                            onClick={() => setSettingsSubView('about-developer')}
                            className={`w-full p-3.5 px-4 flex items-center justify-between transition-colors text-left cursor-pointer ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-100'}`}
                          >
                            <span className={`font-extrabold flex items-center gap-3 ${isDark ? 'text-slate-300' : 'text-slate-705'}`}>
                              <Code className="w-4 h-4 text-slate-500" /> {dict.btn_about_dev || 'Meet the Design Guild'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-505 font-mono font-bold uppercase">Authors</span>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {settingsSubView === 'about-app' && (
                    <div className="animate-fadeIn">
                      <AboutView lang={prefs.language} mode="app" isDark={isDark} />
                    </div>
                  )}

                  {settingsSubView === 'about-developer' && (
                    <div className="animate-fadeIn">
                      <AboutView lang={prefs.language} mode="developer" isDark={isDark} />
                    </div>
                  )}
                </div>

                {/* Sheet Bottom Footer */}
                <div className={`p-4 border-t text-[9px] text-slate-500 font-black tracking-widest text-center select-none uppercase font-mono ${
                  isDark ? 'bg-slate-950 border-white/[0.03]' : 'bg-slate-100 border-slate-200'
                }`}>
                  Preferences Sync Secure • FM DB Cloud
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Global Floating Custom Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[4500] w-full max-w-xl px-6 pointer-events-none">
        <div className="pointer-events-auto">
          {inlineNavigationBar}
        </div>
      </div>

      {/* Intuitive Dark-Themed Web Push Permission Prompt Overlay */}
      <NotificationPermissionBanner lang={prefs.language} />

      {/* Aesthetic Vector Accent Wave */}
      <div className={`absolute bottom-0 left-0 w-full h-[220px] pointer-events-none opacity-[0.03] z-0 overflow-hidden ${getsVgColorClass(prefs.theme)} select-none`}>
         <svg width="100%" height="100%" viewBox="0 0 1024 500" fill="none" preserveAspectRatio="none">
           <path d="M0 500H1024V200C900 150 800 250 512 250C224 250 124 100 0 200V500Z" fill="currentColor"/>
         </svg>
      </div>

    </div>
  );
}
