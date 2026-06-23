// Mizan SEO page generator (bilingual EN + AR).
// Reads CATEGORIES + AREA_GROUPS straight out of ../index.html (single source of truth, zero drift),
// then emits per-service price guides + a hub, in English (/prices/*) and Arabic (/ar/prices/*),
// with reciprocal hreflang, plus an Arabic landing page and a sitemap with all URLs.
// Arabic is machine MSA -> have a native speaker review before relying on it publicly.
// Run from the repo root:  node tools/build-seo-pages.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.mizan-price.com';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CATEGORIES = eval(html.match(/const CATEGORIES=(\[[\s\S]*?\n\]);/)[1]);
const AREA_GROUPS = eval(html.match(/const AREA_GROUPS=(\[[\s\S]*?\n\]);/)[1]);

const emiratesRaw = AREA_GROUPS.map(g => ({ name: g.emirate, mult: g.areas.reduce((s, a) => s + a[1], 0) / g.areas.length }));
const dubaiMult = emiratesRaw.find(e => e.name === 'Dubai').mult;

const round5 = n => Math.round(n / 5) * 5;
const fmt = n => round5(n).toLocaleString('en-US');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// concise name + slug per service (slug shared across locales)
const META = {
  ac:{slug:'ac-cleaning',en:'AC cleaning',ar:'تنظيف المكيفات'}, cleaning:{slug:'home-deep-cleaning',en:'home deep cleaning',ar:'تنظيف عميق للمنزل'},
  pest:{slug:'pest-control',en:'pest control',ar:'مكافحة الحشرات'}, ductclean:{slug:'ac-duct-cleaning',en:'AC duct cleaning',ar:'تنظيف مجاري التكييف'},
  upholstery:{slug:'sofa-carpet-cleaning',en:'sofa & carpet cleaning',ar:'تنظيف الكنب والسجاد'}, watertank:{slug:'water-tank-cleaning',en:'water tank cleaning',ar:'تنظيف خزان المياه'},
  pool:{slug:'pool-maintenance',en:'pool maintenance',ar:'صيانة المسابح'}, windows:{slug:'window-cleaning',en:'window cleaning',ar:'تنظيف النوافذ'},
  handyman:{slug:'handyman',en:'handyman service',ar:'خدمات الصيانة المنزلية'}, plumber:{slug:'plumber',en:'plumber call-out',ar:'زيارة سبّاك'},
  electrician:{slug:'electrician',en:'electrician call-out',ar:'زيارة كهربائي'}, painting:{slug:'painting',en:'painting',ar:'دهان الجدران'},
  applrepair:{slug:'appliance-repair',en:'appliance repair',ar:'إصلاح الأجهزة المنزلية'}, tvmount:{slug:'tv-wall-mounting',en:'TV wall-mounting',ar:'تركيب التلفزيون على الحائط'},
  acinstall:{slug:'ac-installation',en:'AC installation',ar:'تركيب المكيفات'}, carserv:{slug:'car-service',en:'car service',ar:'صيانة السيارات'},
  carwash:{slug:'car-wash-detailing',en:'car wash & detailing',ar:'غسيل وتلميع السيارات'}, oilchange:{slug:'oil-change',en:'oil change',ar:'تغيير زيت السيارة'},
  tyres:{slug:'tyre-replacement',en:'tyre replacement',ar:'تبديل الإطارات'}, carac:{slug:'car-ac-regas',en:'car AC re-gas',ar:'تعبئة فريون السيارة'},
  carbattery:{slug:'car-battery-replacement',en:'car battery replacement',ar:'تبديل بطارية السيارة'}, tint:{slug:'car-window-tinting',en:'car window tinting',ar:'تظليل السيارات'},
  haircut:{slug:'mens-haircut',en:"men's haircut",ar:'قص شعر رجالي'}, salon:{slug:'salon-blow-dry',en:'salon cut & blow-dry',ar:'قص وتصفيف الشعر'},
  womenshair:{slug:'womens-cut-colour',en:"women's cut & colour",ar:'قص وصبغ الشعر النسائي'}, keratin:{slug:'keratin-treatment',en:'keratin treatment',ar:'علاج الكيراتين'},
  manipedi:{slug:'mani-pedi',en:'mani-pedi',ar:'مانيكير وباديكير'}, facial:{slug:'facial',en:'facial',ar:'تنظيف البشرة'}, massage:{slug:'massage',en:'massage',ar:'جلسة مساج'},
  waxing:{slug:'waxing-threading',en:'waxing & threading',ar:'إزالة الشعر بالشمع والخيط'}, lashes:{slug:'eyelash-extensions',en:'eyelash extensions',ar:'تركيب الرموش'},
  gym:{slug:'gym-membership',en:'gym membership',ar:'اشتراك النادي الرياضي'}, gp:{slug:'gp-consultation',en:'GP consultation',ar:'استشارة طبيب عام'},
  dental:{slug:'dental-cleaning',en:'dental cleaning',ar:'تنظيف الأسنان'}, physio:{slug:'physiotherapy',en:'physiotherapy',ar:'جلسة علاج طبيعي'},
  eyetest:{slug:'eye-test',en:'eye test',ar:'فحص النظر'}, bloodtest:{slug:'blood-test',en:'blood test',ar:'تحاليل الدم'},
  petgroom:{slug:'pet-grooming',en:'pet grooming',ar:'تجميل الحيوانات الأليفة'}, vet:{slug:'vet-consultation',en:'vet consultation',ar:'استشارة بيطرية'},
  petboard:{slug:'pet-boarding',en:'pet boarding',ar:'إيواء الحيوانات الأليفة'}, maid:{slug:'maid-cleaner',en:'hourly maid service',ar:'خدمة عاملة منزلية بالساعة'},
  nanny:{slug:'nanny',en:'nanny',ar:'مربية أطفال'}, tutor:{slug:'private-tutor',en:'private tutor',ar:'مدرّس خصوصي'}, swim:{slug:'swimming-lessons',en:'swimming lessons',ar:'دروس سباحة'},
  laundry:{slug:'laundry',en:'laundry',ar:'غسيل الملابس'}, dryclean:{slug:'dry-cleaning',en:'dry cleaning',ar:'التنظيف الجاف'}, tailoring:{slug:'tailoring-alterations',en:'tailoring & alterations',ar:'الخياطة والتعديلات'},
  movers:{slug:'movers',en:'movers',ar:'نقل الأثاث'},
};
const EMIRATE_AR = { 'Dubai':'دبي','Abu Dhabi':'أبوظبي','Sharjah':'الشارقة','Ajman':'عجمان','Ras Al Khaimah':'رأس الخيمة','Fujairah':'الفجيرة','Umm Al Quwain':'أم القيوين' };
const GROUP_AR = { 'Home & cleaning':'المنزل والتنظيف','Repairs & handyman':'الإصلاحات والصيانة','Auto':'السيارات','Beauty & grooming':'التجميل والعناية','Health & fitness':'الصحة واللياقة','Pets':'الحيوانات الأليفة','Home help & kids':'المساعدة المنزلية والأطفال','Laundry & garments':'الغسيل والملابس','Moving':'النقل' };
const UNIT_EN = {'/unit':'per unit','/job':'per job','/visit':'per visit','/month':'per month','/hour':'per hour','/room':'per room','/repair':'per repair','/service':'per service','/set':'per set','/car':'per car','/cut':'per cut','/session':'per session','/panel':'per panel','/night':'per night','/lesson':'per lesson','/kg':'per kg','/item':'per item','/move':'per move'};
const UNIT_AR = {'/unit':'للوحدة','/job':'للمهمة','/visit':'للزيارة','/month':'شهرياً','/hour':'للساعة','/room':'للغرفة','/repair':'للإصلاح','/service':'للخدمة','/set':'للطقم','/car':'للسيارة','/cut':'للقصة','/session':'للجلسة','/panel':'للباقة','/night':'لليلة','/lesson':'للدرس','/kg':'للكيلوغرام','/item':'للقطعة','/move':'للنقلة'};

