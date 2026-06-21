/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLanguage } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Bell, Info, AlertTriangle, Calendar, Clock, Smile, ChevronDown, ChevronUp, CheckCircle, RefreshCcw, Sparkles } from 'lucide-react';

interface NotificationProps {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  type: string; // Dynamic mapping for 'Reminder', 'Alert', 'Notification', 'Update', 'Event'
  imageUrl?: string;
  image?: string;
  schedule_time?: string;
  valid_from?: string;
  valid_till?: string;
}

interface NotificationsViewProps {
  announcements: NotificationProps[];
  lang: AppLanguage;
  isDark?: boolean;
  readAnnouncementIds?: string[];
  onReadNotification?: (id: string) => void;
}

export default function NotificationsView({ 
  announcements, 
  lang, 
  isDark = true,
  readAnnouncementIds = [],
  onReadNotification
}: NotificationsViewProps) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isRtl = lang === 'ur' || lang === 'ar';
  
  // Track which announcement is expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Category Filtering State: 'all' | 'reminder' | 'alert' | 'notification' | 'update' | 'event'
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Helper check for future scheduled pings
  const isFutureScheduled = (scheduleTimeStr?: string): boolean => {
    if (!scheduleTimeStr) return false;
    try {
      const scheduleTime = new Date(scheduleTimeStr);
      if (isNaN(scheduleTime.getTime())) return false;
      return scheduleTime > new Date();
    } catch {
      return false;
    }
  };

  // Helper check for daily active operational time window bounds
  const isOutsideTimeBounds = (validFrom?: string, validTill?: string): boolean => {
    if (!validFrom && !validTill) return false;
    try {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      let fromMin = 0;
      if (validFrom) {
        const parts = validFrom.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          fromMin = parts[0] * 60 + parts[1];
        }
      }

      let tillMin = 24 * 60;
      if (validTill) {
        const parts = validTill.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          tillMin = parts[0] * 60 + parts[1];
        }
      }

      if (fromMin > tillMin) {
        // Over midnight wrap-around bounds checking
        return currentMin < fromMin && currentMin > tillMin;
      } else {
        // Linear day bounds checking
        return currentMin < fromMin || currentMin > tillMin;
      }
    } catch {
      return false;
    }
  };

  // Map arbitrary database types to one of the 5 standardized payload categories
  const mapTypeCategory = (typeStr: string): 'reminder' | 'alert' | 'notification' | 'update' | 'event' => {
    const t = typeStr?.toLowerCase() || 'notification';
    if (t === 'warning' || t === 'reminder') return 'reminder';
    if (t === 'alert' || t === 'danger' || t === 'error') return 'alert';
    if (t === 'info' || t === 'notification') return 'notification';
    if (t === 'update' || t === 'system') return 'update';
    if (t === 'event' || t === 'program' || t === 'bayan') return 'event';
    return 'notification';
  };

  const getUrgentBadge = (category: string) => {
    switch (category) {
      case 'reminder':
        return {
          bg: isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800',
          borderColor: 'border-amber-500',
          dotBg: 'bg-amber-455',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: lang === 'ur' ? 'یاددہانی' : lang === 'hi' ? 'स्मरण' : 'Reminder'
        };
      case 'alert':
        return {
          bg: isDark ? 'bg-rose-500/15 border-rose-500/30 text-rose-450' : 'bg-rose-50 border-rose-200 text-rose-750',
          borderColor: 'border-rose-500',
          dotBg: 'bg-rose-450',
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: lang === 'ur' ? 'اہم تنبیہ' : lang === 'hi' ? 'सचेत' : 'Alert'
        };
      case 'update':
        return {
          bg: isDark ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'bg-violet-50 border-violet-200 text-violet-850',
          borderColor: 'border-violet-500',
          dotBg: 'bg-violet-450',
          icon: <RefreshCcw className="w-3.5 h-3.5" />,
          label: lang === 'ur' ? 'تبدیلی' : lang === 'hi' ? 'अपडेट' : 'Update'
        };
      case 'event':
        return {
          bg: isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-850',
          borderColor: 'border-emerald-500',
          dotBg: 'bg-emerald-450',
          icon: <Calendar className="w-3.5 h-3.5" />,
          label: lang === 'ur' ? 'باعث برکت پروگرام' : lang === 'hi' ? 'विशेष कार्यक्रम' : 'Event'
        };
      case 'notification':
      default:
        return {
          bg: isDark ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-750',
          borderColor: 'border-sky-500',
          dotBg: 'bg-sky-450',
          icon: <Info className="w-3.5 h-3.5" />,
          label: lang === 'ur' ? 'اطلاع' : lang === 'hi' ? 'सामान्य सूचना' : 'Notification'
        };
    }
  };

  const getFormatDate = (timeMs: number) => {
    try {
      const d = new Date(timeMs);
      return d.toLocaleDateString(lang === 'ur' ? 'ur-PK' : lang === 'hi' ? 'hi-IN' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) + " " + d.toLocaleTimeString(lang === 'ur' ? 'ur-PK' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const textDarkClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-600 font-semibold';
  const bodyTextClass = isDark ? 'text-slate-300' : 'text-slate-700 font-medium';
  const emptyBgClass = isDark ? 'bg-slate-950/45 border-slate-900' : 'bg-slate-105/50 border-slate-200';

  // Apply visual category and timing scheduling restrictions
  const filteredAnnouncements = announcements.filter(act => {
    // 1. If scheduled in the future, do not render or list it on the UI grid until passed
    if (isFutureScheduled(act.schedule_time)) return false;

    // 2. Classify by categorical filters
    if (selectedFilter === 'all') return true;
    return mapTypeCategory(act.type) === selectedFilter;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      
      {/* Header section - matching GalleryView style */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 select-none ${isDark ? 'border-white/[0.04]' : 'border-slate-200'}`}>
        <div className="space-y-1 text-left">
          <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-1.5 font-mono">
            <Bell className="w-3.5 h-3.5" /> {lang === 'ur' ? 'اطلاعات' : 'Announcements'}
          </span>
          <h2 className={`text-2xl font-black tracking-tight leading-none uppercase ${textDarkClass}`}>
            {lang === 'ur' ? 'اطلاعات و اعلانات' : 'Live Announcements'}
          </h2>
        </div>

        {/* Filter Pills styled like GalleryView */}
        <div className={`p-1 rounded-2xl flex gap-0.5 max-w-full overflow-x-auto scrollbar-none font-bold ${isDark ? 'bg-black/45 border-white/[0.04]' : 'bg-slate-100 border-slate-200'}`}>
          {[
            { key: 'all', en: 'All' },
            { key: 'reminder', en: 'Reminder' },
            { key: 'alert', en: 'Alert' },
            { key: 'notification', en: 'Notification' },
            { key: 'update', en: 'Update' },
            { key: 'event', en: 'Event' }
          ].map((filt) => {
            const isActive = selectedFilter === filt.key;
            return (
              <button
                key={filt.key}
                type="button"
                onClick={() => setSelectedFilter(filt.key)}
                className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap relative ${
                  isActive
                    ? isDark 
                      ? 'bg-white/10 text-indigo-400 shadow-sm font-black' 
                      : 'bg-white text-indigo-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {filt.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Notification Stream Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-12">
        {filteredAnnouncements.length === 0 ? (
          <div className={`p-8 rounded-[2rem] border border-dashed text-center space-y-3 backdrop-blur-sm select-none col-span-full ${emptyBgClass}`}>
            <Smile className="w-9 h-9 text-slate-400 mx-auto" />
            <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-750'}`}>
              No announcements found
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((act, index) => {
            const category = mapTypeCategory(act.type);
            const badge = getUrgentBadge(category);
            const isRead = readAnnouncementIds.includes(act.id);
            const isExpanded = expandedId === act.id;
            
            const isExpiredTimebounds = isOutsideTimeBounds(act.valid_from, act.valid_till);

            const resolutionImage = act.imageUrl || act.image;

            let cardBgClass = isRead
              ? isDark 
                ? 'bg-white/[0.015] border-white/[0.03] opacity-65' 
                : 'bg-slate-50/70 border-slate-150 opacity-80'
              : isDark 
                ? 'bg-slate-950/80 border-white/[0.09] shadow-xl' 
                : 'bg-white border-slate-250 shadow-md';

            if (isExpiredTimebounds) {
              cardBgClass += ' grayscale opacity-50 border-dashed border-red-500/20';
            }

            return (
              <motion.div
                key={act.id || index}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  if (onReadNotification) {
                    onReadNotification(act.id);
                  }
                  setExpandedId(isExpanded ? null : act.id);
                }}
                className={`group cursor-pointer rounded-2xl overflow-hidden p-4 border transition-all ${cardBgClass}`}
              >
                {/* Header info */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
                    <span className={`font-extrabold uppercase tracking-wider font-mono ${isDark ? 'text-slate-350' : 'text-slate-650'}`}>
                        {badge.label}
                    </span>
                    <span className={`font-bold font-mono tracking-tighter opacity-80 flex items-center gap-1`}>
                        <Clock className="w-2.5 h-2.5" />
                        {getFormatDate(act.timestamp)}
                    </span>
                </div>

                {/* Text content */}
                <h4 className={`text-sm font-black leading-tight mb-2 ${
                    isRead ? 'text-slate-400 font-bold' : textDarkClass
                }`}>
                    {act.title}
                </h4>
                
                <div className={`text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {act.content}
                </div>

                {resolutionImage && (
                    <div className="pt-2">
                        <img 
                        src={resolutionImage} 
                        alt={act.title} 
                        referrerPolicy="no-referrer"
                        className="w-full object-cover rounded-xl shadow-md border border-white/[0.05] h-32" 
                        />
                    </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
}
