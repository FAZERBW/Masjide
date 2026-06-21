/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GalleryImage, AppLanguage } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ZoomIn, ZoomOut, RotateCcw, X, Camera 
} from 'lucide-react';

interface GalleryViewProps {
  images: GalleryImage[];
  lang: AppLanguage;
  isDark?: boolean;
}

const FALLBACK_IMAGES: (lang: AppLanguage) => GalleryImage[] = (lang) => {
  const t = {
    ur: {
      t1: 'مسجد قباء کا گنبد اور خوبصورت بیرونی منظر',
      t2: 'قرآن مطالعہ اور تلاوت گاہ',
      t3: 'رمضان المبارک کے روح پرور اجتماعات',
      t4: 'روشن منارہ اور شام کا سہانا منظر',
      t5: 'دعا اور مناجات کے لیے مخصوص ہال'
    },
    ar: {
      t1: 'بوابة مسجد قباء وقبة المسجد الكبرى',
      t2: 'ملاذ قراءة ودراسة القرآن الكريم',
      t3: 'التجمعات الرمضانية المباركة',
      t4: 'المئذنة المضيئة في المساء',
      t5: 'قاعة الدعاء والعبادة والسكينة'
    },
    hi: {
      t1: 'मस्जिद ए कुबा मुख्य गुंबद प्रवेश द्वार',
      t2: 'कुरान अध्ययन एवं वाचन क्षेत्र',
      t3: 'रमजान की पवित्र सभाएं',
      t4: 'रोशन मीनार और शाम का सुंदर दृश्य',
      t5: 'दुआ और ध्यान लगाने का कक्ष'
    },
    mr: {
      t1: 'मस्जिद ए कुबा मुख्य घुमट प्रवेशद्वार',
      t2: 'कुराण अभ्यास आणि वाचन कक्ष',
      t3: 'रमझानच्या पवित्र सामूहिक सभा',
      t4: 'प्रकाशित मीनार आणि संध्याकाळची सुंदर वेळ',
      t5: 'दुआ आणि आध्यात्मिक ध्यान केंद्र'
    },
    en: {
      t1: 'Masjid E Quba Grand Dome Gateway',
      t2: 'Holy Quran Study & Reading Sanctuary',
      t3: 'Ramadan Holy Congregational Assemblies',
      t4: 'Illuminated Minaret & Evening Twilight',
      t5: 'Dua & Meditation Spiritual Hall'
    }
  }[lang] || {
    t1: 'Masjid E Quba Grand Dome Gateway',
    t2: 'Holy Quran Study & Reading Sanctuary',
    t3: 'Ramadan Holy Congregational Assemblies',
    t4: 'Illuminated Minaret & Evening Twilight',
    t5: 'Dua & Meditation Spiritual Hall'
  };

  return [
    {
      id: 'f1',
      title: t.t1,
      url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=800',
      timestamp: Date.now() - 3600000 * 24 * 3,
      category: 'architecture'
    },
    {
      id: 'f2',
      title: t.t2,
      url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=80&w=800',
      timestamp: Date.now() - 3600000 * 24 * 1,
      category: 'programs'
    },
    {
      id: 'f3',
      title: t.t3,
      url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=800',
      timestamp: Date.now() - 3600000 * 5,
      category: 'scenes'
    },
    {
      id: 'f4',
      title: t.t4,
      url: 'https://images.unsplash.com/photo-1597935258735-e254c1839512?auto=format&fit=crop&q=80&w=800',
      timestamp: Date.now() - 3600000 * 24 * 12,
      category: 'architecture'
    },
    {
      id: 'f5',
      title: t.t5,
      url: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&q=80&w=800',
      timestamp: Date.now() - 3600000 * 24 * 6,
      category: 'scenes'
    }
  ];
};