// per-locale strings + formatters
const LOC = {
  en: {
    dir:'ltr', lang:'en', base:'', font:'',
    cur:n=>`AED ${fmt(n)}`, range:(a,b)=>`AED ${fmt(a)} – ${fmt(b)}`,
    name:s=>META[s.id].en, emirate:n=>n, group:g=>g, unit:u=>UNIT_EN[u]||'',
    navCta:'Check a price', home:'Home', guides:'Price guides', arrow:'→',
    h1:(n)=>`How much does ${n} cost in the UAE?`,
    lede:(n,lo,hi,u,t)=>`${cap(n)} in the UAE is typically advertised between <strong>${lo}</strong> and <strong>${hi}</strong> ${u}, with most quotes around <strong>${t}</strong>. Actual prices swing with your area, the provider, and what is included, so the advertised rate is rarely the price you have to pay.`,
    rangeLabel:'Typical UAE market range', mostQuotes:t=>`most quotes around ${t}`, unitTitle:u=>cap(u||'per service'),
    byEmirate:n=>`${cap(n)} prices by emirate`, thEmirate:'Emirate', thRange:'Typical advertised range',
    estNote:'Estimates: Dubai/Abu Dhabi list prices adjusted by a rough cost factor for each emirate. Residents often pay below the top of the range.',
    fairH:'What is a fair price?',
    fairP:n=>`A fair price for ${n} sits at or below the typical advertised figure. Residents who compare a couple of quotes usually pay noticeably less than the high end. Use the table above as a benchmark, then check your specific quote against what people actually paid.`,
    ctaP:n=>`Got a quote for ${n}? See if it is fair in seconds.`, ctaBtn:n=>`Check your ${n} quote`,
    faqH:'Common questions', relatedH:'Related guides',
    faqs:(n,loD,hiD,u,t)=>[
      {q:`How much does ${n} cost in Dubai?`,a:`In Dubai, ${n} is typically advertised around ${loD} to ${hiD} ${u}. Many residents pay less than the top of that range.`},
      {q:`What is a fair price for ${n} in the UAE?`,a:`A fair price is usually at or below the typical advertised figure of about ${t}. Compare two or three quotes and check them against what residents report paying on Mizan.`},
      {q:`Why do ${n} prices vary so much?`,a:`Prices move with your area, the provider's tier, and exactly what the quote includes. That is why Mizan shows the advertised range next to what people actually pay.`},
    ],
    foot:`Mizan shows advertised list prices next to what UAE residents report paying. Reports are anonymous. Prices are estimates, not quotes.`,
    footLinks:(o)=>`<a href="${o}/prices/">All price guides</a> · <a href="/">Home</a>`,
    hubTitle:'Service price guides for Dubai & the UAE | Mizan',
    hubDesc:n=>`Browse fair-price guides for ${n} everyday UAE services - AC cleaning, salon, gym, movers, pest control and more. See what residents actually pay.`,
    hubH1:'UAE service price guides',
    hubLede:'What everyday services really cost across the UAE. Each guide shows the typical advertised range, a per-emirate breakdown, and what residents report actually paying. Pick a service to dig in, or <a href="/">check a specific quote</a>.',
    title:n=>`${cap(n)} prices in the UAE (2026) | Mizan`,
    desc:(n,lo,hi,u)=>`What does ${n} cost in the UAE? Typical market range ${lo} to ${hi} ${u}, plus what residents actually pay across Dubai, Abu Dhabi, Sharjah and more.`,
  },
  ar: {
    dir:'rtl', lang:'ar', base:'/ar', font:'IBM+Plex+Sans+Arabic:wght@400;500;600',
    cur:n=>`${fmt(n)} درهم`, range:(a,b)=>`${fmt(a)} – ${fmt(b)} درهم`,
    name:s=>META[s.id].ar, emirate:n=>EMIRATE_AR[n]||n, group:g=>GROUP_AR[g]||g, unit:u=>UNIT_AR[u]||'',
    navCta:'تحقّق من سعر', home:'الرئيسية', guides:'أدلة الأسعار', arrow:'←',
    h1:(n)=>`كم تكلفة ${n} في الإمارات؟`,
    lede:(n,lo,hi,u,t)=>`عادةً ما يُعلَن عن ${n} في الإمارات بين <strong>${lo}</strong> و<strong>${hi}</strong> ${u}، وغالبية العروض حول <strong>${t}</strong>. تتغيّر الأسعار الفعلية حسب منطقتك ومقدّم الخدمة وما يشمله العرض، لذا نادراً ما يكون السعر المُعلن هو ما يجب أن تدفعه.`,
    rangeLabel:'النطاق السوقي المعتاد في الإمارات', mostQuotes:t=>`غالبية العروض حول ${t}`, unitTitle:u=>u||'للخدمة',
    byEmirate:n=>`أسعار ${n} حسب الإمارة`, thEmirate:'الإمارة', thRange:'النطاق المُعلن المعتاد',
    estNote:'تقديرات: أسعار دبي وأبوظبي المُعلنة معدّلة بعامل تكلفة تقريبي لكل إمارة. غالباً ما يدفع السكان أقل من الحد الأعلى للنطاق.',
    fairH:'ما هو السعر العادل؟',
    fairP:n=>`السعر العادل لـ${n} يكون عند الرقم المُعلن المعتاد أو أقل منه. السكان الذين يقارنون عرضين أو ثلاثة عادةً ما يدفعون أقل بكثير من الحد الأعلى. استخدم الجدول أعلاه كمرجع، ثم تحقّق من عرضك الخاص قبل أن توافق.`,
    ctaP:n=>`حصلت على عرض سعر لـ${n}؟ اعرف إن كان عادلاً خلال ثوانٍ.`, ctaBtn:n=>`تحقّق من عرض ${n}`,
    faqH:'الأسئلة الشائعة', relatedH:'أدلة ذات صلة',
    faqs:(n,loD,hiD,u,t)=>[
      {q:`كم تكلفة ${n} في دبي؟`,a:`في دبي، يُعلَن عن ${n} عادةً بين ${loD} و${hiD} ${u}. كثير من السكان يدفعون أقل من الحد الأعلى للنطاق.`},
      {q:`ما هو السعر العادل لـ${n} في الإمارات؟`,a:`السعر العادل عادةً عند ${t} أو أقل. قارن عرضين أو ثلاثة وتحقّق منها مقابل ما يدفعه السكان فعلاً على ميزان.`},
      {q:`لماذا تتفاوت أسعار ${n} كثيراً؟`,a:`تتغيّر الأسعار حسب منطقتك وفئة مقدّم الخدمة وما يشمله العرض بالضبط. لهذا يعرض ميزان النطاق المُعلن إلى جانب ما يدفعه الناس فعلاً.`},
    ],
    foot:`يعرض ميزان الأسعار المُعلنة إلى جانب ما يبلّغ عنه سكان الإمارات من مبالغ مدفوعة. البلاغات مجهولة، والأسعار تقديرية وليست عروضاً.`,
    footLinks:(o)=>`<a href="${o}/ar/prices/">كل أدلة الأسعار</a> · <a href="/ar/">الرئيسية</a>`,
    hubTitle:'أدلة أسعار الخدمات في دبي والإمارات | ميزان',
    hubDesc:n=>`تصفّح أدلة الأسعار العادلة لـ${n} خدمة يومية في الإمارات - تنظيف المكيفات والصالونات والنوادي والنقل ومكافحة الحشرات وغيرها. اعرف ما يدفعه السكان فعلاً.`,
    hubH1:'أدلة أسعار الخدمات في الإمارات',
    hubLede:'كم تكلّف الخدمات اليومية فعلاً في أنحاء الإمارات. يعرض كل دليل النطاق المُعلن المعتاد، وتفصيلاً لكل إمارة، وما يبلّغ عنه السكان من مبالغ مدفوعة. اختر خدمة للتعمّق، أو <a href="/">تحقّق من عرض محدّد</a>.',
    title:n=>`أسعار ${n} في الإمارات (2026) | ميزان`,
    desc:(n,lo,hi,u)=>`كم تكلفة ${n} في الإمارات؟ النطاق السوقي المعتاد من ${lo} إلى ${hi} ${u}، إضافةً إلى ما يدفعه السكان فعلاً في دبي وأبوظبي والشارقة وغيرها.`,
  },
};

