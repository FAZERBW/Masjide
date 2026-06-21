/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useState, useEffect } from 'react';
import { PrayerTimings, AppLanguage, PrayerTime } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { THEME_COLORS } from '../data/themes';
import MasjidMap from './MasjidMap';
import { Sunrise, Clock, Moon, Sun, Sparkles, Navigation, Hourglass, BookOpen, Compass, Calendar, ChevronRight, Users, Play, Pause, Volume2, X, Share2, Copy, Check, MapPin } from 'lucide-react';
import { timeStringToMinutes } from '../data/prayers';
import { localizeDigits } from '../data/numberFormats';
import { motion, AnimatePresence } from 'motion/react';

interface SimpleLayoutProps {
  timings: PrayerTimings;
  lang: AppLanguage;
  theme: any;
  currentId: string;
  nextId: string;
  countdownStr: string;
  isFriday: boolean;
  announcements?: any[];
}

export default function SimpleLayout({
  timings,
  lang,
  theme,
  currentId,
  nextId,
  countdownStr,
  isFriday,
  announcements = []
}: SimpleLayoutProps) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const color = THEME_COLORS[theme] || THEME_COLORS['emerald-dark'];
  const loc = (val: string | number | undefined | null) => localizeDigits(val, lang);

  const getPrayerName = (id: string) => {
    return dict[id] || id;
  };

  const getPrayerArabic = (id: string) => {
    const arabics: Record<string, string> = {
      fajr: 'فجر',
      zuhr: 'ظہر',
      asr: 'عصر',
      maghrib: 'مغرب',
      isha: 'عشاء',
      juma: 'جمعہ',
      sahr: 'سحر',
      iftar: 'افطار'
    };
    return arabics[id] || '';
  };

  const prayersList: Array<{ id: 'fajr' | 'zuhr' | 'juma' | 'asr' | 'maghrib' | 'isha'; icon: any }> = isFriday ? [
    { id: 'fajr', icon: Sunrise },
    { id: 'juma', icon: Calendar },
    { id: 'asr', icon: Clock },
    { id: 'maghrib', icon: Moon },
    { id: 'isha', icon: Moon }
  ] : [
    { id: 'fajr', icon: Sunrise },
    { id: 'zuhr', icon: Sun },
    { id: 'asr', icon: Clock },
    { id: 'maghrib', icon: Moon },
    { id: 'isha', icon: Moon }
  ];

  // Safely grab upcoming prayer data
  const nextPrayerName = getPrayerName(nextId);
  const nextPrayerArabic = getPrayerArabic(nextId);
  const nextPrayerData = timings[nextId as keyof PrayerTimings] as PrayerTime;
  const currentPrayerData = timings[currentId as keyof PrayerTimings] as PrayerTime;
  const isRtl = lang === 'ur' || lang === 'ar';
  const isDark = theme.endsWith('dark');

  // Interactive Custom Popups & Audio Play States
  const [selectedNamaz, setSelectedNamaz] = useState<'fajr' | 'zuhr' | 'juma' | 'asr' | 'maghrib' | 'isha' | null>(null);
  const [selectedDua, setSelectedDua] = useState<'sahar' | 'iftar' | null>(null);
  const [isDuaPlaying, setIsDuaPlaying] = useState(false);
  const [synthInstance, setSynthInstance] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeMetroTab, setActiveMetroTab] = useState<'namaz' | 'roza'>('namaz');

  // New Eid Mubarak Interactive Modal controls
  const [showEidModal, setShowEidModal] = useState(false);
  const [isTakbeerPlaying, setIsTakbeerPlaying] = useState(false);
  const [isTarikaPlaying, setIsTarikaPlaying] = useState(false);
  const [tarikaLang, setTarikaLang] = useState<'en' | 'hi' | 'ur'>('en');

  const generateShareText = () => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let text = `Masjid E Quba,\nDhule, Maharashtra.\n📅 ${today}\n\n`;
    
    prayersList.forEach((prayer) => {
      const pmData = timings[prayer.id];
      const pName = getPrayerName(prayer.id).toUpperCase();
      const pAr = getPrayerArabic(prayer.id);
      if (pmData) {
        text += `✨ *${pName} (${pAr})*:\n   Azan: ${pmData.azan || '--:--'} | Jamat: ${pmData.jamat || '--:--'}\n\n`;
      }
    });

    if (timings.sahr || timings.iftar) {
      text += `⏱️ *ROZA TIMINGS*:\n`;
      if (timings.sahr) text += `   Sahar End: ${timings.sahr}\n`;
      if (timings.iftar) text += `   Iftar Time: ${timings.iftar}\n`;
      text += `\n`;
    }

    text += `📲 Shared from masjid e quba application`;
    return text;
  };

  const handleNativeShare = async () => {
    const shareText = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Masjid Prayer Timetable`,
          text: shareText,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      handleCopyToClipboard();
    }
  };

  const handleCopyToClipboard = () => {
    const shareText = generateShareText();
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stop audio whenever modal closes or shifts
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsTakbeerPlaying(false);
    setIsTarikaPlaying(false);
    setIsDuaPlaying(false);

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (synthInstance) {
        try {
          synthInstance.osc1.stop();
          synthInstance.osc2.stop();
          synthInstance.ctx.close();
        } catch (e) {}
      }
    };
  }, [selectedDua, showEidModal, selectedNamaz]);

  const startAmbientSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return null;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(144, ctx.currentTime);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(216, ctx.currentTime);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      return { ctx, osc1, osc2, gainNode };
    } catch (e) {
      console.warn("Ambient Audio Not Supported:", e);
      return null;
    }
  };

  const handleTogglePlayDua = (type: 'sahar' | 'iftar') => {
    if (isDuaPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (synthInstance) {
        try {
          synthInstance.osc1.stop();
          synthInstance.osc2.stop();
          synthInstance.ctx.close();
        } catch (e) {}
         setSynthInstance(null);
      }
      setIsDuaPlaying(false);
    } else {
      let targetText = '';
      let targetLang = 'ar-SA';
      let voices: SpeechSynthesisVoice[] = [];
      
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        voices = window.speechSynthesis.getVoices();
      }

      const arVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar') || v.lang.toLowerCase().includes('sa'));
      const hiVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().includes('in'));

      if (arVoice) {
        // Arabic voice is available: use clean Arabic stop-form (Waqf) text so it stops pronouncing as 'Ramadana'
        targetText = type === 'sahar' 
          ? 'وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانْ' 
          : 'اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ';
        targetLang = 'ar-SA';
      } else if (hiVoice) {
        // Fallback to beautiful phonetic Hindi for local subcontinent system voices
        targetText = type === 'sahar'
          ? 'व बिसौमि ग़दिन् नवैतु मिन् शहरि रमज़ान'
          : 'अल्लाहुम्मा इन्नी लका सुमतु व बिका आमन्तु व अलैका तवक्कलतु व अला रिज़्क़िका अफ़्तरतु';
        targetLang = 'hi-IN';
      } else {
        // Clear transliterated fallback for English or any other system voice
        targetText = type === 'sahar'
          ? 'Wa bi-sawmi ghadin nawaiytu min shahri ramadaan.'
          : 'Allahumma inni laka sumtu, wa bika aamantu, wa alayka tawakkaltu, wa ala rizqika aftartu.';
        targetLang = 'en-US';
      }

      const ambient = startAmbientSound();
      setSynthInstance(ambient);

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(targetText);
        utterance.lang = targetLang;
        utterance.rate = targetLang === 'ar-SA' ? 0.72 : (targetLang === 'hi-IN' ? 0.82 : 0.85);
        utterance.pitch = 0.95;

        if (targetLang === 'ar-SA' && arVoice) {
          utterance.voice = arVoice;
        } else if (targetLang === 'hi-IN' && hiVoice) {
          utterance.voice = hiVoice;
        }

        utterance.onend = () => {
          setIsDuaPlaying(false);
          if (ambient) {
            try {
              ambient.osc1.stop();
              ambient.osc2.stop();
              ambient.ctx.close();
            } catch (e) {}
            setSynthInstance(null);
          }
        };

        utterance.onerror = () => {
          setIsDuaPlaying(false);
          if (ambient) {
            try {
              ambient.osc1.stop();
              ambient.osc2.stop();
              ambient.ctx.close();
            } catch (e) {}
            setSynthInstance(null);
          }
        };

        window.speechSynthesis.speak(utterance);
        setIsDuaPlaying(true);
      } else {
        setIsDuaPlaying(true);
        setTimeout(() => {
          setIsDuaPlaying(false);
          if (ambient) {
            try {
              ambient.osc1.stop();
              ambient.osc2.stop();
              ambient.ctx.close();
            } catch (e) {}
            setSynthInstance(null);
          }
        }, 6000);
      }
    }
  };

  const handleTogglePlayTakbeer = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isTakbeerPlaying) {
      window.speechSynthesis.cancel();
      setIsTakbeerPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      setIsTarikaPlaying(false);
      setIsDuaPlaying(false);

      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar') || v.lang.toLowerCase().includes('sa'));
      
      let textToRead = '';
      let targetLang = 'ar-SA';
      if (arVoice) {
        textToRead = 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ لَا إِلَهَ إِلَّا اللَّهُ اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْد';
        targetLang = 'ar-SA';
      } else {
        textToRead = 'Allahu Akbar, Allahu Akbar, La ilaha illallah, Allahu Akbar, Allahu Akbar, wa lillahil hamd.';
        targetLang = 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = targetLang;
      utterance.rate = arVoice ? 0.72 : 0.82;
      utterance.pitch = 0.95;
      if (arVoice) {
        utterance.voice = arVoice;
      }

      utterance.onend = () => setIsTakbeerPlaying(false);
      utterance.onerror = () => setIsTakbeerPlaying(false);

      setIsTakbeerPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTogglePlayTarika = (langKey: 'en' | 'hi' | 'ur') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isTarikaPlaying) {
      window.speechSynthesis.cancel();
      setIsTarikaPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      setIsTakbeerPlaying(false);
      setIsDuaPlaying(false);

      const targetTexts = {
        en: "First, make the intention of praying 2 Rakats Wajib Eid prayer with 6 extra Takbeeraat behind the Imam. In the first Rakat, after counting the opening fold, the Imam will call 3 extra Takbeeraat. Hands are raised and released on the first two, and folded on the third. The Imam recites Quran. In the second Rakat, after Quran recitation, the Imam calls 3 extra Takbeeraat. Raise and release hands for all three. On the fourth, go straight into Ruku without raising. Complete the namaz and listen to the Khutbah.",
        hi: "नियत: मैं नियत करता हूँ दो रकात ईद की नमाज़ वाजिब छह जायद तकबीरों के साथ, पीछे इस इमाम के। पहली रकात में सना के बाद इमाम तीन तकबीर कहेंगे। पहले दो में हाथ उठाकर छोड़ दें, तीसरे में हाथ बांध लें। दूसरी रकात में सूरत पढ़ने के बाद इमाम फिर तीन तकबीर कहेंगे। तीनों में हाथ उठाकर छोड़ दें और चौथी तकबीर पर बिना हाथ उठाए रुकू में जाएं। नमाज़ के बाद ईद का खुत्बा बिल्कुल खामोशी से सुनें।",
        ur: "نیت: عید کی دو رکعات واجب مع چھ زائد تکبیروں کے، امام کے پیچھے منہ کعبہ شریف کی طرف۔ پہلی رکعت میں ثنا پڑھنے کے بعد امام تین زائد تکبیریں کہے گا۔ پہلی دو تکبیروں میں ہاتھ اٹھا کر چھوڑ دیں، تیسری کے بعد ہاتھ باندھ لیں۔ دوسری رکعت میں سورہ فاتحہ اور سورت پڑھنے کے بعد امام تین زائد تکبیریں کہے گا۔ تینوں میں ہاتھ اٹھا کر چھوڑیں اور چوتھی تکبیر پر بغیر ہاتھ اٹھائے رکوع میں چلے جائیں۔ سلام کے بعد خطبہ عید سننا واجب ہے۔"
      };

      const selectedLanguageTags = {
        en: 'en-US',
        hi: 'hi-IN',
        ur: 'ur-PK'
      };

      const utterance = new SpeechSynthesisUtterance(targetTexts[langKey]);
      utterance.lang = selectedLanguageTags[langKey];
      
      const voices = window.speechSynthesis.getVoices();
      let targetVoice = null;
      if (langKey === 'ur') {
        targetVoice = voices.find(v => v.lang.toLowerCase().startsWith('ur')) || voices.find(v => v.lang.toLowerCase().startsWith('hi'));
        if (targetVoice) {
          utterance.voice = targetVoice;
          if (targetVoice.lang.toLowerCase().startsWith('hi')) {
            utterance.lang = 'hi-IN';
          }
        }
      } else if (langKey === 'hi') {
        targetVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
        if (targetVoice) utterance.voice = targetVoice;
      } else {
        targetVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
        if (targetVoice) utterance.voice = targetVoice;
      }

      utterance.rate = 0.85;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsTarikaPlaying(false);
      utterance.onerror = () => setIsTarikaPlaying(false);

      setIsTarikaPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const PRAYERS_MUTED_META: Record<string, Record<AppLanguage, { rakats: string; virtue: string }>> = {
    fajr: {
      en: { rakats: "4 Rakats (2 Sunnah, 2 Fard)", virtue: "Fajr brings Noor (light) to your face, Barakah (blessing) in your day, and protects you under Allah's care." },
      ur: { rakats: "4 رکعات (2 سنت، 2 فرض)", virtue: "فجر دن کی شروعات ہے، یہ چہرے پر نور، رزق میں برکت اور انسان کو دن بھر اللہ کی حفاظت میں رکھتی ہے۔" },
      hi: { rakats: "4 रकात (2 सुन्नत, 2 फ़र्ज़)", virtue: "फ़ज्र चेहरे पर नूर, रोज़ी में बरकत लाती है और पूरा दिन अल्लाह की हिफ़ाज़त में रखती है।" },
      mr: { rakats: "4 रकात (2 सुन्नत, 2 फर्ज)", virtue: "फज्र चेहऱ्यावर तेज आणि उपजीविकेत समृद्धी आणते. दिवसभर देवाचे रक्षण लाभते." },
      ar: { rakats: "٤ ركعات (٢ سنة، ٢ فرض)", virtue: "صلاة الفجر تجلب النور للوجه والبركة في الرزق، وتجعل أصحابها في ذمة الله ورعايته." }
    },
    zuhr: {
      en: { rakats: "12 Rakats (4 Sunnah, 4 Fard, 2 Sunnah, 2 Nafl)", virtue: "Offer Zuhr to secure a house in Paradise and seek spiritual respite in the middle of worldly duties." },
      ur: { rakats: "12 رکعات (4 سنت، 4 فرض، 2 سنت، 2 نفل)", virtue: "ظہر دنیاوی کاموں کے دوران روح کو تروتازہ کرتی ہے اور جنت میں اعلیٰ مقام کا باعث بنتی ہے۔" },
      hi: { rakats: "12 रकात (4 सुन्नत, 4 फ़र्ज़, 2 सुन्नत, 2 नफ़्ल)", virtue: "ज़ुहर दुनियावी कामों के बीच रूह को ताज़गी देती है और अल्लाह की रज़ा हासिल करने का बेहतरीन ज़रिया है।" },
      mr: { rakats: "12 रकात (4 सुन्नत, 4 फर्ज, 2 सुन्नत, 2 नफ्ळ)", virtue: "दुपारच्या कामांच्या गडबडीत झुहर मनाला शांती आणि आध्यात्मिक ऊर्जा प्रदान करते." },
      ar: { rakats: "١٢ ركعة (٤ سنة، ٤ فرض، ٢ سنة، ٢ نفل)", virtue: "الظهر تجلب الطمأنينة وتبعث النشاط والراحة الروحية وسط السعي اليومي في المعاش." }
    },
    juma: {
      en: { rakats: "14 Rakats (4 Sunnah, 2 Fard, 4 Sunnah, 2 Sunnah, 2 Nafl)", virtue: "Juma is Sayyid-ul-Ayyam (Leader of Days). Sins are forgiven between two successive Fridays." },
      ur: { rakats: "14 رکعات (4 سنت، 2 فرض، 4 سنت، 2 سنت، 2 نفل)", virtue: "جمعہ کا دن تمام دنوں کا سردار اور عید کا دن ہے۔ اس میں درود شریف کی کثرت گناہوں کی معافی کا سبب بنتی ہے۔" },
      hi: { rakats: "14 रकात (4 सुन्नत, 2 फ़र्ज़, 4 सुन्नत, 2 सुन्नत, 2 नफ़्ल)", virtue: "जुमा सभी दिनों का सरदार और मोमिनों की ईद है। इस दिन दुरूद शरीफ़ पढ़ने की बेहद फ़ज़ीलत है।" },
      mr: { rakats: "14 रकात (4 सुन्नत, 2 फर्ज, 4 सुन्नत, 2 सुन्नत, 2 नफ्ळ)", virtue: "शुक्रवारचा दिवस हा अत्यंत पवित्र आणि सणाचा मानला जातो. या दिवशी प्रार्थना केल्याने विशेष आशीर्वाद मिळतो." },
      ar: { rakats: "١٤ ركعة (٤ سنة، ٢ فرض، ٤ سنة، ٢ سنة، ٢ نفل)", virtue: "يوم الجمعة هو سيد الأيام وعيد المؤمنين الأسبوعي، والتبكير لصلاتها له أجر عظيم." }
    },
    asr: {
      en: { rakats: "8 Rakats (4 Sunnah, 4 Fard)", virtue: "The Middle Prayer. Protecting Asr ensures double reward and keeps one safe from the loss of deeds." },
      ur: { rakats: "8 رکعات (4 سنت، 4 فرض)", virtue: "نمازِ وسطیٰ! عصر کی باقاعدگی اعمال کے نقصان سے بچاتی ہے اور دگنے ثواب کا باعث بنتی ہے۔" },
      hi: { rakats: "8 रकात (4 सुन्नत, 4 फ़र्ज़)", virtue: "मध्याह्न नमाज़! असर की पाबंदी कर्मों के नुकसान से बचाती है और बड़ा अज्र दिलाती है।" },
      mr: { rakats: "8 रकात (4 सुन्नत, 4 फर्ज)", virtue: "असरची प्रार्थना मानवी कर्मांचे नुकसान होण्यापासून वाचवते आणि दुप्पट पुण्य मिळवून देते." },
      ar: { rakats: "٨ ركعات (٤ سنة، ٤ فرض)", virtue: "صلاة العصر هي الصلاة الوسطى، والمحافظة عليها تزيد الأجر والبركة في العمل والعمر." }
    },
    maghrib: {
      en: { rakats: "7 Rakats (3 Fard, 2 Sunnah, 2 Nafl)", virtue: "Observed right at sunset. Duas made between Azan and Jamat of Maghrib are rarely rejected." },
      ur: { rakats: "7 رکعات (3 فرض، 2 سنت، 2 نفل)", virtue: "غروبِ آفتاب پر ادا کی جانے والی نماز۔ مغرب کی اذان اور اقامت کے وقت مانگی گئی دعائیں قبول ہوتی ہیں۔" },
      hi: { rakats: "7 रकात (3 फ़र्ज़, 2 सुन्नत, 2 नफ़्ल)", virtue: "सूर्यास्त की नमाज़! मग़रिब की अज़ان اور اقامت کے بیچ مانگی گئی دعائیں بہت قبول ہوتی ہیں۔" },
      mr: { rakats: "7 रकात (3 फर्ज, 2 सुन्नत, 2 नफ्ळ)", virtue: "सूर्यास्तानंतर लगेच केली जाणारी प्रार्थना. या वेळी केलेल्या प्रार्थना स्वीकारल्या जातात." },
      ar: { rakats: "٧ ركعات (٣ فرض، ٢ سنة، ٢ نفل)", virtue: "المغرب صلاة جامعة، والدعاء بين أذانها وإقامتها مستجاب ومبارك ومفضّل." }
    },
    isha: {
      en: { rakats: "17 Rakats (4 Sunnah, 4 Fard, 2 Sunnah, 2 Nafl, 3 Witr, 2 Nafl)", virtue: "The congregation of Isha is equal to standing half the night in prayers and gives restful sleep." },
      ur: { rakats: "17 رکعات (4 سنت، 4 فرض، 2 سنت، 2 نفل، 3 وتر، 2 نفل)", virtue: "باجماعت عشاء کی نماز آدھی رات کے قیام کے برابر ثواب رکھتی ہے اور پرسکون نیند کا سبب بنتی ہے۔" },
      hi: { rakats: "17 रकात (4 सुन्नत, 4 फ़र्ज़, 2 सुन्नत, 2 नफ़्ल, 3 वित्र, 2 नफ़्ल)", virtue: "जमात के साथ इशा पढ़ना आधी रात इबादत करने के बराबर है। यह सुकून की नींद बख्शती है।" },
      mr: { rakats: "17 रकात (4 सुन्नत, 4 फर्ज, 2 सुन्नत, 2 नफ्ळ, 3 वित्र, 2 नफ्ळ)", virtue: "सामूहिकरीत्या इशाची प्रार्थना करणे हे अर्धी रात्र प्रार्थना करण्याइतके पुण्य देते." },
      ar: { rakats: "١٧ ركعة (٤ سنة، ٤ فرض، ٢ سنة، ٢ نفل، ٣ وتر، ٢ نفل)", virtue: "صلاة العشاء في جماعة تعدل قيام نصف الليل، وتنزل السكينة والرحمة والنوم الهانئ." }
    }
  };

  // Jamat status tracking and interactive simulation state
  const [demoJamatActive, setDemoJamatActive] = useState<boolean | null>(null);
  const [currentTimeMin, setCurrentTimeMin] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeMin(now.getHours() * 60 + now.getMinutes());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const [currentRemainingStr, setCurrentRemainingStr] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    const updateProgressAndRemaining = () => {
      const startStr = currentPrayerData?.start || currentPrayerData?.azan;
      const endStr = currentPrayerData?.end;
      if (!startStr || !endStr) {
        setProgressPercentage(0);
        setCurrentRemainingStr('');
        return;
      }

      const startMin = timeStringToMinutes(startStr);
      let endMin = timeStringToMinutes(endStr);
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      let endMinAdjusted = endMin;
      let nowMinAdjusted = nowMin;

      // Handle midnight wrap-around for Isha
      if (endMin < startMin) {
        endMinAdjusted += 24 * 60;
      }
      if (nowMin < startMin && endMinAdjusted > 24 * 60) {
        nowMinAdjusted += 24 * 60;
      }

      const totalDuration = endMinAdjusted - startMin;
      const elapsed = nowMinAdjusted - startMin;

      let pct = 0;
      if (totalDuration > 0) {
        pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      }
      setProgressPercentage(pct);

      let diff = endMinAdjusted - nowMinAdjusted;
      if (diff > 0) {
        const hrs = Math.floor(diff / 60);
        const mins = diff % 60;
        setCurrentRemainingStr(`${hrs > 0 ? `${hrs}h ` : ''}${mins}m left`);
      } else {
        setCurrentRemainingStr('');
      }
    };

    updateProgressAndRemaining();
    const interval = setInterval(updateProgressAndRemaining, 30000);
    return () => clearInterval(interval);
  }, [currentPrayerData]);

  // Is Jamat active condition
  const isJamatActiveLive = (() => {
    if (!currentPrayerData?.jamat) return false;
    const jamatMin = timeStringToMinutes(currentPrayerData.jamat);
    const windowMin = 15; // 15 mins congregation limit
    return currentTimeMin >= jamatMin && currentTimeMin < (jamatMin + windowMin);
  })();

  const isJamatActive = demoJamatActive !== null ? demoJamatActive : isJamatActiveLive;

  // Theming classes helper
  const textDarkClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-slate-450' : 'text-slate-500';
  const textMutedLightClass = isDark ? 'text-slate-300' : 'text-slate-700';
  const dividerClass = isDark ? 'border-white/[0.06]' : 'border-slate-200/90';
  const listHoverClass = isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50';
  const currentClayClass = isDark ? 'clay-glass-dark' : 'clay-glass-light';
  const upcomingClayClass = isDark ? 'clay-glass-dark-subtle' : 'clay-glass-light-subtle';
  const innerCardBgClass = isDark ? 'bg-neutral-950/60 border border-white/[0.03]' : 'bg-slate-100/50 border border-slate-200/40';
  const roseTextClass = isDark ? 'text-rose-400' : 'text-rose-700';

  // Dynamic values based on current shade choice
  const mappedColor = color.accent.startsWith('emerald') || color.accent === '#10B981' ? 'emerald' : 'amber';
  
  const getAccentConfig = (colorKey: 'emerald' | 'amber') => {
    if (colorKey === 'emerald') {
      return {
        badge: isDark ? 'bg-emerald-500/15 text-[#00ff88] border border-emerald-500/20' : 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/15',
        textAccent: isDark ? 'text-emerald-400' : 'text-[#047857]',
        textAccentArabic: isDark ? 'text-emerald-300' : 'text-emerald-850',
        ring: isDark ? 'ring-emerald-500/20' : 'ring-emerald-500/15',
        glow1: 'bg-emerald-500/10',
        glow2: 'bg-teal-500/5'
      };
    } else {
      return {
        badge: isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-amber-500/10 text-amber-800 border border-amber-500/15',
        textAccent: isDark ? 'text-amber-400' : 'text-amber-800',
        textAccentArabic: isDark ? 'text-amber-300' : 'text-amber-850',
        ring: isDark ? 'ring-amber-500/20' : 'ring-amber-500/15',
        glow1: 'bg-amber-500/10',
        glow2: 'bg-yellow-500/5'
      };
    }
  };

  const acts = getAccentConfig(mappedColor);
  const fitrEnabled = timings.eid_fitr_enabled !== undefined ? timings.eid_fitr_enabled : timings.eid_enabled;
  const adhaEnabled = timings.eid_adha_enabled !== undefined ? timings.eid_adha_enabled : timings.eid_enabled;
  const hasEidEnabled = fitrEnabled || adhaEnabled;

  return (
    <div className={`space-y-5 pb-2 ${textDarkClass}`}>

      {/* Eid Mubarak Congregatory Card if enabled, shown on top as static schedule */}
      {hasEidEnabled && (
        <div className="space-y-2.5 text-left mb-2">
          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`p-5 rounded-[2.3rem] ${currentClayClass} ${isDark ? '' : ''} border transition-all relative overflow-hidden group`}
          >
            <div className={`absolute top-[-30%] right-[-10%] w-32 h-32 rounded-full ${isDark ? 'bg-amber-500/10' : 'bg-amber-500/5'} filter blur-2xl pointer-events-none`} />
            
            <div className="flex items-center justify-between border-b pb-2.5 mb-2.5 border-amber-500/10">
              <div className="flex items-center gap-2 select-none">
                <Calendar className="w-5 h-5 text-amber-500 animate-bounce" />
                <div>
                  <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-850'}`}>
                    {lang === 'ur' ? 'عید مبارک اجتماعات کے اوقات' : lang === 'hi' ? 'ईद मुबारक असेंबली टाइमिंग्स' : 'Mubarak Eid Assemblies Timings'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {lang === 'ur' ? 'مسجد عید اجتماعات کا شیڈول' : lang === 'hi' ? 'मस्जिद ईद असेंबली शेड्यूल' : 'Mosque Eid Assemblies Schedule'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5 select-none font-mono">
              {fitrEnabled && (
                <div className={`${innerCardBgClass} p-3 rounded-2xl text-center space-y-0.5 shadow-inner`}>
                  <span className={`text-[8px] font-black block uppercase tracking-widest ${textMutedClass}`}>{dict.eidulfitr || 'EID-UL-FITR'}</span>
                  <strong className={`text-md sm:text-lg font-black leading-tight ${textDarkClass}`}>{timings.eidulfitr ? loc(timings.eidulfitr) : '06:30 AM'}</strong>
                </div>
              )}
              {adhaEnabled && (
                <div className={`${innerCardBgClass} p-3 rounded-2xl text-center space-y-0.5 shadow-inner`}>
                  <span className={`text-[8px] font-black block uppercase tracking-widest ${textMutedClass}`}>{dict.eiduladha || 'EID-UL-ADHA'}</span>
                  <strong className={`text-md sm:text-lg font-black leading-tight ${textDarkClass}`}>{timings.eiduladha ? loc(timings.eiduladha) : '06:45 AM'}</strong>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* 1. Header widget grid: Current and Upcoming active Namaz times side by side */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-stretch select-none">
        
        {/* Current Active Namaz Card (Col Span: 4) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`col-span-1 md:col-span-4 rounded-[2.3rem] p-6 relative overflow-hidden flex flex-col justify-between ${currentClayClass} text-left min-h-[300px] ring-2 ${acts.ring}`}
        >
          {/* Ambient organic light spots that animate subtly */}
          <div className={`absolute top-[-20%] right-[-10%] w-56 h-56 rounded-full ${acts.glow1} filter blur-[40px] pointer-events-none select-none animate-pulse`} />
          <div className={`absolute bottom-[-10%] left-[-15%] w-48 h-48 rounded-full ${acts.glow2} filter blur-[45px] pointer-events-none select-none`} />

          <div className="flex justify-between items-center mb-4 relative z-10">
            <span className={`text-[9px] font-black uppercase tracking-widest font-mono px-3 py-1 rounded-full ${acts.badge}`}>
              {dict.current_prayer || 'CURRENT ACTIVE'}
            </span>
            
            {isJamatActive && (
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="px-3 py-1 rounded-full text-[8px] font-black font-mono tracking-wider bg-rose-500 text-white border border-rose-450 shadow-md flex items-center gap-1"
              >
                <Users className="w-3 h-3" />
                NAMAZ TIME NOW
              </motion.div>
            )}
          </div>

          <div className="space-y-4 relative z-10 w-full mt-auto">
            <div className="flex items-baseline gap-3 pb-2 border-b border-black/[0.05] dark:border-white/[0.05]">
              <h3 className={`text-4xl font-bold uppercase tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {getPrayerName(currentId)}
              </h3>
              <span className={`text-lg font-medium ${
                isDark ? 'text-amber-400/80' : 'text-amber-700/80'
              }`}>
                {getPrayerArabic(currentId)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Azan Section */}
              <div className="flex flex-col justify-center">
                <span className={`text-[8px] font-black uppercase tracking-widest font-mono mb-1 ${textMutedClass}`}>
                  🔔 AZAN TIMING
                </span>
                <strong className={`text-2xl font-black font-mono tracking-tight leading-none ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  {currentPrayerData ? loc(currentPrayerData.azan) : '--:--'}
                </strong>
              </div>

              {/* Jamat Section */}
              <div className="flex flex-col justify-center">
                <span className={`text-[8px] font-black uppercase tracking-widest font-mono mb-1 ${
                  isJamatActive ? 'text-amber-400 font-extrabold' : textMutedClass
                }`}>
                  🕌 NAMAZ / JAMAT
                </span>
                <strong className={`text-2xl font-black font-mono tracking-tight leading-none ${
                  isJamatActive ? 'text-amber-400 animate-pulse font-extrabold' : textDarkClass
                }`}>
                  {currentPrayerData ? loc(currentPrayerData.jamat) : '--:--'}
                </strong>
              </div>
            </div>

            <div className={`p-3 rounded-[1.5rem] flex items-center justify-between transition-all ${innerCardBgClass}`}>
              <div className="flex items-center gap-2">
                <Hourglass className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className={`text-[8.5px] font-black uppercase font-mono block ${textMutedClass}`}>Duration Window</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono font-black">
                <span className={textMutedLightClass}>{currentPrayerData?.start ? loc(currentPrayerData.start) : '--:--'}</span>
                <span className="text-slate-400 font-normal">→</span>
                <span className={roseTextClass}>{currentPrayerData?.end ? loc(currentPrayerData.end) : '--:--'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upcoming Namaz Frame (Col Span: 2) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`col-span-1 md:col-span-2 rounded-[2.3rem] p-6 relative overflow-hidden flex flex-col justify-between ${upcomingClayClass} text-left min-h-[300px]`}
        >
          <div className="space-y-3 relative z-10 w-full mb-auto">
            <div className="flex justify-between items-center">
              <span className={`text-[9px] font-black uppercase tracking-widest font-mono ${isDark ? 'text-slate-400' : 'text-slate-550'}`}>
                ⏱️ {dict.upcoming_prayer || 'UPCOMING PRAYER'}
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            
            <div className="flex items-baseline justify-between pt-1">
              <h4 className={`text-3xl font-black uppercase tracking-tighter ${textDarkClass} leading-none`}>
                {nextPrayerName}
              </h4>
              <span className={`text-2xl font-extrabold font-serif ${isDark ? 'text-slate-400' : 'text-slate-550'} leading-none`}>
                {nextPrayerArabic}
              </span>
            </div>
          </div>

          <div className="space-y-2 my-4 relative z-10">
            <div className={`p-3 rounded-2xl flex items-center justify-between transition-all ${innerCardBgClass}`}>
              <span className={`text-[8px] font-black uppercase tracking-widest font-mono ${textMutedClass}`}>🔔 Next Azan</span>
              <strong className={`text-xs font-black font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {nextPrayerData?.azan ? loc(nextPrayerData.azan) : '--:--'}
              </strong>
            </div>

            <div className={`p-3 rounded-2xl flex items-center justify-between transition-all ${innerCardBgClass}`}>
              <span className={`text-[8px] font-black uppercase tracking-widest font-mono ${textMutedClass}`}>🕌 JAMA'AT</span>
              <strong className={`text-xs font-black font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {nextPrayerData?.jamat ? loc(nextPrayerData.jamat) : '--:--'}
              </strong>
            </div>
          </div>

          <div className={`relative z-10 overflow-hidden rounded-[1.8rem] p-4 border ${
            isDark ? 'border-amber-500/15 bg-black/40' : 'border-slate-205 bg-slate-55/60 shadow-xs'
          } flex flex-col items-center justify-center text-center`}>
            <span className={`text-[8px] font-mono font-black uppercase tracking-widest ${isDark ? 'text-amber-505' : 'text-slate-500'} mb-1`}>
              COUNTDOWN
            </span>
            <span className={`font-mono text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${
              isDark ? 'from-amber-400 to-yellow-200' : 'from-slate-900 to-slate-800'
            }`}>
              {countdownStr ? loc(countdownStr) : '--:--'}
            </span>
          </div>
        </motion.div>

      </div>

      {/* 2. SOLAR TIMINGS & HOLY CALENDAR BENTO BOX (Sunrise, Sunset, Midday) */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className={`p-5 rounded-[2.3rem] ${currentClayClass} select-none border ${
          isDark ? 'border-white/5' : 'border-slate-200/55 shadow-xs'
        } backdrop-blur-3xl text-left relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.02] rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-black/[0.04] dark:border-white/[0.04] pb-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-500">
              ☀️ SOLAR TIMINGS & DAY PERIODS
            </span>
            <span className="text-[9px] font-black font-mono text-slate-400">DHULE REGION</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Sunrise Section */}
            <div className={`p-3 rounded-2xl flex flex-col justify-center items-center shadow-xs ${innerCardBgClass}`}>
              <span className={`text-[8px] font-black tracking-widest uppercase block font-mono ${textMutedClass}`}>
                🌄 SUNRISE
              </span>
              <strong className={`text-md font-black font-mono block mt-1 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                {timings.sunrise ? loc(timings.sunrise) : '--:--'}
              </strong>
              <span className={`text-[10px] font-bold font-serif block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                طلوعِ آفتاب
              </span>
            </div>

            {/* Midday Section */}
            <div className={`p-3 rounded-2xl flex flex-col justify-center items-center shadow-xs ${innerCardBgClass}`}>
              <span className={`text-[8px] font-black tracking-widest uppercase block font-mono ${acts.textAccent}`}>
                ☀️ MIDDAY (ZAWAL)
              </span>
              <strong className={`text-md font-black font-mono block mt-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                {timings.midday ? loc(timings.midday) : '--:--'}
              </strong>
              <span className={`text-[10px] font-bold font-serif block mt-0.5 ${isDark ? 'text-slate-350' : 'text-slate-555'}`}>
                زوالِ آفتاب
              </span>
            </div>

            {/* Sunset Section */}
            <div className={`p-3 rounded-2xl flex flex-col justify-center items-center shadow-xs ${innerCardBgClass}`}>
              <span className={`text-[8px] font-black tracking-widest uppercase block font-mono ${roseTextClass}`}>
                🌇 SUNSET
              </span>
              <strong className={`text-md font-black font-mono block mt-1 ${roseTextClass}`}>
                {timings.sunset ? loc(timings.sunset) : '--:--'}
              </strong>
              <span className={`text-[10px] font-bold font-serif block mt-0.5 ${roseTextClass}`}>
                غروبِ آفتاب
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. DAILY NAMAZ TIMETABLE SCHEDULES CARD */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 text-left"
      >
        <div className="flex justify-between items-center px-2 select-none">
          <span className={`text-[10px] font-black uppercase font-mono tracking-wider block ${textMutedClass}`}>
            Daily Namaz Timetable Schedules
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowShareModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase font-sans tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shadow-xs ${
              isDark 
                ? 'border-white/[0.06] text-amber-500 bg-white/[0.01]' 
                : 'border-slate-202 text-slate-800 bg-slate-50 hover:bg-slate-100 shadow-sm shadow-slate-100/30'
            }`}
            title="Share Timetable"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-505" />
            <span>{lang === 'ur' ? 'شیئر کریں' : 'Share'}</span>
          </button>
        </div>

        <div className={`rounded-[2.2rem] ${currentClayClass} overflow-hidden divide-y ${
          isDark ? 'divide-white/[0.06]' : 'divide-slate-200'
        } ${isDark ? '' : 'shadow-xl'} flex flex-col justify-between`}>
          {prayersList.map((item, index) => {
            const isActive = currentId === item.id;
            const pmData = timings[item.id];
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedNamaz(item.id)}
                className={`p-4 flex items-center justify-between gap-4 transition-all cursor-pointer hover:bg-amber-500/5 active:scale-[0.98] ${
                  isActive 
                    ? (isDark ? 'bg-emerald-500/[0.08]' : 'bg-[#00ff88]/10') 
                    : listHoverClass
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                    isActive 
                      ? 'bg-[#00ff88]/15 text-emerald-500 border-emerald-500/20' 
                      : (isDark ? 'bg-black/30 text-slate-400 border-white/[0.04]' : 'bg-slate-55 text-slate-655 border-slate-250')
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 leading-tight">
                      <span className={`text-sm font-black uppercase tracking-tight ${textDarkClass}`}>
                        {getPrayerName(item.id)}
                      </span>
                      {isActive && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#00ff88]' : 'bg-emerald-650'}`} />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <span className={`text-xs font-bold font-serif leading-none block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {getPrayerArabic(item.id)}
                      </span>
                      {item.id === 'juma' && (
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-500 font-mono leading-none">
                          {lang === 'ur' ? 'صرف جمعہ کے دن' : 'Friday Only'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3 select-none font-mono">
                  <div className="flex flex-col justify-center items-end leading-none">
                    <span className={`text-xl font-black tracking-tighter ${
                      isActive 
                        ? (isDark ? 'text-emerald-400 font-black' : 'text-emerald-800 font-extrabold') 
                        : textDarkClass
                    }`}>
                      {pmData?.jamat ? loc(pmData.jamat) : '--:--'}
                    </span>
                    <span className={`text-[9px] font-bold mt-1 ${textMutedClass}`}>
                      AZAN: <strong className={isDark ? 'text-emerald-400' : 'text-emerald-800'}>{pmData?.azan ? loc(pmData.azan) : '--:--'}</strong>
                    </span>
                  </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? (isDark ? 'text-emerald-400' : 'text-slate-705') : 'text-slate-405'
                }`} />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>

    {/* 5. RAMADAN / ROZA TIMINGS & SUPPLICATIONS DISPLAY */}
    { (timings.sahr || timings.iftar) && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 text-left"
      >
        <span className={`text-[10px] font-black uppercase font-mono tracking-wider block px-2 select-none ${textMutedClass}`}>
          Ramadan / Fasting Timings & Duas Directory
        </span>

        <div className={`p-6 rounded-[2.2rem] ${currentClayClass} flex flex-col space-y-6 ${isDark ? '' : ''} border relative overflow-hidden`}>
          
          <div className={`absolute top-1/2 right-[-10%] w-40 h-40 rounded-full filter blur-[50px] opacity-15 pointer-events-none select-none ${
            isDark ? 'bg-amber-400' : 'bg-amber-300'
          }`} />

          {/* Sahar Block */}
          <div className="space-y-3 relative z-10">
            <div className={`flex justify-between items-center select-none pb-1.5 border-b ${dividerClass}`}>
              <span className={`text-[10px] font-black tracking-widest uppercase font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-805'} flex items-center gap-1.5`}>
                SAHAR TIMING
              </span>
              <strong className={`text-2xl font-black font-mono ${textDarkClass}`}>
                {timings.sahr ? loc(timings.sahr) : '--:--'}
              </strong>
            </div>
            <div className={`p-4 rounded-2xl text-right space-y-1 ${innerCardBgClass} ${isDark ? '' : 'shadow-inner'}`}>
              <span className={`text-[8px] font-black block text-left font-mono tracking-widest leading-none select-none ${isDark ? 'text-emerald-400/80' : 'text-emerald-805'}`}>
                SAHAR DUA
              </span>
              <p className={`text-xl md:text-2xl font-extrabold font-serif leading-relaxed select-all ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`} dir="rtl">
                وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانْ
              </p>
              <p className={`text-[10px] font-sans text-left leading-normal pt-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {dict.sahar_dua_translation}
              </p>
            </div>
          </div>

          {/* Iftar Block */}
          <div className="space-y-3 relative z-10">
            <div className={`flex justify-between items-center select-none pb-1.5 border-b ${dividerClass}`}>
              <span className={`text-[10px] font-black tracking-widest uppercase font-mono ${isDark ? 'text-amber-455' : 'text-amber-805'} flex items-center gap-1.5`}>
                IFTAR TIMING
              </span>
              <strong className={`text-2xl font-black font-mono ${textDarkClass}`}>
                {timings.iftar ? loc(timings.iftar) : '--:--'}
              </strong>
            </div>
            <div className={`p-4 rounded-2xl text-right space-y-1 ${innerCardBgClass} ${isDark ? '' : 'shadow-inner'}`}>
              <span className={`text-[8px] font-black block text-left font-mono tracking-widest leading-none select-none ${isDark ? 'text-amber-450' : 'text-amber-855'}`}>
                IFTAR DUA
              </span>
              <p className={`text-xl md:text-2xl font-extrabold font-serif leading-relaxed select-all ${isDark ? 'text-amber-300' : 'text-amber-805'}`} dir="rtl">
                اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ
              </p>
              <p className={`text-[10px] font-sans text-left leading-normal pt-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {dict.iftar_dua_translation}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    )}

    {/* 6. TAKE ME TO MASJID & VISUAL MAP PREVIEW */}
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.16 }}
      className={`p-6 rounded-[2.3rem] ${currentClayClass} border ${
        isDark ? 'border-white/5' : 'border-slate-200 shadow-xl'
      } backdrop-blur-3xl text-left relative overflow-hidden space-y-4`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.02] rounded-full filter blur-2xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row gap-5 items-stretch justify-between">
        
        {/* Address & Option Info */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#00ff88]">
              📍 MASJID LOCATION DIRECTIONS
            </span>
            <h3 className={`text-2xl font-black tracking-tight ${textDarkClass}`}>
              {lang === 'ur' ? 'مسجد عائشہ قباء' : lang === 'hi' ? 'मस्जिद ए कुबा (धुलिया)' : 'Masjid E Quba'}
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
              <strong>Address:</strong> Mulla Nagar, Near Akbar Akbar Chowk, Dhule, Maharashtra 424001, India
            </p>
          </div>

          <a
            href="https://maps.app.goo.gl/aSRUBRVjLS6hto8Y9"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-500 text-neutral-900 font-extrabold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 shadow-md shadow-amber-500/10 hover:bg-amber-400`}
          >
            <Navigation className="w-4 h-4" />
            {lang === 'ur' ? 'مسجد کا راستہ (Take me to Masjid)' : lang === 'hi' ? 'मस्जिद मार्ग (Take me to Masjid)' : 'Take me to Masjid'}
          </a>
        </div>

        {/* Miniature Map Visualizer Box */}
        <MasjidMap isDark={isDark} />

      </div>
    </motion.div>

      {/* 8. Interactive Modals using AnimatePresence */}
      <AnimatePresence>
        {selectedNamaz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNamaz(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full max-w-md rounded-[2.5rem] p-7 border relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ${
                isDark 
                  ? 'bg-neutral-900/95 border-white/[0.08] text-white shadow-emerald-500/5' 
                  : 'bg-white border-slate-205 text-slate-900 shadow-slate-200/50'
              }`}
            >
              {/* Soft decorative background circles */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 filter blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-emerald-400/10 filter blur-2xl pointer-events-none" />

              {/* Close button */}
              <button 
                onClick={() => setSelectedNamaz(null)}
                className={`absolute top-5 right-5 w-8 h-8 rounded-full border flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${
                  isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-slate-350' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Details */}
              <div className="text-center select-none mt-2 pb-5 border-b border-black/[0.05] dark:border-white/[0.05] mb-5">
                <span className={`text-[9px] font-black uppercase tracking-widest font-mono px-3 py-1 rounded-full ${
                  isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/15' : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                }`}>
                  🕌 NAMAZ DETAIL INFORMATION
                </span>
                
                <h3 className="text-3xl font-black font-serif tracking-tight mt-3 mb-1">
                  {getPrayerName(selectedNamaz)}
                </h3>
                <span className="text-2.5xl font-extrabold font-serif text-amber-505 block leading-none">
                  {getPrayerArabic(selectedNamaz)}
                </span>
              </div>

              {/* Timing Display Panels */}
              <div className="grid grid-cols-2 gap-4 mb-5 select-none font-mono">
                <div className={`p-4 rounded-2xl text-center shadow-inner ${innerCardBgClass}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${textMutedClass}`}>🔔 AZAN TIME</span>
                  <strong className={`text-xl font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                    {timings[selectedNamaz]?.azan || '--:--'}
                  </strong>
                </div>

                <div className={`p-4 rounded-2xl text-center shadow-inner border border-amber-500/15 ${innerCardBgClass}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 text-amber-505`}>🕌 JAMA'AT TIME</span>
                  <strong className={`text-xl font-black text-amber-550`}>
                    {timings[selectedNamaz]?.jamat || '--:--'}
                  </strong>
                </div>
              </div>

              {/* Spiritual Significance & Virtue */}
              <div className="space-y-1.5 text-left mb-6 select-none">
                <span className="text-[8.5px] font-black uppercase tracking-widest font-mono block text-emerald-500">
                  ✨ SPIRITUAL VIRTUE & IMPORTANCE
                </span>
                <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {PRAYERS_MUTED_META[selectedNamaz]?.[lang]?.virtue || PRAYERS_MUTED_META[selectedNamaz]?.en?.virtue}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setSelectedNamaz(null)}
                className={`w-full py-4 rounded-2xl font-black font-sans text-xs tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer text-center bg-amber-500 text-neutral-900 shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/15`}
              >
                {dict.btn_close || 'Understand & Close'}
              </button>
            </motion.div>
          </div>
        )}

        {selectedDua && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDua(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full max-w-lg rounded-[2.5rem] p-8 border relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ${
                isDark 
                  ? 'bg-neutral-900/95 border-white/[0.08] text-white shadow-amber-500/5' 
                  : 'bg-white border-slate-205 text-slate-900 shadow-slate-200/50'
              }`}
            >
              {/* Soft decorative background circles */}
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-500/10 filter blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-amber-500/10 filter blur-3xl pointer-events-none" />

              {/* Close button */}
              <button 
                onClick={() => setSelectedDua(null)}
                className={`absolute top-5 right-5 w-8 h-8 rounded-full border flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-10 ${
                  isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-slate-350' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Title */}
              <div className="text-center select-none pb-4 border-b border-black/[0.05] dark:border-white/[0.05] mb-6">
                <span className={`text-[9px] font-black uppercase tracking-widest font-mono px-3 py-1 rounded-full ${
                  isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/15' : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                }`}>
                  ✨ RAMADAN (RAMAZAN) SUPPLICATION
                </span>
                
                <h3 className="text-2.5xl font-black font-serif tracking-tight mt-3 mb-1">
                  {selectedDua === 'sahar' ? (dict.sahar_dua_title || 'Sehri Dua (Dua for Fasting)') : (dict.iftar_dua_title || 'Iftar Dua (Dua for Breaking Fast)')}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  {selectedDua === 'sahar' ? `Sahar Supplication Timing: ${timings.sahr || '--:--'}` : `Iftar Supplication Timing: ${timings.iftar || '--:--'}`}
                </p>
              </div>

              {/* Arabic Script Declamation Section - CLEAR & DRAMATIC */}
              <div className={`p-6 rounded-[2rem] text-center space-y-4 mb-5 border relative overflow-hidden select-all ${
                isDark ? 'bg-black/40 border-emerald-500/15 shadow-inner' : 'bg-slate-50/75 border-slate-205'
              }`}>
                {/* Visualizer rings pulsing dramatically while active */}
                {isDuaPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] dark:opacity-[0.10]">
                    <span className="w-32 h-32 rounded-full border-4 border-amber-500 animate-ping absolute" />
                    <span className="w-48 h-48 rounded-full border-4 border-emerald-500 animate-ping absolute duration-1000" />
                    <span className="w-64 h-64 rounded-full border-4 border-amber-400 animate-ping absolute duration-1500" />
                  </div>
                )}

                <div className="relative z-10 space-y-4">
                  <span className={`text-[8px] font-black tracking-widest uppercase font-mono block text-center ${isDark ? 'text-emerald-400/80' : 'text-emerald-805'}`}>
                    ORIGINAL SACRED ARABIC
                  </span>
                  <p 
                    className={`text-2xl md:text-3xl font-extrabold font-serif leading-loose tracking-wide text-amber-600 dark:text-amber-400`} 
                    dir="rtl"
                  >
                    {selectedDua === 'sahar' ? 'وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانْ' : 'اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ'}
                  </p>
                </div>
              </div>

              {/* Transliteration Declamation Segment */}
              <div className="text-left space-y-1 mb-4 select-none">
                <span className="text-[8.5px] font-black uppercase tracking-widest font-mono text-emerald-500">
                  🎙️ TRANSLITERATION READING
                </span>
                <p className={`text-xs leading-relaxed font-semibold italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {selectedDua === 'sahar' ? (dict.sahar_dua_trans || 'Wa bi sawmi ghadinn nawaiytu min shahri ramadan.') : (dict.iftar_dua_trans || "Allahumma inni laka sumtu wa bika aamantu wa 'alayka tawakkaltu wa 'ala rizqika aftartu.")}
                </p>
              </div>

              {/* Translations segment */}
              <div className="text-left space-y-1 mb-6 select-none">
                <span className="text-[8.5px] font-black uppercase tracking-widest font-mono text-amber-500">
                  📖 MEANING & MEANING TRANSLATION
                </span>
                <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {selectedDua === 'sahar' ? dict.sahar_dua_translation : dict.iftar_dua_translation}
                </p>
              </div>

              {/* PLAYER CONTROLLER PANEL */}
              <div className={`p-4 rounded-2xl border flex flex-row items-center justify-between gap-4 mb-6 relative z-10 select-none ${
                isDark ? 'bg-black/35 border-white/[0.04]' : 'bg-slate-100/70 border-slate-200'
              }`}>
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePlayDua(selectedDua!)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-neutral-900 transition-all hover:scale-105 active:scale-[0.94] shadow-md cursor-pointer ${
                      isDuaPlaying 
                        ? 'bg-amber-500 ring-4 ring-amber-500/25' 
                        : 'bg-[#00ff88] text-slate-900 ring-4 ring-emerald-500/15 font-black'
                    }`}
                  >
                    {isDuaPlaying ? (
                      <Pause className="w-5.5 h-5.5 text-neutral-900 fill-neutral-900" />
                    ) : (
                      <Play className="w-5.5 h-5.5 text-slate-950 fill-slate-950 ml-0.5" />
                    )}
                  </button>
                  
                  <div className="text-left leading-normal">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className={`text-xs font-black uppercase tracking-wider font-mono ${textDarkClass}`}>
                        {isDuaPlaying ? 'Now Reciting' : 'Voice Instruction'}
                      </span>
                    </div>
                    <p className={`text-[10px] font-mono ${textMutedClass} mt-0.5`}>
                      {isDuaPlaying ? 'Interactive Arabic Synthesis...' : 'Listen to beautiful correct Arabic'}
                    </p>
                  </div>
                </div>

                {/* Animated visualizer bars or sound waves */}
                <div className="flex items-end gap-1 h-5 w-16 px-1">
                  {[1, 2, 3, 4, 5, 6].map((bar) => (
                    <motion.span
                      key={bar}
                      animate={isDuaPlaying ? {
                        height: [8, 20, 6, 16, 10, 22, 8][(bar + Math.floor(Math.random()*4)) % 7],
                      } : { height: 6 }}
                      transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 0.4 + bar * 0.08,
                      }}
                      className={`w-1 rounded-sm ${isDuaPlaying ? 'bg-amber-500' : 'bg-slate-400 opacity-40'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedDua(null)}
                className={`w-full py-4 rounded-2xl font-black font-sans text-xs tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer text-center bg-amber-500 text-neutral-900 shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/15`}
              >
                {dict.btn_close || 'Close Panel'}
              </button>
            </motion.div>
          </div>
        )}

        {showEidModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEidModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full max-w-lg rounded-[2.5rem] p-7 border relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] max-h-[90vh] overflow-y-auto ${
                isDark 
                  ? 'bg-neutral-900/95 border-white/[0.08] text-white shadow-amber-500/5' 
                  : 'bg-white border-slate-205 text-slate-900 shadow-slate-200/50'
              }`}
            >
              {/* Soft decorative background circles */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 filter blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-emerald-400/10 filter blur-2xl pointer-events-none" />

              {/* Close button */}
              <button 
                onClick={() => setShowEidModal(false)}
                className={`absolute top-5 right-5 w-8 h-8 rounded-full border flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-10 ${
                  isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-slate-350' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Details */}
              <div className="text-center select-none pb-4 border-b border-black/[0.05] dark:border-white/[0.05] mb-5">
                <span className={`text-[9px] font-black uppercase tracking-widest font-mono px-3 py-1 rounded-full ${
                  isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/15' : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                }`}>
                  🌙 EID RECITTALS & RULES
                </span>
                
                <h3 className="text-2.5xl font-black font-serif tracking-tight mt-3 mb-0.5">
                  {lang === 'ur' ? 'عید مبارک اجتماعات اور رہنما خطوط' : lang === 'hi' ? 'ईद मुबारक एवं नमाज़ विधि' : 'Eid Mubarak & Guidelines'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  {timings.eidulfitr ? `Eidul Fitr: ${loc(timings.eidulfitr)}` : ''} {timings.eiduladha ? ` | Eidul Adha: ${loc(timings.eiduladha)}` : ''}
                </p>
              </div>

              {/* 1. TAKBEER PLAY BLOCK */}
              <div className={`p-4 rounded-3xl border mb-5 select-none relative overflow-hidden ${
                isDark ? 'bg-black/30 border-amber-500/10' : 'bg-slate-50/70 border-slate-205'
              }`}>
                {isTakbeerPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] dark:opacity-[0.08]">
                    <span className="w-32 h-32 rounded-full border-4 border-amber-500 animate-ping absolute" />
                    <span className="w-48 h-48 rounded-full border-4 border-amber-400 animate-ping absolute duration-1000" />
                  </div>
                )}
                
                <span className="text-[8px] font-black uppercase tracking-widest font-mono text-amber-505 block mb-2">
                  🕌 EID-UL-FITR & ADHA TAKBEER (تکبیر عید)
                </span>

                <div className="text-center space-y-2 mb-3">
                  <p className="text-xl md:text-2xl font-extrabold font-serif text-amber-600 dark:text-amber-400 leading-normal" dir="rtl">
                    اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ لَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ
                  </p>
                  <p className={`text-[10px] font-mono leading-relaxed italic ${isDark ? 'text-slate-450' : 'text-slate-550'}`}>
                    Allahu Akbar, Allahu Akbar, La ilaha illallah, Allahu Akbar, Allahu Akbar, wa lillahil hamd.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04] pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePlayTakbeer}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-[0.94] cursor-pointer text-neutral-900 ${
                        isTakbeerPlaying ? 'bg-amber-500 ring-4 ring-amber-500/20' : 'bg-[#00ff88] text-slate-900 ring-4 ring-emerald-500/10'
                      }`}
                    >
                      {isTakbeerPlaying ? (
                        <Pause className="w-4.5 h-4.5 text-neutral-900 fill-neutral-900" />
                      ) : (
                        <Play className="w-4.5 h-4.5 text-slate-950 fill-slate-950 ml-0.5" />
                      )}
                    </button>
                    <div className="text-left">
                      <span className={`text-[10px] font-black uppercase font-mono block ${textDarkClass}`}>
                        {isTakbeerPlaying ? 'Streaming Chant' : 'Listen to Takbeer'}
                      </span>
                      <span className={`text-[8.5px] font-mono block ${textMutedClass}`}>
                        Beautiful spiritual Arabic audio
                      </span>
                    </div>
                  </div>

                  {/* Sync wave */}
                  {isTakbeerPlaying && (
                    <div className="flex items-end gap-0.5 h-4 px-1">
                      {[1, 2, 3, 4].map(b => (
                        <motion.span 
                          key={b}
                          animate={{ height: [6, 16, 4, 12, 6][(b+1)%5] }}
                          transition={{ repeat: Infinity, duration: 0.3 + b * 0.1, repeatType: "reverse" }}
                          className="w-0.75 bg-amber-500 rounded-sm"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. NAMAZ KA TARIKA WITH LANGUAGE TUNING */}
              <div className={`p-5 rounded-3xl border mb-6 text-left relative overflow-hidden ${
                isDark ? 'bg-black/25 border-emerald-500/10' : 'bg-slate-50/45 border-slate-205'
              }`}>
                <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-3 mb-4">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest font-mono text-emerald-500 block">
                      ✨ THE METHOD OF EID PRAYER
                    </span>
                    <h4 className={`text-sm font-black uppercase ${textDarkClass}`}>
                      Namaz Ka Tarika (नमाज़ का तरीका)
                    </h4>
                  </div>

                  {/* Speaker/Narraion Play triggers */}
                  <button
                    type="button"
                    onClick={() => handleTogglePlayTarika(tarikaLang)}
                    className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase font-mono transition-transform active:scale-95 cursor-pointer ${
                      isTarikaPlaying 
                        ? 'bg-amber-500 text-neutral-900 shadow-sm shadow-amber-500/20' 
                        : isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-201 text-slate-800'
                    }`}
                  >
                    {isTarikaPlaying ? (
                      <>
                        <Pause className="w-3 h-3 fill-current" />
                        Playing Instruction
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                        Play Audio
                      </>
                    )}
                  </button>
                </div>

                {/* Language Switchers */}
                <div className="flex items-center gap-1 px-1.5 py-1 bg-black/10 dark:bg-white/[0.02] rounded-2xl mb-4 border border-black/[0.03] dark:border-white/[0.03]">
                  {(['en', 'hi', 'ur'] as const).map((lKey) => {
                    const lLabel = { en: 'English', hi: 'हिंदी (Hindi)', ur: 'اردو (Urdu)' }[lKey];
                    const isActive = tarikaLang === lKey;
                    return (
                      <button
                        key={lKey}
                        onClick={() => {
                          setTarikaLang(lKey);
                          // if playing: stop it so we don't cross languages
                          if (isTarikaPlaying) {
                            window.speechSynthesis.cancel();
                            setIsTarikaPlaying(false);
                          }
                        }}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-amber-500 text-neutral-900 shadow-sm' 
                            : 'text-slate-400 hover:text-amber-500'
                        }`}
                      >
                        {lLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Instructions block */}
                <div className="space-y-3 font-medium text-xs leading-relaxed max-h-[170px] overflow-y-auto pr-1">
                  {tarikaLang === 'en' && (
                    <div className={`${isDark ? 'text-slate-300' : 'text-slate-700'} space-y-2.5`}>
                      <p><strong>1. Intention (Niyyah):</strong> “I intend to pray two Rakats Wajib Eid-ul-Fitr (or Eid-ul-Adha) with six extra Takbeeraat behind this Imam for Allah.”</p>
                      <p><strong>2. First Rakat:</strong> After the opening Fold (Takbeer-e-Tahreema), fold hands and read Sana (Subhanaka...). Imam will call three extra Takbeeraat. Raise hands to ears; drop them for 1st & 2nd, and fold them on the 3rd. Imam then recites Surah Al-Fatiha and a Surah. Complete Rakat normally.</p>
                      <p><strong>3. Second Rakat:</strong> Imam recites Quran. Before going to Rukoo, Imam calls three extra Takbeeraat. Raise hands to ears and let them drop for all three. On the 4th, go straight into Rukoo without raising hands. Complete Namaz and perform Salaam.</p>
                      <p><strong>4. Sermon (Khutbah):</strong> It is Wajib (obligatory) to sit quietly and listen to the Khutbah after Namaz completes.</p>
                    </div>
                  )}

                  {tarikaLang === 'hi' && (
                    <div className={`${isDark ? 'text-slate-300' : 'text-slate-700'} space-y-2.5 font-sans`}>
                      <p><strong>1. नीयत:</strong> "नीयत करता हूँ मैं दो रकात नماज़ वाजिब ईद-उल-फ़ित्र (या ईद-उल-अज़हा) की, छह ज़ायद (एक्स्ट्रा) तकबीरों के साथ, पीछे इस इमाम के, वास्ते अल्लाह तआला के।"</p>
                      <p><strong>2. पहली रकात:</strong> हाथ बाँधकर ख़ामोश रहें और 'सना' पढ़ें। इसके बाद इमाम साहब तीन बार अल्लाहु अकबर (ज़ायد तकबीर) कहेंगे। पहले दो तकबीर में हाथ कानों तक उठाकर खुले छोड़ दें, और तीसरे तकबीर में हाथ उठाकर नाफ़ के नीचे बाँध लें। इमाम साहब सूरह फ़ातिहा और दूसरी सूरह पढ़ेंगे। रकात सामान्य रूप से पूरी करें।</p>
                      <p><strong>3. दूसरी रकात:</strong> पहले इमाम साहब सूरह पढ़ेंगे। रुकू में जाने से पहले इमाम साहब फिर तीन बार अल्लाहु अकबर कहेंगे। तीनों तकबीर में हाथ कानों तक उठाकर खुले छोड़ देना है। चौथी तकबीर पर बिना हाथ उठाए सीधे रुकू में चले जाना है। नमाज़ आम तरीके से ख़त्म करके सलाम फेरें।</p>
                      <p><strong>4. ख़ुत्बा:</strong> नमाज़ ख़त्म होने के बाद ईद का ख़ुत्बा बिल्कुल खामोशी से सुनना वाजिब है।</p>
                    </div>
                  )}

                  {tarikaLang === 'ur' && (
                    <div className={`${isDark ? 'text-slate-300' : 'text-slate-700'} space-y-2.5 text-right font-serif text-[13px] leading-relaxed`} dir="rtl">
                      <p><strong>1. نیت:</strong> "میں نیت کرتا ہوں دو رکعت نماز واجب عید الفطر (یا عید الاضحیٰ) مع چھ زائد تکبیروں کے، پیچھے اس امام کے، خاص اللہ تعالیٰ کے لیے۔"</p>
                      <p><strong>2. پہلی رکعت:</strong> تکبیر تحریمہ کے بعد ہاتھ باندھ لیں اور ثنا پڑھیں۔ اس کے بعد امام تین زائد تکبیریں کہے گا۔ پہلی دو تکبیروں میں ہاتھ کانوں تک اٹھا کر چھوڑ دیں، تیسری تکبیر کے بعد ہاتھ اٹھا کر حسب معمول ناف کے نیچے باندھ لیں۔ امام قرات مکمل کرے گا اور رکوع سجدہ کرکے رکعت مکمل کریں۔</p>
                      <p><strong>3. دوسری رکعت:</strong> امام پہلے سورہ فاتحہ اور سورت پڑهے گا۔ رکوع میں جانے سے قبل امام تین زائد تکبیریں کہے گا۔ تکبیروں میں ہاتھ کانوں تک اٹھا کر چھوڑ دیں اور چوتھی تکبیر پر بغیر ہاتھ اٹھائے رکوع میں چلے جائیں۔ نماز مکمل کر کے سلام پھیریں۔</p>
                      <p><strong>4. خطبہ عید:</strong> نماز کے بعد عید کا خطبہ خاموشی اور توجہ سے سننا واجب ہے۔</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowEidModal(false)}
                className={`w-full py-4 rounded-2xl font-black font-sans text-xs tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer text-center bg-amber-500 text-neutral-900 shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/15`}
              >
                {lang === 'ur' ? 'سمجھے اور بند کریں' : lang === 'hi' ? 'समझ गए और बंद करें' : 'Understand & Close'}
              </button>
            </motion.div>
          </div>
        )}

        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full max-w-md rounded-[2.5rem] p-7 border relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ${
                isDark 
                  ? 'bg-neutral-900/95 border-white/[0.08] text-white shadow-emerald-500/5' 
                  : 'bg-white border-slate-205 text-slate-900 shadow-slate-200/50'
              }`}
            >
              {/* Soft decorative background circles */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 filter blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-emerald-400/10 filter blur-2xl pointer-events-none" />

              {/* Close button */}
              <button 
                onClick={() => setShowShareModal(false)}
                className={`absolute top-5 right-5 w-8 h-8 rounded-full border flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-10 ${
                  isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-slate-350' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Details */}
              <div className="text-center select-none pb-4 border-b border-black/[0.05] dark:border-white/[0.05] mb-6">
                <span className={`text-[9px] font-black uppercase tracking-widest font-mono px-3 py-1 rounded-full ${
                  isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/15' : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                }`}>
                  📢 SHARE DAILY TIMETABLE
                </span>
                
                <h3 className="text-2.5xl font-black font-serif tracking-tight mt-3 mb-1">
                  {lang === 'ur' ? 'شیئر ٹائم ٹیبل' : 'Share Timetable'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  {lang === 'ur' ? 'سوشل میڈیا اور واٹس ایپ کے لئے' : 'Formatted for WhatsApp & Social Media'}
                </p>
              </div>

              {/* Text Area Preview Section */}
              <div className="text-left space-y-1.5 mb-5">
                <span className="text-[8.5px] font-black uppercase tracking-widest font-mono block text-emerald-500">
                  📱 SMS / WHATSAPP TEXT PREVIEW
                </span>
                <div 
                  className={`p-4 rounded-2xl text-[11px] font-mono leading-relaxed max-h-48 overflow-y-auto border whitespace-pre-wrap ${
                    isDark ? 'bg-black/40 border-white/[0.05] text-slate-300' : 'bg-slate-55 border-slate-200 text-slate-700'
                  }`}
                >
                  {generateShareText()}
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="flex flex-col gap-3 mb-5">
                {/* Copy to Clipboard Trigger */}
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className={`w-full py-3.5 px-4 rounded-2xl font-black font-sans text-[11px] tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 border shadow-sm ${
                    copied
                      ? (isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-800')
                      : (isDark ? 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] text-white' : 'bg-slate-55 border-slate-200 hover:bg-slate-100 text-slate-800')
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500 animate-bounce" />
                      <span>{lang === 'ur' ? 'کاپی ہو گیا!' : 'Copied Success!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-500" />
                      <span>{lang === 'ur' ? 'کلپ بورڈ پر کاپی کریں' : 'Copy to Clipboard'}</span>
                    </>
                  )}
                </button>

                {/* Native OS Share trigger */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-3.5 px-4 rounded-2xl font-black font-sans text-[11px] tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 bg-amber-500 text-neutral-900 shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/15"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{lang === 'ur' ? 'دیگر ایپس پر شیئر کریں' : 'Share via Apps'}</span>
                </button>
              </div>

              {/* Secondary Close actions */}
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className={`w-full py-3.5 rounded-2xl font-black font-sans text-[10px] tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer text-center border ${
                  isDark ? 'border-white/[0.05] text-slate-400 bg-white/[0.01] hover:bg-white/[0.05]' : 'border-slate-205 text-slate-600 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {lang === 'ur' ? 'بند کریں' : 'Cancel & Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
