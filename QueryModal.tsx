/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { AppLanguage, QuerySubmission } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, User, Smartphone, MapPin, Send, HelpCircle, Trash2 } from 'lucide-react';

interface QueryModalProps {
  lang: AppLanguage;
  isDark?: boolean;
}

interface SavedQuery extends QuerySubmission {
  id: number;
  timestamp: number;
}

export default function QueryModal({ lang, isDark = true }: QueryModalProps) {
  const [form, setForm] = useState<QuerySubmission>({
    name: '',
    mobile: '',
    address: '',
    query: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<SavedQuery[]>([]);

  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Load queries history on mount
  useEffect(() => {
    loadHistory();
  }, [submitted]);

  const loadHistory = () => {
    const existing = localStorage.getItem('mq_queries');
    if (existing) {
      try {
        setHistory(JSON.parse(existing));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const deleteQuery = (id: number) => {
    const updated = history.filter(q => q.id !== id);
    localStorage.setItem('mq_queries', JSON.stringify(updated));
    setHistory(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Field audits
    if (!form.name.trim() || !form.mobile.trim() || !form.address.trim() || !form.query.trim()) {
      setErrorMsg(dict.form_validation || 'Please fill in all inputs.');
      return;
    }

    if (form.mobile.trim().length < 10) {
      setErrorMsg(lang === 'ur' ? 'برائے مہربانی درست ۱۰ ہندسی موبائل نمبر درج کریں' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // Capture standard submission in database mock / REST sync simulation
    console.log("Submitting query to Mosque Administration:", form);

    // Save locally
    const existing = localStorage.getItem('mq_queries');
    const list = existing ? JSON.parse(existing) : [];
    list.unshift({ ...form, id: Date.now(), timestamp: Date.now() });
    localStorage.setItem('mq_queries', JSON.stringify(list));

    setSubmitted(true);
    setForm({ name: '', mobile: '', address: '', query: '' });
  };

  const isRtl = lang === 'ur' || lang === 'ar';
  
  const textDarkClass = isDark ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-600 font-semibold';
  const inputBgClass = isDark ? 'bg-black/40 border-white/[0.05] divide-white/[0.04]' : 'bg-slate-50 border-slate-200 divide-slate-100 shadow-inner';
  const inputTextClass = isDark ? 'text-slate-100' : 'text-slate-800';
  const placeholderClass = isDark ? 'placeholder:text-slate-650' : 'placeholder:text-slate-400';
  const formCardBg = isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm';
  const saveCardBg = isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-150';

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-w-md mx-auto border p-8 rounded-[2.5rem] shadow-2xl text-center font-sans space-y-6 ${
          isDark ? 'bg-slate-900 border-white/[0.08]' : 'bg-white border-slate-200'
        }`}
      >
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-4xl text-emerald-500 mx-auto shadow-lg shadow-emerald-500/10 select-none">
          ✓
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-emerald-500">Jazak-Allah Khair!</h3>
          <p className={`text-sm leading-relaxed max-w-sm mx-auto font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {dict.form_success || 'Your query has been submitted successfully to Mosque Administration.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className={`px-6 py-3.5 border font-bold text-xs rounded-2xl active:scale-95 transition-all w-full select-none ${
            isDark ? 'bg-white/10 hover:bg-white/15 text-white border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-250'
          }`}
        >
          {lang === 'ur' ? 'مزید سوال ارسال کریں' : 'Submit Another Query / View Logs'}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 font-sans">
      
      {/* iOS Contact Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-sm">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 mt-1">
          <h2 className={`text-xl font-black tracking-tight uppercase select-none ${textDarkClass}`}>
            {dict.query_title}
          </h2>
          <p className={`text-xs max-w-xs mx-auto leading-relaxed ${textMutedClass}`}>
            {dict.query_sub}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`border backdrop-blur-xl p-5 rounded-[2.2rem] space-y-4 shadow-xl ${formCardBg}`}>
        
        {/* iOS Styled Error Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600 overflow-hidden"
            >
              ⚠ {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Fields: iOS Rounded Grouped Look */}
        <div className={`rounded-2xl border overflow-hidden divide-y ${inputBgClass}`}>
          
          {/* Input 1: Name */}
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 select-none sm:w-1/3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <User className="w-3.5 h-3.5 text-slate-500" /> {dict.form_name} *
            </span>
            <input
              type="text"
              placeholder={lang === 'ur' ? 'مثال: عبداللہ خان' : "e.g. Abdullah Khan"}
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full sm:w-2/3 bg-transparent p-1 border-0 focus:ring-0 text-sm font-semibold transition-all outline-none ${inputTextClass} ${placeholderClass} ${isRtl ? 'text-right font-serif' : 'text-left'}`}
            />
          </div>

          {/* Input 2: Mobile */}
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 select-none sm:w-1/3 font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Smartphone className="w-3.5 h-3.5 text-slate-500" /> {dict.form_mobile} *
            </span>
            <input
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={form.mobile}
              onChange={(e) => setForm(prev => ({ ...prev, mobile: e.target.value }))}
              className={`w-full sm:w-2/3 bg-transparent p-1 border-0 focus:ring-0 text-sm font-bold font-mono transition-all outline-none ${inputTextClass} ${placeholderClass} ${isRtl ? 'text-right' : 'text-left'}`}
            />
          </div>

          {/* Input 3: Address */}
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 select-none sm:w-1/3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> {dict.form_address} *
            </span>
            <input
              type="text"
              placeholder={lang === 'ur' ? 'محلہ / علاقہ' : "Area / Neighborhood"}
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              className={`w-full sm:w-2/3 bg-transparent p-1 border-0 focus:ring-0 text-sm font-semibold transition-all outline-none ${inputTextClass} ${placeholderClass} ${isRtl ? 'text-right font-serif' : 'text-left'}`}
            />
          </div>

          {/* Input 4: Textarea Question */}
          <div className="p-3.5 flex flex-col gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 select-none ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> {dict.form_msg} *
            </span>
            <textarea
              rows={3}
              placeholder={lang === 'ur' ? 'اپنا سوال یہاں لکھیں...' : "Type your question or query here..."}
              value={form.query}
              onChange={(e) => setForm(prev => ({ ...prev, query: e.target.value }))}
              className={`w-full bg-transparent p-1 border-0 focus:ring-0 text-xs font-semibold transition-all outline-none resize-none ${inputTextClass} ${placeholderClass} ${isRtl ? 'text-right font-serif' : 'text-left'}`}
            />
          </div>

        </div>

        {/* Submit Action Button */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider rounded-xl uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all select-none font-sans cursor-pointer"
        >
          <Send className="w-4 h-4" /> {dict.btn_submit}
        </motion.button>
      </form>

      {/* iOS styled History List */}
      {history.length > 0 && (
        <div className={`space-y-3 pt-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block px-2 select-none text-left">
            {lang === 'ur' ? 'سابقہ سوالات کا ریکارڈ' : 'Your Enquiries Log (' + history.length + ')'}
          </span>
          <div className="space-y-2.5">
            {history.map((hQ) => (
              <motion.div
                key={hQ.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border flex justify-between gap-4 backdrop-blur-md ${saveCardBg}`}
              >
                <div className="space-y-1.5 text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-205' : 'text-slate-800'}`}>
                      {hQ.name}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${isDark ? 'bg-black/40 text-slate-500 border-white/[0.03]' : 'bg-slate-200 text-slate-600 border-slate-250'}`}>
                      {new Date(hQ.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-400' : 'text-slate-600'} ${isRtl ? 'font-serif text-right' : ''}`}>
                    {hQ.query}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteQuery(hQ.id)}
                  className="p-2 self-center hover:bg-rose-500/10 hover:text-rose-500 rounded-full text-slate-600 transition-colors cursor-pointer"
                  title="Delete log"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