const services = CATEGORIES.map(c => ({ ...c, slug: META[c.id].slug }));

const CSS = `:root{--ink:#1C1A15;--ink-2:#43403A;--muted:#65615A;--faint:#8A857A;--faint-2:#A39D90;
  --surface:#fff;--surface-2:#FBFAF5;--line:#EAE4D6;--line-2:#EFEADF;--teal:#14534D;--teal-deep:#0F423D;
  --on-teal:#F4F0E6;--bg:radial-gradient(140% 90% at 50% -10%,#EEF2F1 0%,#E3EAE8 55%,#D7E2DF 100%);
  --serif:'Newsreader',Georgia,serif;--mono:'Geist Mono',ui-monospace,monospace}
:root[data-theme="dark"]{--ink:#ECE8E0;--ink-2:#CFC9BD;--muted:#A8A398;--faint:#8E8779;--faint-2:#8C8678;
  --surface:#1C201E;--surface-2:#252A27;--line:#343A36;--line-2:#2E332F;--teal:#5BBBA6;--teal-deep:#74CCB8;
  --on-teal:#0E1A17;--bg:radial-gradient(140% 90% at 50% -10%,#16201E 0%,#121A18 55%,#0D1413 100%)}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{background:var(--bg);min-height:100vh;color:var(--ink);font-family:'Geist',system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
html[lang="ar"] body,html[lang="ar"] h1,html[lang="ar"] h2,html[lang="ar"] .brand .w{font-family:'IBM Plex Sans Arabic','Geist',system-ui,sans-serif}
html[lang="ar"] h1,html[lang="ar"] h2{font-weight:600}
html[lang="ar"] .big,html[lang="ar"] td.r{font-family:'IBM Plex Sans Arabic','Geist',system-ui,sans-serif;direction:ltr}
html[lang="ar"] .big{text-align:right}
a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}
.nav{border-bottom:1px solid var(--line);background:rgba(248,246,240,.82);backdrop-filter:saturate(140%) blur(12px)}
:root[data-theme="dark"] .nav{background:rgba(18,24,22,.82)}
.nav-in{max-width:760px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:9px;color:var(--ink)}
.brand svg{width:21px;height:21px}.brand .w{font-family:var(--serif);font-size:23px}.brand .ar{font-size:17px;color:var(--teal);opacity:.7}
.nav-r{display:flex;align-items:center;gap:18px}.nav-r a{font-size:13.5px;font-weight:600}
main{max-width:760px;margin:0 auto;padding:clamp(28px,5vw,48px) 24px 72px}
.crumb{font-size:12.5px;color:var(--faint-2);margin-bottom:22px}.crumb a{color:var(--faint-2)}
h1{font-family:var(--serif);font-weight:500;font-size:clamp(32px,6vw,46px);line-height:1.12;letter-spacing:.2px;margin:0 0 18px}
.lede{font-size:17px;color:var(--muted);margin:0 0 30px}.lede strong{color:var(--ink-2);font-weight:600}
.rangecard{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px;margin:0 0 34px;box-shadow:0 1px 2px rgba(40,34,20,.04),0 18px 40px -34px rgba(40,34,20,.3)}
.rangecard .k{font-size:11px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
.rangecard .big{font-family:var(--mono);font-size:34px;font-weight:600;color:var(--teal);margin:6px 0 2px}
.rangecard .sub{font-size:13.5px;color:var(--muted)}
h2{font-family:var(--serif);font-weight:500;font-size:26px;margin:38px 0 14px;letter-spacing:.2px}
p{font-size:15.5px;color:var(--muted);margin:0 0 16px}p strong{color:var(--ink-2);font-weight:600}
table{width:100%;border-collapse:collapse;margin:6px 0 8px;font-size:14.5px}
th,td{text-align:start;padding:12px 4px;border-bottom:1px solid var(--line)}
th{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
th.ra,td.r{text-align:end}td.r{font-family:var(--mono);color:var(--ink-2);white-space:nowrap}
.note{font-size:12.5px;color:var(--faint-2);margin:0 0 30px}
.ctabox{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px;text-align:center;margin:34px 0}
.ctabox p{margin:0 0 16px;color:var(--ink-2)}
.btn{display:inline-block;background:var(--teal);color:var(--on-teal);font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px;box-shadow:0 10px 22px -12px rgba(20,83,77,.8)}
.btn:hover{background:var(--teal-deep);text-decoration:none}
details{border-top:1px solid var(--line)}details:last-of-type{border-bottom:1px solid var(--line)}
summary{list-style:none;cursor:pointer;padding:16px 2px;font-weight:600;color:var(--ink);display:flex;justify-content:space-between;gap:14px}
summary::-webkit-details-marker{display:none}summary::after{content:"+";font-family:var(--mono);color:var(--faint-2)}
details[open] summary::after{content:"\\2212"}details p{padding:0 0 16px;font-size:14.5px}
.related{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 0}
.related a{font-size:13.5px;border:1px solid var(--line);border-radius:999px;padding:7px 14px;color:var(--ink-2)}
.related a:hover{border-color:var(--teal);color:var(--teal);text-decoration:none}
.idxgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 24px}
.idxgroup{margin:26px 0 0}.idxgroup h3{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin:0 0 8px}
.idxgrid a{display:block;padding:7px 0;font-size:15px;color:var(--ink-2);border-bottom:1px solid var(--line)}
.idxgrid a:hover{color:var(--teal);text-decoration:none}
footer{border-top:1px solid var(--line);margin-top:48px}.foot-in{max-width:760px;margin:0 auto;padding:24px;font-size:12.5px;color:var(--faint-2)}`;

const SCALE = `<svg viewBox="0 0 24 24" fill="none" stroke="#14534D" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v17"/><path d="M5 20h14"/><path d="M4 7h16"/><path d="M4 7l-2.5 5a3 3 0 0 0 5 0z"/><path d="M20 7l-2.5 5a3 3 0 0 0 5 0z"/></svg>`;
const THEME = `<script>(function(){try{var s=localStorage.getItem('mizan:theme');var d=s||((window.matchMedia&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light');document.documentElement.setAttribute('data-theme',d);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();</script>`;
const fontsLink = (extra) => `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600${extra ? '&family=' + extra : ''}&display=swap" rel="stylesheet">`;

function alternates(enPath, arPath) {
  return `<link rel="alternate" hreflang="en" href="${ORIGIN}${enPath}">` +
         (arPath ? `<link rel="alternate" hreflang="ar" href="${ORIGIN}${arPath}">` : '') +
         `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${enPath}">`;
}
function head(L, title, desc, canonPath, enPath, arPath, jsonld) {
  return `<!DOCTYPE html><html lang="${L.lang}" dir="${L.dir}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${ORIGIN}${canonPath}">${alternates(enPath, arPath)}<meta name="robots" content="index,follow">
<meta name="theme-color" content="#EEF2F1" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#16201E" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Mizan"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${ORIGIN}${canonPath}"><meta property="og:image" content="${ORIGIN}/og.png"><meta property="og:locale" content="${L.lang === 'ar' ? 'ar_AE' : 'en_AE'}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:image" content="${ORIGIN}/og.png">
${THEME}${fontsLink(L.font)}<link rel="stylesheet" href="/prices/page.css"><script defer src="/_vercel/insights/script.js"></script>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script></head><body>`;
}
function nav(L, altPath, altLabel) {
  const brand = L.lang === 'ar'
    ? `<a class="brand" href="${L.base}/">${SCALE}<span class="ar" style="opacity:1;font-size:22px">ميزان</span></a>`
    : `<a class="brand" href="/">${SCALE}<span class="w">Mizan</span><span class="ar">ميزان</span></a>`;
  const alt = altPath ? `<a href="${altPath}">${altLabel}</a>` : '';
  return `<header class="nav"><div class="nav-in">${brand}<div class="nav-r">${alt}<a href="${L.lang === 'ar' ? '/ar/' : '/'}">${L.navCta}</a></div></div></header>`;
}
function footer(L) {
  return `<footer><div class="foot-in">${L.foot} ${L.footLinks(ORIGIN === '' ? '' : '')}</div></footer></body></html>`;
}

