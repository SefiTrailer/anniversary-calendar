'use client';

import React, { useState } from 'react';
import { FamilyBranch, DeceasedPerson } from '@/lib/types';
import { Sparkles, FileJson, Copy, Check, AlertCircle, ArrowRight, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { formatHebrewDateString } from '@/lib/hebrew-calendar';

interface GemImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarId: string;
  userEmail: string;
  onImportSuccess: (updatedBranches: FamilyBranch[], updatedDeceased: DeceasedPerson[]) => void;
}

const SAMPLE_FAMILY_JSON = {
  branches: [
    { name: 'ענף רייכקינד (צד אב)', color: '#2563eb' },
    { name: 'ענף רנדל (צד אם)', color: '#10b981' }
  ],
  deceased: [
    {
      first_name: 'יהושע צבי',
      last_name: 'רנדל',
      father_or_mother_name: 'בן רבי אהרן',
      branch_name: 'ענף רנדל (צד אם)',
      hebrew_day: 9,
      hebrew_month: 'Sivan',
      hebrew_year: 5762,
      gregorian_original_date: '2002-05-19',
      after_sunset: true,
      leap_year_preference: 'Adar II',
      notes: 'קבור בסגולה בפתח תקווה. אומת במדויק מתוך דף ההקדשה של "מהדורת רייכקינד" ב-HebrewBooks (נלב"ע ט\' סיון ה\'תשס"ב).'
    },
    {
      first_name: 'עמנואל נתן',
      last_name: 'רייכקינד',
      father_or_mother_name: 'בן הרב זאב וואלף',
      branch_name: 'ענף רייכקינד (צד אב)',
      hebrew_day: 11,
      hebrew_month: 'Adar',
      hebrew_year: 5755,
      gregorian_original_date: '1995-02-11',
      after_sunset: false,
      leap_year_preference: 'Adar II',
      notes: 'איש נקי כפיים ובר לבב, אוהב ומוקיר רבנן. אומת מתוך הקדשת מהדורת רייכקינד ב-HebrewBooks (נלב"ע י"א אדר ה\'תשנ"ה).'
    }
  ]
};

const GEM_SYSTEM_INSTRUCTIONS = `אתה "גנאלוג מומחה לתאריכי פטירה עבריים ומצבות יהודיות" (Jewish Genealogy & Yahrzeit Specialist).

תפקידך:
לקבל מהמשתמש שמות בני משפחה, צילומי מצבות, דפי הקדשה של ספרים תורניים, קישורים לפרופילים מ-Geni, או תאריכים לועזיים, ולחלץ מהם את תאריך הפטירה העברי המדויק ואת שם האב/האם.

כללי הפיענוח והאימות:
1. שמות: חלץ שם פרטי, שם משפחה, ושם האב או האם (בפורמט "בן פלוני" / "בת פלונית").
2. חלוקה לענפים: חלק את הנפטרים לפי ענפי המשפחה (למשל: "צד אב", "צד אם", "משפחת רייכקינד", "משפחת רנדל").
3. תאריכים עבריים מדויקים:
   - קרא תחילה תאריכים החקוקים על מצבות או בהקדשות ספרים תורניים ("נלב״ע ביום...").
   - אם קיים רק תאריך לועזי, המר אותו לתאריך העברי המתאים, ובדוק האם הפטירה הייתה לאחר שקיעת החמה (בין השמשות) כדי לקבוע את היום הנכון.
4. חודשים עבריים מותרים עבור hebrew_month:
   Nisan, Iyyar, Sivan, Tammuz, Av, Elul, Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar, Adar I, Adar II.
5. leap_year_preference: בחר "Adar I" או "Adar II" (ברירת מחדל היא "Adar II").

פלט חובה:
החזר אך ורק בלוק JSON תקני במבנה הבא (ללא טקסט פתיחה או סיום):
{
  "branches": [
    { "name": "שם ענף", "color": "#2563eb" }
  ],
  "deceased": [
    {
      "first_name": "ישראל",
      "last_name": "ישראלי",
      "father_or_mother_name": "בן אברהם",
      "branch_name": "שם ענף",
      "hebrew_day": 15,
      "hebrew_month": "Nisan",
      "hebrew_year": 5780,
      "gregorian_original_date": "2020-04-09",
      "after_sunset": false,
      "leap_year_preference": "Adar II",
      "notes": "מקור: חקוק על גבי המצבה בהר המנוחות."
    }
  ]
}`;

