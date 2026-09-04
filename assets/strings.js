// The words on the proof page, in both languages.
//
// This file exists because of what machine translation did to the page: with
// the number and its unit in separate elements, "1 comeback" came back as
// "אחדקאמבק" — two words fused, no space. The page that spreads is the page a
// stranger judges the product by, so it says what it means in the reader's
// language rather than leaving that to a translator.
//
// Hebrew avoids verbs about the person wherever it can. A record describes
// someone in the third person, and Hebrew verbs carry gender — so noun phrases
// ("הפסקה של 15 ימים") stay true for everyone, where a verb would have to guess.

// Counts arrive here as raw numbers and are formatted at the last moment.
// Passing a pre-formatted "1" made every `c === 1` test fail silently, which is
// how the page came to say "1 פרויקטים".
let fmt = (x) => String(x);
export function setFormatter(f) { fmt = f; }

export const MONTHS = {
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  he: ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'],
};

export const STR = {
  en: {
    dir: 'ltr', other: 'עברית', otherLang: 'he',
    loading: 'Reading the record…',
    daysOfRecord: 'days of record',
    since: (d) => `since ${d}`,
    years: (c) => `${fmt(c)} ${c === 1 ? 'year' : 'years'}`,
    journey: 'The record, month by month',
    range: (a, b) => `Monthly activity from ${a} to ${b}`,
    contributions: (m, c) => `${m}: ${fmt(c)} ${c === 1 ? 'contribution' : 'contributions'}`,

    comebacks: (c) => c === 1 ? 'comeback' : 'comebacks',
    comebackLast: (days, date) => `Away ${fmt(days)} ${days === 1 ? 'day' : 'days'} — then back on ${date}.`,
    comebackNone: 'Every stretch away ended with a return.',
    activeWeeks: (c) => c === 1 ? 'active week' : 'active weeks',
    longestRun: (c) => `Longest unbroken run: ${fmt(c)} ${c === 1 ? 'week' : 'weeks'}.`,
    languages: (c) => c === 1 ? 'language' : 'languages',
    languageSpan: (a, b) => `First one in ${a}, most recent in ${b}.`,
    longProjects: (c) => c === 1 ? 'long project' : 'long projects',
    longest: (name, days) => `Longest: <span class="mono">${name}</span> — still going ${fmt(days)} ${days === 1 ? 'day' : 'days'} in.`,

    howDays: 'From the day the account opened until today.',
    howComebacks: 'A stretch of 14 or more days with nothing, followed by a day with something.',
    howWeeks: 'Weeks holding at least one day of activity.',
    howLanguages: 'The earliest repository created in each language.',
    howProjects: 'Projects still being pushed to 90 or more days after they were started.',

    langTimeline: 'When each language entered the work',
    projects: (c) => `${fmt(c)} ${c === 1 ? 'project' : 'projects'}`,
    entered: (d) => `entered ${d}`,
    projectTimeline: 'Projects that were still being pushed to, months in',
    started: (d) => `started ${d}`,
    days: (c) => `${fmt(c)} ${c === 1 ? 'day' : 'days'}`,

    addedTitle: 'What was added by hand',
    addedBody: (items, spread, from, to) =>
      `${fmt(items)} ${items === 1 ? 'item' : 'items'} across ${fmt(spread)} ${spread === 1 ? 'day' : 'days'}, from ${from} to ${to}. ` +
      'Each one carries the day it arrived, and that date cannot be moved.',

    footer: (d) => `Built from public GitHub data on ${d}. Nothing private was read. ` +
      'No code, no commit messages, no AI — dates, counts and names only.',
    deeper: 'Day-level history opens up once the server key is set.',
    buildOwn: 'Build your own page',
    copyLink: 'Copy link',
    copyBadge: 'Copy README badge',
    copied: 'Copied',
    copyBelow: 'Copy it below',

    errNoHandle: (h) => `No public GitHub account is open under <span class="mono">@${h}</span>.`,
    errRate: 'GitHub is holding requests for a minute. Try again shortly.',
    errBad: 'That handle has characters GitHub does not use.',
    errOffline: 'The connection dropped. Try again in a moment.',
    errOther: 'Something upstream is quiet right now.',
    tryAnother: 'Try another handle',
  },

  he: {
    dir: 'rtl', other: 'English', otherLang: 'en',
    loading: 'קורא את הרישום…',
    daysOfRecord: 'ימים של רישום',
    since: (d) => `מאז ${d}`,
    years: (c) => c === 1 ? 'שנה אחת' : `${fmt(c)} שנים`,
    journey: 'הרישום, חודש אחר חודש',
    range: (a, b) => `פעילות חודשית מ-${a} עד ${b}`,
    contributions: (m, c) => `${m}: ${fmt(c)} ${c === 1 ? 'תרומה' : 'תרומות'}`,

    comebacks: (c) => c === 1 ? 'חזרה' : 'חזרות',
    comebackLast: (days, date) => `הפסקה של ${fmt(days)} ${days === 1 ? 'יום' : 'ימים'} — ואז חזרה ב-${date}.`,
    comebackNone: 'כל תקופה של היעדרות נגמרה בחזרה.',
    activeWeeks: (c) => c === 1 ? 'שבוע פעיל' : 'שבועות פעילים',
    longestRun: (c) => `הרצף הארוך ביותר: ${fmt(c)} ${c === 1 ? 'שבוע' : 'שבועות'}.`,
    languages: (c) => c === 1 ? 'שפה' : 'שפות',
    languageSpan: (a, b) => `הראשונה ב-${a}, האחרונה ב-${b}.`,
    longProjects: (c) => c === 1 ? 'פרויקט ארוך' : 'פרויקטים ארוכים',
    longest: (name, days) => `הארוך ביותר: <span class="mono">${name}</span> — עדיין רץ ${fmt(days)} ${days === 1 ? 'יום' : 'ימים'} אחרי.`,

    howDays: 'מהיום שהחשבון נפתח ועד היום.',
    howComebacks: 'רצף של 14 יום ומעלה בלי כלום, ואחריו יום שיש בו משהו.',
    howWeeks: 'שבועות שיש בהם לפחות יום אחד של פעילות.',
    howLanguages: 'המאגר הראשון שנוצר בכל שפה.',
    howProjects: 'פרויקטים שהמשיכו לדחוף אליהם 90 יום ומעלה אחרי שהתחילו.',

    langTimeline: 'מתי כל שפה נכנסה לעבודה',
    projects: (c) => `${fmt(c)} ${c === 1 ? 'פרויקט' : 'פרויקטים'}`,
    entered: (d) => `נכנסה ב-${d}`,
    projectTimeline: 'פרויקטים שהמשיכו לדחוף אליהם, חודשים אחרי',
    started: (d) => `התחיל ב-${d}`,
    days: (c) => `${fmt(c)} ${c === 1 ? 'יום' : 'ימים'}`,

    addedTitle: 'מה שנוסף ביד',
    addedBody: (items, spread, from, to) =>
      `${fmt(items)} ${items === 1 ? 'פריט' : 'פריטים'} על פני ${fmt(spread)} ${spread === 1 ? 'יום' : 'ימים'}, מ-${from} עד ${to}. ` +
      'כל אחד נושא את היום שבו הגיע, ואת התאריך הזה אי אפשר להזיז.',

    footer: (d) => `נבנה מנתונים ציבוריים בגיטהאב ב-${d}. שום דבר פרטי לא נקרא. ` +
      'בלי קוד, בלי הודעות commit, בלי AI — תאריכים, ספירות ושמות בלבד.',
    deeper: 'היסטוריה יומית נפתחת ברגע שמוגדר מפתח בשרת.',
    buildOwn: 'לבנות עמוד משלכם',
    copyLink: 'העתקת קישור',
    copyBadge: 'העתקת תג ל-README',
    copied: 'הועתק',
    copyBelow: 'להעתיק מלמטה',

    errNoHandle: (h) => `אין חשבון גיטהאב ציבורי תחת <span class="mono">@${h}</span>.`,
    errRate: 'גיטהאב מעכב בקשות לרגע. נסו שוב עוד מעט.',
    errBad: 'בשם הזה יש תווים שגיטהאב לא משתמש בהם.',
    errOffline: 'החיבור נפל. נסו שוב עוד רגע.',
    errOther: 'משהו בצד השני שקט כרגע.',
    tryAnother: 'לנסות שם אחר',
  },
};

/** ?lang wins, then a remembered choice, then the browser. */
export function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && STR[q]) return q;
  try { const s = localStorage.getItem('tp:lang'); if (s && STR[s]) return s; } catch {}
  return (navigator.language || 'en').toLowerCase().startsWith('he') ? 'he' : 'en';
}

export function rememberLang(l) {
  try { localStorage.setItem('tp:lang', l); } catch {}
}