function servicePage(L, s) {
  const n = L.name(s), N = cap(n);
  const slug = s.slug;
  const enPath = `/prices/${slug}`, arPath = `/ar/prices/${slug}`;
  const canonPath = `${L.base}/prices/${slug}`;
  const u = L.unit(s.unit);
  const loD = L.cur(s.lo * dubaiMult), hiD = L.cur(s.hi * dubaiMult);
  const rows = emiratesRaw.map(e => `<tr><td>${esc(L.emirate(e.name))}</td><td class="r">${L.range(s.lo * e.mult, s.hi * e.mult)}</td></tr>`).join('');
  const related = services.filter(o => o.group === s.group && o.id !== s.id).slice(0, 4)
    .map(o => `<a href="${L.base}/prices/${o.slug}">${esc(cap(L.name(o)))}</a>`).join('');
  const faqs = L.faqs(n, loD, hiD, u, L.cur(s.typical));
  const jsonld = { "@context":"https://schema.org","@graph":[
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":L.home,"item":`${ORIGIN}${L.base}/`},
      {"@type":"ListItem","position":2,"name":L.guides,"item":`${ORIGIN}${L.base}/prices/`},
      {"@type":"ListItem","position":3,"name":N,"item":`${ORIGIN}${canonPath}`}]},
    {"@type":"FAQPage","inLanguage":L.lang,"mainEntity":faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))}
  ]};
  const altPath = L.lang === 'ar' ? enPath : arPath;
  const altLabel = L.lang === 'ar' ? 'English' : 'عربي';
  return head(L, L.title(n), L.desc(n, L.cur(s.lo), L.cur(s.hi), u), canonPath, enPath, arPath, jsonld) + nav(L, altPath, altLabel) + `<main>
<div class="crumb"><a href="${L.base}/">${L.home}</a> / <a href="${L.base}/prices/">${L.guides}</a> / ${esc(N)}</div>
<h1>${esc(L.h1(n))}</h1>
<p class="lede">${L.lede(esc(n), L.cur(s.lo), L.cur(s.hi), esc(u), L.cur(s.typical))}</p>
<div class="rangecard"><div class="k">${esc(L.rangeLabel)}</div><div class="big">${L.range(s.lo, s.hi)}</div><div class="sub">${esc(L.unitTitle(u))} · ${esc(L.mostQuotes(L.cur(s.typical)))}</div></div>
<h2>${esc(L.byEmirate(n))}</h2>
<table><thead><tr><th>${esc(L.thEmirate)}</th><th class="ra">${esc(L.thRange)}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">${esc(L.estNote)}</p>
<h2>${esc(L.fairH)}</h2><p>${L.fairP(esc(n))}</p>
<div class="ctabox"><p>${esc(L.ctaP(n))}</p><a class="btn" href="${L.lang === 'ar' ? '/ar/' : '/'}?service=${s.id}">${esc(L.ctaBtn(n))} ${L.arrow}</a></div>
<h2>${esc(L.faqH)}</h2>
${faqs.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
${related ? `<h2>${esc(L.relatedH)}</h2><div class="related">${related}</div>` : ''}
</main>` + footer(L);
}

function hubPage(L) {
  const enPath = '/prices/', arPath = '/ar/prices/', canonPath = `${L.base}/prices/`;
  const groups = [];
  services.forEach(s => { let g = groups.find(x => x.k === s.group); if (!g) { g = { k: s.group, items: [] }; groups.push(g); } g.items.push(s); });
  const body = groups.map(g => `<div class="idxgroup"><h3>${esc(L.group(g.k))}</h3><div class="idxgrid">${g.items.map(s => `<a href="${L.base}/prices/${s.slug}">${esc(cap(L.name(s)))}</a>`).join('')}</div></div>`).join('');
  const jsonld = { "@context":"https://schema.org","@type":"CollectionPage","name":L.hubTitle,"url":`${ORIGIN}${canonPath}`,"inLanguage":L.lang,"description":L.hubDesc(services.length) };
  const altPath = L.lang === 'ar' ? enPath : arPath, altLabel = L.lang === 'ar' ? 'English' : 'عربي';
  return head(L, L.hubTitle, L.hubDesc(services.length), canonPath, enPath, arPath, jsonld) + nav(L, altPath, altLabel) + `<main>
<div class="crumb"><a href="${L.base}/">${L.home}</a> / ${esc(L.guides)}</div>
<h1>${esc(L.hubH1)}</h1><p class="lede">${L.hubLede}</p>${body}</main>` + footer(L);
}

// Arabic interactive tool at /ar/ — the live app (index.html) with its <head> rewritten for
// Arabic SEO (canonical/og/locale/lang). The app's own JS detects the /ar path and renders the
// UI in Arabic + RTL; the BODY is byte-identical to the English app (single source, zero drift).
function arApp() {
  let h = html;
  h = h.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
  h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>ميزان - اعرف السعر العادل لخدمات الإمارات</title>');
  h = h.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="ما يدفعه سكان الإمارات فعلاً للخدمات اليومية، مقابل الأسعار التي تعلنها الشركات. تحقّق من السعر العادل قبل أن تدفع.">');
  h = h.replace('<link rel="canonical" href="https://www.mizan-price.com/">', '<link rel="canonical" href="https://www.mizan-price.com/ar/">');
  h = h.replace('<meta property="og:url" content="https://www.mizan-price.com/">', '<meta property="og:url" content="https://www.mizan-price.com/ar/">');
  h = h.replace('<meta property="og:locale" content="en_AE">', '<meta property="og:locale" content="ar_AE">');
  h = h.replace('<meta property="og:title" content="Mizan - Know the fair price for UAE services">', '<meta property="og:title" content="ميزان - اعرف السعر العادل لخدمات الإمارات">');
  h = h.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="ما يدفعه سكان الإمارات فعلاً للخدمات اليومية، مقابل الأسعار التي تعلنها الشركات.">');
  h = h.replace('<meta name="twitter:title" content="Mizan - Know the fair price for UAE services">', '<meta name="twitter:title" content="ميزان - اعرف السعر العادل لخدمات الإمارات">');
  h = h.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="ما يدفعه سكان الإمارات فعلاً للخدمات اليومية، مقابل الأسعار المُعلنة. تحقّق قبل أن تدفع.">');
  h = h.replace('"inLanguage":"en"', '"inLanguage":"ar"');
  return h;
}