export function GemImportModal({
  isOpen,
  onClose,
  calendarId,
  userEmail,
  onImportSuccess,
}: GemImportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'instructions'>('import');
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{ branches: any[]; deceased: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isOpen) return null;

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    setParseError(null);

    if (!text.trim()) {
      setParsedData(null);
      return;
    }

    try {
      // Find JSON block even if user pasted markdown ```json ... ```
      let clean = text.trim();
      if (clean.includes('```')) {
        const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) clean = match[1];
      }

      const parsed = JSON.parse(clean);
      if (!parsed.deceased || !Array.isArray(parsed.deceased)) {
        throw new Error('ה-JSON חייב לכלול מערך בשם "deceased"');
      }

      setParsedData({
        branches: Array.isArray(parsed.branches) ? parsed.branches : [],
        deceased: parsed.deceased,
      });
    } catch (err: any) {
      setParseError(err.message || 'שגיאת פענוח JSON');
      setParsedData(null);
    }
  };

  const loadSampleData = () => {
    const formatted = JSON.stringify(SAMPLE_FAMILY_JSON, null, 2);
    handleJsonChange(formatted);
  };

  const copyGemPrompt = () => {
    navigator.clipboard.writeText(GEM_SYSTEM_INSTRUCTIONS);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleExecuteImport = async () => {
    if (!parsedData || parsedData.deceased.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_import',
          userEmail,
          payload: {
            calendarId,
            branches: parsedData.branches,
            deceased: parsedData.deceased,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'שגיאה בייבוא הנתונים');
      }

      onImportSuccess(data.branches, data.deceased);
      onClose();
    } catch (err: any) {
      alert(err.message || 'שגיאה בייבוא הנתונים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-hebrew text-right rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-amber-100">
                ייבוא חכם (GEM / JSON)
              </h2>
              <p className="text-xs text-slate-400">
                טעינה מרוכזת של נפטרים וענפי משפחה מ-Gemini או מ-Geni ישירות ליומן
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'import'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              <FileJson className="w-3.5 h-3.5 inline ml-1.5" />
              הדבקת נתונים
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'instructions'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 inline ml-1.5" />
              הנחיות ל-GEM
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'import' ? (
            <>
              {/* Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    הדבק כאן את תוצאת ה-JSON מה-GEM:
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleData}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    טען נתוני דוגמה של המשפחה שאותרו
                  </button>
                </div>

                <textarea
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  placeholder='{"branches": [...], "deceased": [...]}'
                  rows={7}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 transition-colors resize-y ltr"
                />

                {parseError && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/50">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>

              {/* Preview Section */}
              {parsedData && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      תצוגה מקדימה לאישור ({parsedData.deceased.length} נפטרים)
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>ענפים:</span>
                      {parsedData.branches.map((b, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${b.color || '#3b82f6'}20`,
                            borderColor: `${b.color || '#3b82f6'}50`,
                            color: b.color || '#60a5fa',
                          }}
                        >
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">שם הנפטר</th>
                          <th className="p-3">שם האב/האם</th>
                          <th className="p-3">ענף</th>
                          <th className="p-3">תאריך פטירה עברי</th>
                          <th className="p-3">תאריך לועזי</th>
                          <th className="p-3">מקור אימות והערות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {parsedData.deceased.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-3 font-medium text-slate-200">
                              {d.first_name} {d.last_name}
                            </td>
                            <td className="p-3 text-slate-400">
                              {d.father_or_mother_name || '—'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                {d.branch_name || 'כללי'}
                              </span>
                            </td>
                            <td className="p-3 text-amber-300 font-serif">
                              {formatHebrewDateString(d.hebrew_day, d.hebrew_month, d.hebrew_year)}
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-[11px]">
                              {d.gregorian_original_date || '—'}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate" title={d.notes}>
                              {d.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* GEM Instructions Tab */
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                <h3 className="text-sm font-bold text-amber-200">
                  כיצד להגדיר GEM ייעודי ב-Google Gemini?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ה-GEM משמש כעוזר מחקר אישי לחקר המשפחה: תוכל לשלוח לו צילומי מצבות, צילומי מסמכים ישנים, דפי הקדשה מספרים עבריים או קישורי Geni.
                  ה-GEM יפענח את התאריכים העבריים ויחזיר JSON מוכן שאותו פשוט מדביקים כאן!
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    הנחיות מערכת מוכנות עבור ה-GEM (System Instructions):
                  </span>
                  <button
                    onClick={copyGemPrompt}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs flex items-center gap-1.5 transition-all"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt ? 'הועתק בהצלחה!' : 'העתק הנחיות'}
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto ltr">
                  {GEM_SYSTEM_INSTRUCTIONS}
                </pre>
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="font-bold text-slate-200">שלבי יצירת ה-GEM ב-Gemini:</div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>היכנס לאתר <a href="https://gemini.google.com/gems" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Google Gemini Gems</a>.</li>
                  <li>לחץ על <strong>New Gem</strong> (או צור ג׳ם חדש).</li>
                  <li>תן לו שם: <strong>חוקר יארצייט ומצבות (Yahrzeit Specialist)</strong>.</li>
                  <li>הדבק בשדה <strong>Instructions</strong> את ההנחיות שהעתקת למעלה.</li>
                  <li>לחץ <strong>Save</strong> — ומאותו רגע תוכל לזרוק אליו תמונות ומסמכים ולקבל JSON מיידי!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            סגור
          </button>

          {activeTab === 'import' && (
            <button
              type="button"
              disabled={!parsedData || parsedData.deceased.length === 0 || loading}
              onClick={handleExecuteImport}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2"
            >
              {loading ? (
                <span>מייבא נתונים...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    ייבא עכשיו ליומן ({parsedData?.deceased.length || 0} נפטרים)
                  </span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