export default function GalleryView({ images, lang, isDark = true }: GalleryViewProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  // Combine custom uploaded images with fallback placeholders
  const baseImages = images.length > 0 ? images : FALLBACK_IMAGES(lang);

  // Filter images based on category
  const filteredImages = activeCategory === 'all' 
    ? baseImages
    : baseImages.filter(img => {
        const cat = (img as any).category || 'scenes';
        return cat === activeCategory;
      });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'all': 
        return lang === 'ur' ? 'تمام تصویریں' : lang === 'ar' ? 'الكل' : lang === 'hi' ? 'सभी तस्वीरें' : lang === 'mr' ? 'सर्व फोटो' : 'All Photos';
      case 'architecture': 
        return lang === 'ur' ? 'مسجد کی تعمیر' : lang === 'ar' ? 'العمارة' : lang === 'hi' ? 'भवन निर्माण' : lang === 'mr' ? 'भवन रचना' : 'Architecture';
      case 'programs': 
        return lang === 'ur' ? 'پروگرامز' : lang === 'ar' ? 'البرامج' : lang === 'hi' ? 'कार्यक्रम' : lang === 'mr' ? 'कार्यक्रम' : 'Programs';
      case 'scenes': 
        return lang === 'ur' ? 'مناظر' : lang === 'ar' ? 'المشاهد' : lang === 'hi' ? 'मस्जिद दृश्य' : lang === 'mr' ? 'मस्जिद देखावे' : 'Scenes';
      default: 
        return cat;
    }
  };

  const handleImageOpen = (img: GalleryImage) => {
    setSelectedImage(img);
    setZoomScale(1);
    setRotation(0);
  };

  const isRtl = lang === 'ur' || lang === 'ar';
  
  const textDarkClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-600 font-semibold';
  const controlBtnBg = isDark ? 'bg-black/45 border-white/[0.04]' : 'bg-slate-100 border-slate-205';

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      
      {/* iOS Photos Header section */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 select-none ${isDark ? 'border-white/[0.04]' : 'border-slate-200'}`}>
        <div className="space-y-1 text-left">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-1.5 font-mono">
            <Camera className="w-3.5 h-3.5" /> {lang === 'ur' ? 'البم گیلری' : lang === 'hi' ? 'फोटो एलबम' : 'Media Album'}
          </span>
          <h2 className={`text-2xl font-black tracking-tight leading-none uppercase ${textDarkClass}`}>
            {dict.gallery_title || (lang === 'ur' ? 'تصاویر آرکائیو' : 'Photos Archive')}
          </h2>
        </div>

        {/* Continuous iOS UISegmentedControl styled Pill track */}
        <div className={`p-1 rounded-2xl flex gap-0.5 max-w-full overflow-x-auto scrollbar-none font-bold ${controlBtnBg}`}>
          {['all', 'architecture', 'programs', 'scenes'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap relative ${
                activeCategory === cat
                  ? isDark 
                    ? 'bg-white/10 text-emerald-400 shadow-sm font-black' 
                    : 'bg-white text-emerald-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: iOS Album Layout Grid */}
      <motion.div 
        layout
        className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-12"
      >
        <AnimatePresence mode="popLayout">
          {filteredImages.map((img, idx) => (
            <motion.div
              layout
              key={img.id || idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleImageOpen(img)}
              className={`group cursor-pointer rounded-2xl overflow-hidden aspect-[4/3] relative shadow-xs border transition-all ${
                isDark ? 'bg-slate-950 border-white/[0.05] hover:border-emerald-500/40' : 'bg-white border-slate-200 hover:border-emerald-500 shadow-[0_4px_12px_rgba(0,0,0,0.02)]'
              }`}
            >
              {/* Overlay shadow for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5 z-10 transition-opacity group-hover:opacity-60" />

              <img
                src={img.url}
                alt={img.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-505"
              />

              {/* Inset metadata label like iOS memories */}
              <div className="absolute bottom-0 left-0 right-0 p-3 z-20 text-left space-y-0.5 select-none text-white">
                <span className="text-[8px] font-extrabold uppercase bg-emerald-950/70 border border-emerald-500/20 text-[#00ff88] px-2 py-0.5 rounded-full inline-block">
                  {getCategoryLabel(img.category || 'scenes')}
                </span>
                <p className={`text-[11px] font-bold line-clamp-1 ${isRtl ? 'font-serif text-right' : ''}`}>
                  {img.title || 'Masjid Portfolio'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Full-Screen iOS Glass Photo Detail Modal popup */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[9000] flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden select-none"
          >
            {/* Top iOS Meta header row */}
            <div className="w-full max-w-4xl flex items-center justify-between border-b border-white/[0.05] pb-3 shrink-0">
              <div className="text-left space-y-0.5">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest font-mono">
                  {getCategoryLabel(selectedImage.category || 'scenes')}
                </span>
                <p className={`text-sm font-extrabold text-white line-clamp-1 ${isRtl ? 'font-serif text-right' : ''}`}>
                  {selectedImage.title}
                </p>
              </div>

              {/* Close controls */}
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/5 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immersive Photo Display viewport with zoom/rotation filters applied */}
            <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden my-4">
              <motion.img
                key={selectedImage.id}
                src={selectedImage.url}
                alt={selectedImage.title}
                style={{
                  scale: zoomScale,
                  rotate: `${rotation}deg`
                }}
                referrerPolicy="no-referrer"
                transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                className="max-w-full max-h-[70vh] md:max-h-[76vh] object-contain rounded-2xl shadow-2xl filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
              />
            </div>

            {/* Bottom Glass Tool widgets menu */}
            <div className="w-full max-w-md shrink-0">
              <div className="bg-white/[0.07] border border-white/[0.08] backdrop-blur-3xl rounded-[2.2rem] p-3 flex items-center justify-around shadow-xl text-white">
                
                {/* Zoom out */}
                <button
                  type="button"
                  disabled={zoomScale <= 0.5}
                  onClick={() => setZoomScale(s => Math.max(0.5, s - 0.25))}
                  className="p-3 bg-black/40 hover:bg-black/60 border border-white/[0.05] hover:border-emerald-500/30 rounded-full text-slate-200 transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4.5 h-4.5" />
                </button>

                {/* Reset Rotate/Scale */}
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setRotation(0);
                  }}
                  className="px-4 py-2 bg-black/60 hover:bg-black/80 border border-white/[0.05] hover:border-amber-500/40 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all flex items-center gap-2 active:scale-95"
                  title="Reset View"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>

                {/* Rotate degree increment */}
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="px-4 py-2 bg-black/60 hover:bg-black/80 border border-white/[0.05] hover:border-indigo-500/40 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all flex items-center gap-2 active:scale-95"
                  title="Rotate Left"
                >
                  <RotateCcw className="w-3.5 h-3.5 -scale-x-100" /> Rotate
                </button>

                {/* Zoom in */}
                <button
                  type="button"
                  disabled={zoomScale >= 3.0}
                  onClick={() => setZoomScale(s => Math.min(3.0, s + 0.25))}
                  className="p-3 bg-black/40 hover:bg-black/60 border border-white/[0.05] hover:border-emerald-500/30 rounded-full text-slate-200 transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4.5 h-4.5" />
                </button>

              </div>
              <div className="text-[10px] text-slate-500 italic mt-3 text-center">
                Pinch image triggers standard dynamic scale overlays. Press X to dismiss.
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