// ===== RENT guides (EN + AR) — per-community pages from rent/index.html data =====
const rentHtml = fs.readFileSync(path.join(ROOT, 'rent', 'index.html'), 'utf8');
const RTYPES = eval(rentHtml.match(/const RTYPES=(\[[\s\S]*?\n\]);/)[1]);
const RAREAS = eval(rentHtml.match(/const RAREAS=(\[[\s\S]*?\n\]);/)[1]);
const RTYPE_AR = eval('(' + rentHtml.match(/const RTYPE_AR = (\{[^;]*\});/)[1] + ')');
const RAREA_AR = eval('(' + rentHtml.match(/const AREA_AR = (\{[^;]*\});/)[1] + ')');
const slugify = s => s.toLowerCase().replace(/[()'".]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const rentRangeOf = (area, t) => { const v = area.r[t]; return v ? v.map(x => x * 1000) : null; }; // data is in thousands
const rTypeName = (lang, t) => lang === 'ar' ? (RTYPE_AR[t.id] || t.label) : t.label;
const rAreaName = (lang, n) => lang === 'ar' ? (RAREA_AR[n] || n) : n;

const RENT_T = {
  en: {
    base: '', guides: 'Rent by area', tool: '/rent', areas: '/rent/areas',
    title: a => `${a} rent prices 2026 — studio to villa | Mizan`,
    desc: a => `What it costs to rent in ${a}: typical annual asking rent for studios, 1, 2 & 3-bedroom apartments and villas, plus Dubai's legal rent-increase cap and what tenants actually pay.`,
    h1: a => `Rent prices in ${a}`,
    lede: a => `Typical annual asking rents in <strong>${a}</strong>, by property type. Landlords advertise high and negotiate, so tenants often sign below these figures — check your number against the range, and see whether a renewal increase is even legal.`,
    rangeH: a => `Average rent in ${a} by property type`, thType: 'Property type', thRange: 'Asking rent / year',
    estNote: 'Asking-rent estimates for 2026, in AED per year. Actual signed rents vary with the building, floor, view, furnishing and number of cheques.',
    legalH: 'Is your rent increase legal?',
    legalP: a => `In ${a}, as across Dubai, a renewal increase is capped by Decree 43 of 2013 — nothing if your rent is within 10% of the market average, rising in steps to a maximum of 20% if it sits far below, with 90 days' written notice required. Check your exact case with the calculator.`,
    fairH: 'What is a fair rent here?',
    fairP: a => `A fair rent in ${a} is at or below the typical asking figure for that property type. Compare a few listings and check what tenants report actually signing — the gap between asking and signed is your room to negotiate.`,
    ctaP: a => `Renting in ${a}? Check if your rent is fair — or whether an increase is legal.`, ctaBtn: 'Open the rent checker',
    relatedH: 'Rent in nearby areas',
    faqs: (a, lo, hi) => [
      { q: `How much is rent for a 1-bedroom in ${a}?`, a: `A 1-bedroom apartment in ${a} is typically advertised around ${lo} to ${hi} per year in 2026. Tenants often sign below the top of that range.` },
      { q: `Can my landlord raise my rent in ${a}?`, a: `Only within Dubai's RERA cap (Decree 43/2013): no increase if your rent is within 10% of the market average, and 5–20% if it sits further below — with 90 days' written notice.` },
      { q: `What do tenants actually pay vs the asking rent in ${a}?`, a: `Asking rents are what landlords advertise; signed rents are usually lower. Mizan shows the asking range next to what residents report actually paying so you can negotiate.` },
    ],
    hubTitle: 'UAE rent prices by community (2026) | Mizan',
    hubDesc: "Browse typical rents across UAE communities — studio to villa — plus Dubai's legal rent-increase calculator. See what tenants actually pay.",
    hubH1: 'Rent prices by community',
    hubLede: 'What it really costs to rent across the UAE, community by community — typical asking rents by property type, with Dubai\'s legal rent-increase calculator. Or <a href="/rent">open the rent checker</a>.',
  },
  ar: {
    base: '/ar', guides: 'الإيجارات حسب المنطقة', tool: '/ar/rent', areas: '/ar/rent/areas',
    title: a => `أسعار إيجارات ${a} 2026 — من الاستوديو إلى الفيلا | ميزان`,
    desc: a => `كم تكلفة الإيجار في ${a}: متوسط الإيجار السنوي المُعلن للاستوديو والشقق بغرفة وغرفتين وثلاث غرف والفلل، إضافةً إلى سقف زيادة الإيجار القانوني في دبي وما يدفعه المستأجرون فعلاً.`,
    h1: a => `أسعار الإيجارات في ${a}`,
    lede: a => `متوسط الإيجارات السنوية المُعلنة في <strong>${a}</strong>، حسب نوع العقار. يطلب الملّاك أعلى ثم يتفاوضون، لذا يوقّع المستأجرون عادةً أقل من هذه الأرقام — قارن رقمك بالنطاق، واعرف إن كانت زيادة التجديد قانونية أصلاً.`,
    rangeH: a => `متوسط الإيجار في ${a} حسب نوع العقار`, thType: 'نوع العقار', thRange: 'الإيجار السنوي المُعلن',
    estNote: 'تقديرات الإيجار المُعلن لعام 2026، بالدرهم سنوياً. تختلف الإيجارات الموقّعة فعلاً حسب المبنى والطابق والإطلالة والتأثيث وعدد الشيكات.',
    legalH: 'هل زيادة إيجارك قانونية؟',
    legalP: a => `في ${a}، كما في بقية دبي، تُقيَّد زيادة التجديد بالمرسوم رقم 43 لسنة 2013 — لا زيادة إذا كان إيجارك ضمن 10% من متوسط السوق، وترتفع تدريجياً حتى 20% كحد أقصى إذا كان أقل بكثير، مع وجوب إشعار خطي قبل 90 يوماً. تحقّق من حالتك بالحاسبة.`,
    fairH: 'ما هو الإيجار العادل هنا؟',
    fairP: a => `الإيجار العادل في ${a} عند الرقم المُعلن المعتاد لذلك النوع أو أقل منه. قارن عدة إعلانات وتحقّق ممّا يبلّغ المستأجرون بتوقيعه فعلاً — الفجوة بين المُعلن والموقّع هي مجالك للتفاوض.`,
    ctaP: a => `تستأجر في ${a}؟ تحقّق إن كان إيجارك عادلاً — أو إن كانت الزيادة قانونية.`, ctaBtn: 'افتح حاسبة الإيجار',
    relatedH: 'إيجارات في مناطق قريبة',
    faqs: (a, lo, hi) => [
      { q: `كم إيجار شقة غرفة واحدة في ${a}؟`, a: `تُعلَن شقة الغرفة الواحدة في ${a} عادةً بين ${lo} و${hi} سنوياً في 2026، وغالباً يوقّع المستأجرون أقل من أعلى النطاق.` },
      { q: `هل يمكن للمالك رفع إيجاري في ${a}؟`, a: `فقط ضمن سقف RERA في دبي (المرسوم 43/2013): لا زيادة إذا كان إيجارك ضمن 10% من متوسط السوق، و5%–20% إذا كان أقل بكثير — مع إشعار خطي قبل 90 يوماً.` },
      { q: `ما الفرق بين ما يدفعه المستأجرون والإيجار المُعلن في ${a}؟`, a: `الإيجارات المُعلنة هي ما يطلبه الملّاك؛ والموقّعة عادةً أقل. يعرض ميزان النطاق المُعلن إلى جانب ما يبلّغ السكان بدفعه فعلاً لتتفاوض.` },
    ],
    hubTitle: 'أسعار إيجارات الإمارات حسب المنطقة (2026) | ميزان',
    hubDesc: 'تصفّح الإيجارات المعتادة في مجتمعات الإمارات — من الاستوديو إلى الفيلا — إضافةً إلى حاسبة زيادة الإيجار القانونية في دبي. اعرف ما يدفعه المستأجرون فعلاً.',
    hubH1: 'أسعار الإيجارات حسب المنطقة',
    hubLede: 'كم تكلّف الإيجارات فعلاً في أنحاء الإمارات، منطقةً منطقة — الإيجارات المُعلنة المعتادة حسب نوع العقار، مع حاسبة زيادة الإيجار القانونية في دبي. أو <a href="/ar/rent">افتح حاسبة الإيجار</a>.',
  },
};

function rentGuidePage(lang, area) {
  const L = LOC[lang], RT = RENT_T[lang], name = area.name, locName = rAreaName(lang, name), slug = slugify(name);
  const enPath = `/rent/${slug}`, arPath = `/ar/rent/${slug}`, canonPath = `${RT.base}/rent/${slug}`;
  const rows = RTYPES.filter(t => rentRangeOf(area, t.id)).map(t => { const r = rentRangeOf(area, t.id); return `<tr><td>${esc(rTypeName(lang, t))}</td><td class="r">${L.range(r[0], r[2])}</td></tr>`; }).join('');
  const one = rentRangeOf(area, '1br') || rentRangeOf(area, 'studio');
  const faqs = RT.faqs(locName, L.cur(one[0]), L.cur(one[2]));
  const related = RAREAS.filter(o => o.emirate === area.emirate && o.name !== name).slice(0, 4).map(o => `<a href="${RT.base}/rent/${slugify(o.name)}">${esc(rAreaName(lang, o.name))}</a>`).join('');
  const jsonld = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": L.home, "item": `${ORIGIN}${RT.base}/` },
      { "@type": "ListItem", "position": 2, "name": RT.guides, "item": `${ORIGIN}${RT.areas}` },
      { "@type": "ListItem", "position": 3, "name": locName, "item": `${ORIGIN}${canonPath}` }] },
    { "@type": "FAQPage", "inLanguage": lang, "mainEntity": faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) }
  ] };
  const altPath = lang === 'ar' ? enPath : arPath, altLabel = lang === 'ar' ? 'English' : 'عربي';
  return head(L, RT.title(locName), RT.desc(locName), canonPath, enPath, arPath, jsonld) + nav(L, altPath, altLabel) + `<main>
<div class="crumb"><a href="${RT.base}/">${L.home}</a> / <a href="${RT.areas}">${esc(RT.guides)}</a> / ${esc(locName)}</div>
<h1>${esc(RT.h1(locName))}</h1>
<p class="lede">${RT.lede(esc(locName))}</p>
<h2>${esc(RT.rangeH(locName))}</h2>
<table><thead><tr><th>${esc(RT.thType)}</th><th class="ra">${esc(RT.thRange)}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">${esc(RT.estNote)}</p>
<h2>${esc(RT.legalH)}</h2><p>${RT.legalP(esc(locName))}</p>
<h2>${esc(RT.fairH)}</h2><p>${RT.fairP(esc(locName))}</p>
<div class="ctabox"><p>${esc(RT.ctaP(locName))}</p><a class="btn" href="${RT.tool}?area=${encodeURIComponent(name)}">${esc(RT.ctaBtn)} ${L.arrow}</a></div>
<h2>${esc(L.faqH)}</h2>
${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
${related ? `<h2>${esc(RT.relatedH)}</h2><div class="related">${related}</div>` : ''}
</main>` + footer(L);
}

function rentHub(lang) {
  const L = LOC[lang], RT = RENT_T[lang], enPath = '/rent/areas', arPath = '/ar/rent/areas', canonPath = RT.areas;
  const byEm = []; RAREAS.forEach(a => { let g = byEm.find(x => x.k === a.emirate); if (!g) { g = { k: a.emirate, items: [] }; byEm.push(g); } g.items.push(a); });
  const body = byEm.map(g => `<div class="idxgroup"><h3>${esc(L.emirate(g.k))}</h3><div class="idxgrid">${g.items.map(a => `<a href="${RT.base}/rent/${slugify(a.name)}">${esc(rAreaName(lang, a.name))}</a>`).join('')}</div></div>`).join('');
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", "name": RT.hubTitle, "url": `${ORIGIN}${canonPath}`, "inLanguage": lang, "description": RT.hubDesc };
  const altPath = lang === 'ar' ? enPath : arPath, altLabel = lang === 'ar' ? 'English' : 'عربي';
  return head(L, RT.hubTitle, RT.hubDesc, canonPath, enPath, arPath, jsonld) + nav(L, altPath, altLabel) + `<main>
<div class="crumb"><a href="${RT.base}/">${L.home}</a> / ${esc(RT.guides)}</div>
<h1>${esc(RT.hubH1)}</h1><p class="lede">${RT.hubLede}</p>${body}</main>` + footer(L);
}

// Arabic rent app at /ar/rent — copy of rent/index.html with an Arabic SEO <head> (its JS detects /ar).
function arRentApp() {
  let h = rentHtml;
  h = h.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
  h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>إيجارات الإمارات — هل الإيجار عادل وهل الزيادة قانونية؟ | ميزان</title>');
  h = h.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="ما يدفعه مستأجرو الإمارات فعلاً حسب المنطقة، وحاسبة لأقصى زيادة إيجار قانونية في دبي وفق قواعد RERA.">');
  h = h.replace('<link rel="canonical" href="https://www.mizan-price.com/rent">', '<link rel="canonical" href="https://www.mizan-price.com/ar/rent">');
  h = h.replace('<meta property="og:url" content="https://www.mizan-price.com/rent">', '<meta property="og:url" content="https://www.mizan-price.com/ar/rent">');
  h = h.replace('<meta property="og:locale" content="en_AE">', '<meta property="og:locale" content="ar_AE">');
  h = h.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="إيجارات الإمارات — فحص الإيجار وحاسبة الزيادة القانونية">');
  h = h.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="ما يدفعه مستأجرو الإمارات فعلاً، وحاسبة أقصى زيادة إيجار قانونية في دبي.">');
  h = h.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="إيجارات الإمارات — فحص الإيجار وحاسبة الزيادة القانونية">');
  h = h.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="ما يدفعه مستأجرو الإمارات فعلاً، وحاسبة أقصى زيادة قانونية.">');
  return h;
}

// Arabic interactive Motor tool at /ar/motor — the live app (motor/index.html) with its <head>
// rewritten for Arabic SEO. The app's own JS detects the /ar path and renders UI in Arabic + RTL.
function arMotorApp() {
  let h = motorHtml;
  h = h.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
  h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>أسعار صيانة وإصلاح السيارات في الإمارات — تحقّق من عدالة السعر | ميزان</title>');
  h = h.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="هل عرض ورشتك عادل؟ شاهد أسعار الإمارات المعتادة لصيانة السيارة والفرامل والقابض والمكيّف والبطارية والإطارات والسمكرة والدهان وغيرها — إلى جانب ما يدفعه السائقون فعلاً.">');
  h = h.replace('<link rel="canonical" href="https://www.mizan-price.com/motor">', '<link rel="canonical" href="https://www.mizan-price.com/ar/motor">');
  h = h.replace('<link rel="alternate" hreflang="x-default" href="https://www.mizan-price.com/motor">', '<link rel="alternate" hreflang="ar" href="https://www.mizan-price.com/ar/motor"><link rel="alternate" hreflang="x-default" href="https://www.mizan-price.com/motor">');
  h = h.replace('<meta property="og:url" content="https://www.mizan-price.com/motor">', '<meta property="og:url" content="https://www.mizan-price.com/ar/motor">');
  h = h.replace('<meta property="og:locale" content="en_AE">', '<meta property="og:locale" content="ar_AE">');
  h = h.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="أسعار صيانة وإصلاح السيارات في الإمارات — تحقّق من عدالة السعر">');
  h = h.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="هل عرض ورشتك عادل؟ أسعار الإمارات المعتادة للصيانة والفرامل والقابض والمكيّف وغيرها، إلى جانب ما يدفعه السائقون فعلاً.">');
  h = h.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="أسعار صيانة وإصلاح السيارات في الإمارات — ميزان">');
  h = h.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="هل عرض ورشتك عادل؟ شاهد ما يدفعه السائقون فعلاً عبر الإمارات.">');
  return h;
}

// ===== MOTOR repair-cost guides (EN + AR) — per-job pages from motor/index.html data =====
const motorHtml = fs.readFileSync(path.join(ROOT, 'motor', 'index.html'), 'utf8');
const MCATS = eval(motorHtml.match(/const CATS=(\[[\s\S]*?\n\]);/)[1]);
const M_TIER_MULT = eval('(' + motorHtml.match(/const TIER_MULT=(\{[^;]*\});/)[1] + ')');
const M_TIER_LABEL = eval('(' + motorHtml.match(/const TIER_LABEL=(\{[^;]*\});/)[1] + ')');
const M_BODY = eval(motorHtml.match(/const BODY=(\[[^;]*\]);/)[1]);
const mSlug = c => slugify(c.label);
const M_JOB_AR = eval('(' + motorHtml.match(/const JOB_AR=(\{[^;]*\});/)[1] + ')');
const M_GROUP_AR = eval('(' + motorHtml.match(/const GROUP_AR=(\{[^;]*\});/)[1] + ')');
const M_TIER_LABEL_AR = eval('(' + motorHtml.match(/const TIER_LABEL_AR=(\{[^;]*\});/)[1] + ')');
const M_BODY_AR = eval('(' + motorHtml.match(/const BODY_AR=(\{[^;]*\});/)[1] + ')');
const mJobName = (lang, c) => lang === 'ar' ? (M_JOB_AR[c.id] || c.label) : c.label;
const mGroupName = (lang, k) => lang === 'ar' ? (M_GROUP_AR[k] || k) : k;
const mTierName = (lang, t) => lang === 'ar' ? (M_TIER_LABEL_AR[t] || M_TIER_LABEL[t]) : M_TIER_LABEL[t];
const mBodyName = (lang, b) => lang === 'ar' ? (M_BODY_AR[b.id] || b.label) : b.label;
const MOTOR_T = {
  en: {
  base: '', guides: 'Car repair costs', tool: '/motor', hub: '/motor/jobs',
  title: n => `${cap(n)} cost in the UAE (2026) — by car brand | Mizan`,
  desc: n => `What does ${n.toLowerCase()} cost in the UAE? Typical garage prices by car brand — economy to German & luxury — plus what drivers actually pay. Check if your quote is fair.`,
  h1: n => `How much does ${n.toLowerCase()} cost in the UAE?`,
  lede: n => `What ${n.toLowerCase()} typically costs at UAE garages, by car-brand tier. German and luxury cars (and large 4×4s) sit at the top; Japanese/economy cars and independent garages at the bottom — quotes vary a lot, so check yours against the range.`,
  tableTierH: n => `${cap(n)} cost by car brand`, tableBodyH: n => `${cap(n)} cost by body type`,
  thTier: 'Car brand', thBody: 'Body type', thRange: 'Typical range',
  estNote: 'Typical 2026 estimates in AED for a standard job. Actual price depends on the exact model, genuine vs aftermarket parts, and the garage — dealers charge more than independents.',
  fairH: 'How to avoid overpaying', fairP: n => `Quotes for ${n.toLowerCase()} vary widely between garages. Get two or three quotes, ask whether parts are genuine or aftermarket, and check your number against the range above and what other drivers report paying.`,
  ctaP: n => `Got a quote for ${n.toLowerCase()}? Check if it's fair in seconds.`, ctaBtn: 'Check your quote',
  relatedH: 'Other car jobs', faqH: 'Common questions',
  faqs: (n, lo, hi) => [
    { q: `How much does ${n.toLowerCase()} cost in Dubai?`, a: `${cap(n)} typically runs around AED ${lo} to ${hi} in the UAE — toward the lower end for Japanese/economy cars at an independent garage, higher for German or luxury brands and at dealers.` },
    { q: `Why does ${n.toLowerCase()} vary so much between garages?`, a: `It depends on your car's make (parts cost), whether parts are genuine or aftermarket, labour rates, and dealer vs independent garage. That's why Mizan shows the typical range next to what drivers actually pay.` },
    { q: `Is a dealer or an independent garage cheaper?`, a: `For ${n.toLowerCase()}, independent garages are usually cheaper than dealers — often noticeably — but check reviews and ask about parts and any warranty.` },
  ],
  hubTitle: 'Car service & repair costs in the UAE (2026) | Mizan',
  hubDesc: 'What car service and repairs really cost in the UAE — oil change, brakes, clutch, AC, denting & painting and more — by car brand, next to what drivers actually pay.',
  hubH1: 'Car repair & service costs', hubLede: 'What everyday car jobs cost across the UAE, by brand tier, with what drivers actually report paying. Pick a job, or <a href="/motor">check a specific quote</a>.',
  },
  ar: {
    base: '/ar', guides: 'أسعار إصلاح السيارات', tool: '/ar/motor', hub: '/ar/motor/jobs',
    title: n => `تكلفة ${n} في الإمارات (2026) — حسب ماركة السيارة | ميزان`,
    desc: n => `كم تكلفة ${n} في الإمارات؟ أسعار الورش المعتادة حسب ماركة السيارة — من الاقتصادية إلى الألمانية والفاخرة — إضافةً إلى ما يدفعه السائقون فعلاً. تحقّق إن كان سعرك عادلاً.`,
    h1: n => `كم تكلفة ${n} في الإمارات؟`,
    lede: n => `كم تكلّف ${n} عادةً في ورش الإمارات، حسب فئة ماركة السيارة. السيارات الألمانية والفاخرة (والدفع الرباعي الكبير) في الأعلى؛ السيارات اليابانية والاقتصادية والورش المستقلة في الأسفل — الأسعار تتفاوت كثيراً، فقارن سعرك بالنطاق.`,
    tableTierH: n => `تكلفة ${n} حسب ماركة السيارة`, tableBodyH: n => `تكلفة ${n} حسب نوع الهيكل`,
    thTier: 'ماركة السيارة', thBody: 'نوع الهيكل', thRange: 'النطاق المعتاد',
    estNote: 'تقديرات 2026 المعتادة بالدرهم لخدمة قياسية. السعر الفعلي يعتمد على الطراز بالضبط، والقطع الأصلية مقابل التجارية، والورشة — الوكالات أغلى من الورش المستقلة.',
    fairH: 'كيف تتجنّب الدفع الزائد', fairP: n => `تتفاوت أسعار ${n} كثيراً بين الورش. احصل على عرضين أو ثلاثة، واسأل إن كانت القطع أصلية أم تجارية، وقارن رقمك بالنطاق أعلاه وبما يبلّغ السائقون عن دفعه.`,
    ctaP: n => `حصلت على عرض لـ${n}؟ تحقّق إن كان عادلاً في ثوانٍ.`, ctaBtn: 'تحقّق من سعرك',
    relatedH: 'خدمات سيارات أخرى', faqH: 'أسئلة شائعة',
    faqs: (n, lo, hi) => [
      { q: `كم تكلفة ${n} في دبي؟`, a: `تتراوح تكلفة ${n} عادةً بين ${lo} و${hi} درهم في الإمارات — نحو الحد الأدنى للسيارات اليابانية والاقتصادية في ورشة مستقلة، وأعلى للماركات الألمانية أو الفاخرة وفي الوكالات.` },
      { q: `لماذا تتفاوت تكلفة ${n} كثيراً بين الورش؟`, a: `تعتمد على ماركة سيارتك (تكلفة القطع)، وما إن كانت القطع أصلية أم تجارية، وأجور العمل، والوكالة مقابل الورشة المستقلة. لذلك يعرض ميزان النطاق المعتاد إلى جانب ما يدفعه السائقون فعلاً.` },
      { q: `الوكالة أم الورشة المستقلة أرخص؟`, a: `بالنسبة لـ${n}، الورش المستقلة عادةً أرخص من الوكالات — غالباً بفارق ملحوظ — لكن تحقّق من التقييمات واسأل عن القطع والضمان.` },
    ],
    hubTitle: 'تكاليف صيانة وإصلاح السيارات في الإمارات (2026) | ميزان',
    hubDesc: 'كم تكلّف صيانة وإصلاح السيارات فعلاً في الإمارات — تغيير الزيت والفرامل والقابض والمكيّف والسمكرة والدهان وغيرها — حسب ماركة السيارة، إلى جانب ما يدفعه السائقون فعلاً.',
    hubH1: 'تكاليف إصلاح وصيانة السيارات', hubLede: 'كم تكلّف خدمات السيارات اليومية عبر الإمارات، حسب فئة الماركة، مع ما يبلّغ السائقون عن دفعه. اختر خدمة، أو <a href="/ar/motor">تحقّق من عرض محدّد</a>.',
  },
};

function motorGuidePage(lang, job) {
  const L = LOC[lang], RT = MOTOR_T[lang], name = mJobName(lang, job), slug = mSlug(job), sizeOnly = !!job.sizeOnly;
  const base = RT.base;
  const enPath = `/motor/${slug}`, arPath = `/ar/motor/${slug}`, canonPath = `${base}/motor/${slug}`;
  let rows, tableH, thFirst;
  if (sizeOnly) {
    thFirst = RT.thBody; tableH = RT.tableBodyH(name);
    rows = M_BODY.map(b => { const lo = round5(job.base * b.m * 0.72), hi = round5(job.base * b.m * 1.5); return `<tr><td>${esc(mBodyName(lang, b))}</td><td class="r">${L.range(lo, hi)}</td></tr>`; }).join('');
  } else {
    thFirst = RT.thTier; tableH = RT.tableTierH(name);
    rows = ['economy', 'american', 'euro', 'german', 'luxury'].map(t => { const m = M_TIER_MULT[t]; const lo = round5(job.base * m * 0.72), hi = round5(job.base * m * 1.5); return `<tr><td>${esc(mTierName(lang, t))}</td><td class="r">${L.range(lo, hi)}</td></tr>`; }).join('');
  }
  const faqLo = fmt(job.base * 0.72), faqHi = fmt(job.base * (sizeOnly ? 1.4 : 1.9) * 1.5);
  const faqs = RT.faqs(name, faqLo, faqHi);
  const related = MCATS.filter(o => o.group === job.group && o.id !== job.id).slice(0, 4).map(o => `<a href="${base}/motor/${mSlug(o)}">${esc(mJobName(lang, o))}</a>`).join('');
  const jsonld = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": L.home, "item": `${ORIGIN}${base}/` },
      { "@type": "ListItem", "position": 2, "name": RT.guides, "item": `${ORIGIN}${RT.hub}` },
      { "@type": "ListItem", "position": 3, "name": name, "item": `${ORIGIN}${canonPath}` }] },
    { "@type": "FAQPage", "inLanguage": lang, "mainEntity": faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) }
  ] };
  const altPath = lang === 'ar' ? enPath : arPath, altLabel = lang === 'ar' ? 'English' : 'عربي';
  return head(L, RT.title(name), RT.desc(name), canonPath, enPath, arPath, jsonld) + nav(L, altPath, altLabel) + `<main>
<div class="crumb"><a href="${base}/">${L.home}</a> / <a href="${RT.hub}">${esc(RT.guides)}</a> / ${esc(name)}</div>
<h1>${esc(RT.h1(name))}</h1>
<p class="lede">${RT.lede(esc(name))}</p>
<h2>${esc(tableH)}</h2>
<table><thead><tr><th>${esc(thFirst)}</th><th class="ra">${esc(RT.thRange)}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">${esc(RT.estNote)}</p>
<h2>${esc(RT.fairH)}</h2><p>${RT.fairP(esc(name))}</p>
<div class="ctabox"><p>${esc(RT.ctaP(name))}</p><a class="btn" href="${RT.tool}?job=${job.id}">${esc(RT.ctaBtn)} ${L.arrow}</a></div>
<h2>${esc(RT.faqH)}</h2>
${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
${related ? `<h2>${esc(RT.relatedH)}</h2><div class="related">${related}</div>` : ''}
</main>` + footer(L);
}

function motorHub(lang) {
  const L = LOC[lang], RT = MOTOR_T[lang], base = RT.base;
  const enPath = '/motor/jobs', arPath = '/ar/motor/jobs', canonPath = `${base}/motor/jobs`;
  const groups = []; MCATS.forEach(c => { let g = groups.find(x => x.k === c.group); if (!g) { g = { k: c.group, items: [] }; groups.push(g); } g.items.push(c); });
  const body = groups.map(g => `<div class="idxgroup"><h3>${esc(mGroupName(lang, g.k))}</h3><div class="idxgrid">${g.items.map(c => `<a href="${base}/motor/${mSlug(c)}">${esc(mJobName(lang, c))}</a>`).join('')}</div></div>`).join('');
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", "name": RT.hubTitle, "url": `${ORIGIN}${canonPath}`, "inLanguage": lang, "description": RT.hubDesc };
  const altPath = lang === 'ar' ? enPath : arPath, altLabel = lang === 'ar' ? 'English' : 'عربي';
  return head(L, RT.hubTitle, RT.hubDesc, canonPath, enPath, arPath, jsonld) + nav(L, altPath, altLabel) + `<main>
<div class="crumb"><a href="${base}/">${L.home}</a> / ${esc(RT.guides)}</div>
<h1>${esc(RT.hubH1)}</h1><p class="lede">${RT.hubLede}</p>${body}</main>` + footer(L);
}

// ---- write everything ----
const pricesDir = path.join(ROOT, 'prices');
fs.mkdirSync(pricesDir, { recursive: true });
fs.writeFileSync(path.join(pricesDir, 'page.css'), CSS);

let pages = 0;
for (const key of ['en', 'ar']) {
  const L = LOC[key];
  const baseDir = key === 'ar' ? path.join(ROOT, 'ar', 'prices') : pricesDir;
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(path.join(baseDir, 'index.html'), hubPage(L)); pages++;
  services.forEach(s => {
    const dir = path.join(baseDir, s.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), servicePage(L, s)); pages++;
  });
}
fs.mkdirSync(path.join(ROOT, 'ar'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'ar', 'index.html'), arApp()); pages++;

// rent guides (EN + AR) — per-community pages + hub, plus the Arabic rent app
for (const key of ['en', 'ar']) {
  const baseDir = key === 'ar' ? path.join(ROOT, 'ar', 'rent') : path.join(ROOT, 'rent');
  fs.mkdirSync(path.join(baseDir, 'areas'), { recursive: true });
  fs.writeFileSync(path.join(baseDir, 'areas', 'index.html'), rentHub(key)); pages++;
  RAREAS.forEach(a => { const d = path.join(baseDir, slugify(a.name)); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), rentGuidePage(key, a)); pages++; });
}
fs.writeFileSync(path.join(ROOT, 'ar', 'rent', 'index.html'), arRentApp()); pages++;

// motor repair-cost guides (EN + AR) — per-job pages + hub, plus the Arabic motor app
for (const key of ['en', 'ar']) {
  const baseDir = key === 'ar' ? path.join(ROOT, 'ar', 'motor') : path.join(ROOT, 'motor');
  fs.mkdirSync(path.join(baseDir, 'jobs'), { recursive: true });
  fs.writeFileSync(path.join(baseDir, 'jobs', 'index.html'), motorHub(key)); pages++;
  MCATS.forEach(j => { const d = path.join(baseDir, mSlug(j)); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), motorGuidePage(key, j)); pages++; });
}
fs.writeFileSync(path.join(ROOT, 'ar', 'motor', 'index.html'), arMotorApp()); pages++;

// ---- sitemap (en + ar) ----
const enUrls = [ORIGIN + '/', ORIGIN + '/rent', ORIGIN + '/motor', ORIGIN + '/prices/', ...services.map(s => `${ORIGIN}/prices/${s.slug}`)];
const rentUrls = [ORIGIN + '/rent/areas', ...RAREAS.map(a => `${ORIGIN}/rent/${slugify(a.name)}`)];
const motorUrls = [ORIGIN + '/motor/jobs', ...MCATS.map(j => `${ORIGIN}/motor/${mSlug(j)}`)];
const arRentUrls = [ORIGIN + '/ar/rent', ORIGIN + '/ar/rent/areas', ...RAREAS.map(a => `${ORIGIN}/ar/rent/${slugify(a.name)}`)];
const arMotorUrls = [ORIGIN + '/ar/motor', ORIGIN + '/ar/motor/jobs', ...MCATS.map(j => `${ORIGIN}/ar/motor/${mSlug(j)}`)];
const arUrls = [ORIGIN + '/ar/', ORIGIN + '/ar/prices/', ...services.map(s => `${ORIGIN}/ar/prices/${s.slug}`)];
const all = [...enUrls, ...rentUrls, ...motorUrls, ...arRentUrls, ...arMotorUrls, ...arUrls];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  all.map(u => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>${u === ORIGIN + '/' ? '1.0' : '0.7'}</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

console.log(`Generated ${pages} pages (EN + AR); sitemap has ${all.length} URLs.`);
