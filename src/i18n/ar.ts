// All UI strings live here (AGENTS.md §6). No hard-coded UI text in components.
// The status labels are fixed by AGENTS.md §4: do not rename them.
export const ar = {
  "app.name": "عَزْو",
  "app.tagline": "انقل النص كما ورد، ومن حيث ورد.",
  "app.description": "أداة مساعدة لكتّاب المحتوى الدعوي: تطابق الآيات والأحاديث المنقولة مع مصادرها المعتمدة.",

  "status.MATCH": "مطابق لنص المصدر",
  "status.DIFFERS": "مختلف في اللفظ أو المرجع",
  "status.NOT_FOUND": "لم يُتحقق منه ضمن المصادر المتاحة",
  "status.NEEDS_SPECIALIST": "يحتاج مراجعة مختص",
  "status.ERROR": "تعذّر إكمال التحقق",

  "explanation.generatedLabel": "شرح مولّد آلياً",

  "kind.quran": "آية قرآنية",
  "kind.hadith": "حديث نبوي",

  // The covered sources by name (book titles, as the sources are known).
  "collection.quran": "القرآن الكريم",
  "collection.bukhari": "صحيح البخاري",
  "collection.muslim": "صحيح مسلم",

  // One sentence per reason code (src/core/status). {ref} is the citation of the source record,
  // {kind} a kind label, {coverage} the covered sources. Gentle wording; the word «صحيح» is never
  // used here, because it can be read as a judgment on authenticity (tested).
  "reason.MATCH_REF_OK": "النص مطابق لنص المصدر، والمرجع المذكور في المسودة يوافقه: {ref}.",
  "reason.MATCH_NO_REFERENCE": "النص مطابق لنص المصدر. لم يُذكر له مرجع في المسودة، ويُستحسن إضافته: {ref}.",
  "reason.REF_MISMATCH_AYAH": "النص مطابق للآية، لكن رقمها في المسودة لا يطابق المصدر. المرجع في المصدر: {ref}.",
  "reason.REF_MISMATCH_SURAH": "النص مطابق للآية، لكن السورة المذكورة في المسودة لا توافق المصدر. المرجع في المصدر: {ref}.",
  "reason.WORDING_DIFF": "في النص المنقول اختلاف في اللفظ عن نص المصدر ({ref}). يُرجى مراجعة نص المصدر المعروض واعتماده عند النقل.",
  "reason.KIND_MISMATCH": "هذا النص موجود في المصادر المغطاة بوصفه {kind} ({ref})، وهذا يخالف نسبته في المسودة. يُرجى مراجعة النسبة.",
  "reason.NO_RECORD_IN_COVERED_SOURCES": "لم نجد هذا النص في المصادر المغطاة ({coverage}). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.",
  "reason.REF_NOT_CHECKED": "النص مطابق لنص المصدر ({ref})، لكننا لم نتمكن من التحقق من المرجع المذكور في المسودة. يُرجى مقارنته بمرجع المصدر قبل النشر.",
  "reason.LOW_CONFIDENCE_MATCH": "وجدنا في المصادر المغطاة نصاً قريباً ({ref})، لكن التشابه لا يكفي للجزم بأنه المقصود. يُرجى مراجعة مختص أو الرجوع إلى المصدر قبل النشر.",
  "reason.AMBIGUOUS_CANDIDATES": "يشبه هذا النص أكثر من موضع في المصادر المغطاة بألفاظ مختلفة، ولا يمكننا تحديد المقصود منها. يُرجى مراجعة مختص.",
  "reason.SOURCE_NOT_REVIEWED": "وجدنا هذا النص في سجل لم تكتمل مراجعته بعد ({ref})، فلا نعتمد عليه في المطابقة. يُرجى الرجوع إلى المصدر مباشرة.",
  "reason.UNCLEAR_ATTRIBUTION": "نسبة هذا النص في المسودة غير محددة (لم يُذكر قائل ولا كتاب بعينه)، فلا يمكننا التحقق منها. يُرجى مراجعة مختص.",
  "reason.INTERPRETIVE_CLAIM": "هذه العبارة تتضمن استنباطاً أو تفسيراً، والأداة لا تفسّر النصوص ولا تؤيد الاستنباط ولا تنفيه. يُرجى مراجعة مختص.",
  "reason.PERSONAL_RULING": "هذه العبارة تتضمن حكماً في حالة خاصة، والأداة لا تصدر الفتاوى. يُرجى الرجوع إلى جهة إفتاء مؤهلة.",

  // The system state ERROR for one item (src/core/review.ts): a fault of the tool, never a statement
  // about the text.
  "item.error.INTERNAL_ERROR": "تعذّر إكمال التحقق من هذا النص بسبب خلل في الأداة، ولا يدل ذلك على شيء في النص نفسه. يُرجى إعادة المحاولة.",

  // Parts of {ref} and {coverage}.
  "reason.ref.range": "من {first} إلى {last}",
  "reason.ref.more": "{ref} (وفي {count} من المواضع الأخرى)",
  "list.separator": "، ",

  // API v1 error messages (src/server/review-handler.ts), one per code of API_ERROR_CODES.
  "api.error.INVALID_REQUEST": "صيغة الطلب غير صالحة. المطلوب نص المسودة في الحقل text.",
  "api.error.EMPTY_DRAFT": "المسودة فارغة. يُرجى لصق النص المراد مراجعته.",
  "api.error.DRAFT_TOO_LONG": "المسودة أطول من الحد المسموح به ({max} حرفاً). يُرجى تقسيمها ومراجعة كل جزء على حدة.",
  "api.error.ORIGIN_NOT_ALLOWED": "هذا الموقع غير مصرّح له باستخدام الخدمة.",
  "api.error.RATE_LIMITED": "عدد الطلبات كبير في وقت قصير. يُرجى الانتظار قليلاً ثم إعادة المحاولة.",
  "api.error.INTERNAL_ERROR": "تعذّر إكمال التحقق، ولم تُراجَع المسودة. يُرجى إعادة المحاولة لاحقاً.",

  // ---------------------------------------------------------------------------------------------
  // UI (src/app, src/components). The tool's own labels never use «صحيح» for a text or a reference
  // (AGENTS.md §8, tested): the source's text is «نص المصدر», its reference «المرجع في المصدر».
  // ---------------------------------------------------------------------------------------------

  "banner.aiTool": "أداة مدعومة بالذكاء الاصطناعي، وليست بديلاً عن المختص.",
  "a11y.skipToContent": "انتقل إلى المحتوى",
  "header.home": "عَزْو، الصفحة الرئيسية",
  "header.nav": "التنقل الرئيسي",

  // Home. {coverage} is built from GET /api/v1/health, never written here (docs/DECISIONS.md D-18).
  "home.scope": "يراجع النقول من: {coverage}. لا يُصدر فتاوى ولا يحكم على الأحاديث.",
  "home.scope.loading": "جارٍ تحميل قائمة المصادر المغطاة…",
  "home.scope.unavailable": "تعذّر تحميل قائمة المصادر المغطاة الآن. الأداة لا تُصدر فتاوى ولا تحكم على الأحاديث.",
  "home.sourcesLine": "المصادر المغطاة: {coverage} · إصدار البيانات: {version}",
  "home.draft.label": "المسودة",
  "home.draft.placeholder": "الصق مسودتك هنا…",
  "home.draft.hint": "لا يحفظ «عَزْو» المسودة ولا يسجّلها. تُراجَع ثم تُعاد النتيجة فقط.",
  "home.example": "مثال",
  "home.submit": "راجع النقول",
  "home.submit.loading": "جارٍ مراجعة النقول…",
  // Shown when GET /api/v1/health says llmConfigured: false (the LLM_* variables are not set).
  "home.llm.notConfigured": "لم تُضبط مفاتيح النموذج اللغوي على الخادم، فتُستخرج النقول بالقواعد الآلية وحدها.",
  "home.guide.title": "طريقة الاستعمال",
  "home.guide.1": "الصق مسودتك",
  "home.guide.2": "راجع النقول",
  "home.guide.3": "قارن بنص المصدر",
  // The demo draft uses forms the regex extractor reads (src/core/extract): ﴿…﴾ after a Quran
  // phrase, and «…» after «قال رسول الله».
  "home.example.draft":
    "الصبر من أعظم ما يتزود به المؤمن. قال الله تعالى: ﴿يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع الصابرين﴾ [البقرة: 153].\nوقال سبحانه: ﴿إن مع العسر يسرا﴾ [الشرح: 7].\nوقال تعالى: ﴿الذين إذا أصابتهم مصيبة قالوا إنا لله وإنا له راجعون﴾ [البقرة: 156].\nوقال رسول الله ﷺ: «إنما الأعمال بالنيات».",

  // The forms the regex extractor reads (ATTRIBUTION_PATTERNS in src/core/extract). A test checks
  // that every phrase of that list is named here.
  "extract.formsNote":
    "تتعرف القواعد الآلية على النص بين القوسين ﴿ ﴾ أينما ورد، وعلى النص الذي يلي إحدى هذه العبارات، بين علامتي تنصيص أو بعد نقطتين حتى نهاية الجملة: «قال تعالى»، «قال الله تعالى»، «قال سبحانه»، «يقول الله»، «قوله تعالى»، «قال رسول الله»، «قال النبي»، «قال ﷺ»، «عن النبي … قال»، «في الحديث»، «ورد عنه»، «في الأثر»، «قال بعض السلف»، «يروى»، «يقال إن النبي».",

  // States.
  "state.empty": "الصق مسودتك ثم اضغط «راجع النقول»، أو جرّب «مثال».",
  "state.loading": "جارٍ مراجعة النقول…",
  "state.error.title": "تعذّر إكمال التحقق",
  "state.error.retry": "أعد المحاولة",
  "state.error.network": "تعذّر الاتصال بالخدمة، ولم تُراجَع المسودة. تحقق من اتصالك ثم أعد المحاولة.",
  "state.error.unexpected": "وصل من الخدمة رد غير متوقع، فلم تُعرض أي نتيجة. يُرجى إعادة المحاولة لاحقاً.",
  "state.noQuotes.title": "لم نعثر على نقول في المسودة",
  "state.noQuotes.body": "هذا لا يعني خلوّ المسودة من النقول؛ فقد تكون مكتوبة بصيغة لا تتعرف عليها الأداة بعد.",
  "state.stale": "عُدّلت المسودة بعد المراجعة؛ النتائج أدناه للنص الذي رُوجع. اضغط «راجع النقول» لمراجعة النص الجديد.",

  // Results.
  "results.title": "نتيجة المراجعة",
  "results.summary": "{count} نقول: {parts}",
  "results.summary.MATCH": "{n} مطابق",
  "results.summary.DIFFERS": "{n} مختلف",
  "results.summary.NEEDS_SPECIALIST": "{n} يحتاج مراجعة",
  "results.summary.NOT_FOUND": "{n} لم يُتحقق منه",
  "results.summary.ERROR": "{n} تعذّر التحقق منه",
  "results.summary.separator": " · ",
  "results.notices": "تنبيهات",
  "results.draft.title": "المسودة كما رُوجعت",
  "results.draft.hint": "اضغط على نقل مظلَّل للانتقال إلى بطاقته.",
  "results.draft.markLabel": "النقل {index}: {status}",
  "results.cards.title": "النقول",

  "warning.LLM_UNAVAILABLE_REGEX_ONLY": "استُخرجت النقول بالقواعد الآلية وحدها دون نموذج لغوي، فقد لا تُلتقط بعض النقول، ولم يُولَّد أي شرح.",
  "warning.LLM_SPAN_NOT_IN_DRAFT": "أعاد النموذج اللغوي نصاً لا يوجد في مسودتك بلفظه، فاستُبعد ولم يُراجَع. لا يُعرض هنا إلا ما ورد في المسودة.",
  "warning.NOT_A_DRAFT": "عَزْو يراجع النقول في مسودتك، ولا يقترح أدلة أو أحاديث.",
  "warning.ITEM_LIMIT_REACHED": "في المسودة نقول أكثر من الحد الذي يُراجَع في المرة الواحدة، فلم تُراجَع النقول المتأخرة. يُرجى تقسيم المسودة ومراجعة كل جزء على حدة.",
  "warning.unknown": "تنبيه من الخدمة: {code}",

  // One card per item.
  "card.title": "النقل {index}",
  "card.claimedAs": "ورد في المسودة بوصفه: {kind}",
  "kind.unclear_attribution": "نص غير محدد النسبة",
  "kind.interpretive_claim": "استنباط أو حكم",
  "card.draft.label": "من مسودتك",
  "card.citedReference": "المرجع المذكور في المسودة: {raw}",
  "card.source.label": "نص المصدر",
  "card.source.reference": "المرجع في المصدر: {ref}",
  "card.source.link": "المصدر: {name}",
  "card.source.pending": "سجل لم تكتمل مراجعته",
  "card.grade": "الحكم كما ورد في بيانات المصدر: {text} — {by}",
  "card.reason.label": "النتيجة",
  "card.occurrences.label": "مواضع النص في المصادر",
  "card.occurrences.item": "الموضع {index}: {ref}",
  "card.compare.show": "قارن النصين",
  "card.compare.hide": "أخفِ المقارنة",
  "card.compare.title": "مقارنة النصين",
  "card.compare.draft": "نصّك",
  "card.compare.source": "نص المصدر",
  "card.copy": "انسخ نص المصدر مع المرجع",
  "card.copy.done": "نُسخ نص المصدر مع المرجع.",
  "card.copy.failed": "تعذّر النسخ. يمكنك تحديد النص ونسخه يدوياً.",

  // Typographic marks a kind's source text is shown between.
  "quote.quran.open": "﴿",
  "quote.quran.close": "﴾",

  // Diff marks: words, never a judgment on the text.
  "diff.legend": "دلالة التظليل",
  "diff.replace.draft": "لفظ في مسودتك يخالف نص المصدر",
  "diff.replace.source": "لفظ المصدر في هذا الموضع",
  "diff.insert": "لفظ في مسودتك ليس في نص المصدر",
  "diff.delete": "لفظ في نص المصدر ليس في مسودتك",

  // Footer and the three pages.
  "footer.nav": "روابط",
  "footer.privacy": "إشعار الخصوصية",
  "footer.sources": "المصادر",
  "footer.how": "كيف تعمل الأداة",
  "page.backHome": "العودة إلى الصفحة الرئيسية",

  // /privacy says what docs/PRIVACY.md says, and no more. Update both together.
  "privacy.title": "إشعار الخصوصية",
  "privacy.intro": "ما تفعله «عَزْو» بالمسودة، بحسب شيفرة التطبيق في 2026-10-03.",
  "privacy.processed.title": "ما الذي يُعالَج",
  "privacy.processed.1": "تُرسل المسودة التي تقدّمها إلى خادم «عَزْو»، وتُقارن في الذاكرة بنصوص المصادر، ثم تُعاد النتيجة.",
  "privacy.processed.2": "إذا ضُبط نموذج لغوي على الخادم، أُرسلت المسودة كاملة إلى مزوّد النموذج (OpenAI، وهو المزوّد الوحيد المدعوم الآن) لاستخراج النقول منها، ولا تُرسل لغرض آخر. يطلب «عَزْو» من المزوّد ألا يخزّن الرد، وما يحتفظ به المزوّد مما يُرسل إليه تحكمه شروطه هو. وإذا لم يُضبط نموذج، استُخرجت النقول بقواعد آلية على خادم «عَزْو» ولم تغادر المسودة الخادم.",
  "privacy.notKept.title": "ما لا يُحفظ",
  "privacy.notKept.1": "لا يخزّن «عَزْو» المسودة: لا قاعدة بيانات ولا ملف ولا ذاكرة مؤقتة. تبقى في ذاكرة الخادم مدة الطلب فقط.",
  "privacy.notKept.2": "لا يسجّل «عَزْو» المسودة، كلها أو بعضها، ولا أي نقل مأخوذ منها، ولا ما يعيده النموذج اللغوي.",
  "privacy.notKept.3": "لا تُخزَّن الردود مؤقتاً: كل رد يحمل الترويسة Cache-Control: no-store، وعامل الخدمة في التطبيق (عند إضافته) يخزّن واجهة التطبيق فقط.",
  "privacy.notKept.4": "لا حسابات ولا ملفات تعريف ارتباط ولا تحليلات في التطبيق.",
  "privacy.recorded.title": "ما يسجّله الخادم",
  "privacy.recorded.1": "سطر واحد لكل طلب، فيه فقط: معرّف عشوائي للطلب، وحالة HTTP، ورمز النتيجة، وطول المسودة بعدد الأحرف، والتوقيتات، وعدد النقول، وعدد كل حالة، ورموز التنبيهات. ليس في السجل حقل لأي نص، ويتحقق اختبار آلي من أن السجل لا يحوي شيئاً من المسودة ولا عنواناً.",
  "privacy.address.title": "عنوانك الشبكي",
  "privacy.address.1": "يحتفظ محدِّد معدّل الطلبات بعنوان العميل في ذاكرة الخادم، مفتاحاً فقط، إلى أن يتجدد رصيده (نحو دقيقة، وبحد أقصى 10,000 عنوان). لا يُسجَّل العنوان ولا يُكتب على القرص ولا يُعاد في أي رد. قد يحتفظ مزوّد الاستضافة بسجلات وصول خاصة به، وهي خارج هذه الشيفرة.",
  "privacy.retention.title": "مدة الاحتفاظ",
  "privacy.retention.1": "لا شيء على خادم «عَزْو»: لا يبقى من المسودة شيء بعد انتهاء الطلب. أما مزوّد النموذج اللغوي فمدة احتفاظه بما يُرسل إليه تحددها شروطه.",
  "privacy.limits.title": "حدود هذا الإشعار",
  "privacy.limits.1": "يصف هذا الإشعار شيفرة التطبيق. لم يُتحقق منه على سجلات مستضيف منشور، ولا يصف ما يفعله مزوّد النموذج اللغوي بما يصله؛ فذلك تحكمه شروط المزوّد.",

  // /sources: a summary of docs/SOURCES.md. A source is shown only when the API's coverage lists
  // its collections (AGENTS.md §6, "Coverage must be true").
  "sources.title": "المصادر",
  "sources.intro": "المصادر التي يبحث فيها «عَزْو» الآن، كما في سجل المصادر. لا يُعرض نص ولا مرجع إلا من سجل في هذه المصادر.",
  "sources.loading": "جارٍ تحميل قائمة المصادر المغطاة…",
  "sources.unavailable": "تعذّر تحميل قائمة المصادر المغطاة الآن. يُرجى إعادة المحاولة لاحقاً.",
  "sources.version": "إصدار البيانات: {version}",
  "sources.field.source": "المصدر",
  "sources.field.version": "الإصدار",
  "sources.field.license": "الترخيص",
  "sources.field.numbering": "الترقيم",
  "sources.field.review": "المراجعة",
  "sources.field.notes": "ملاحظات",
  "sources.quran.title": "القرآن الكريم",
  "sources.quran.source": "Quranpedia.net — «مصحف حفص» (المصحف رقم 1). وصف المصدر: «القرآن الكريم برواية حفص عن عاصم، موافق لطبعة مجمع الملك فهد لطباعة المصحف الشريف».",
  "sources.quran.version": "بيان التنزيل 2026-10-02؛ إصدار الملف 2026-09-30.",
  "sources.quran.license": "رخصة بيانات Quranpedia.net: الاستخدام حر، وإعادة نشر البيانات تستلزم نسبتها إلى Quranpedia.net برابط مع ذكر إصدار الملف.",
  "sources.quran.numbering": "عدّ حفص (الكوفي): 114 سورة و6236 آية. البسملة ليست من نص الآية إلا في الآية الأولى من الفاتحة.",
  "sources.quran.review": "اعتمد مالك المشروع المجموعة للمطابقة النصية في 2026-10-02، بعد مقارنته عشر آيات بمصحف المدينة النبوية.",
  "sources.quran.notes": "النص بالإملاء المعتاد مع التشكيل الكامل وعلامات الوقف، وليس بالرسم العثماني. ويُستعمل نص ثانٍ من Quranpedia.net (المصحف رقم 2، حفص بالرسم العثماني) للبحث فقط: لا يُعرض ولا يُقارن به ولا يُستشهد به.",
  "sources.quran.linkLabel": "Quranpedia.net",
  "sources.hadith.title": "الحديث النبوي",
  "sources.hadith.source": "مستودع fawazahmed0/hadith-api، النسختان ara-bukhari (صحيح البخاري) و ara-muslim (صحيح مسلم).",
  "sources.hadith.version": "الإيداع df57907 (2026-06-03).",
  "sources.hadith.license": "The Unlicense (ملك عام). لا يذكر المستودع الطبعة المطبوعة التي رُقمن منها النص العربي.",
  "sources.hadith.numbering": "صحيح البخاري: رقم الحديث في المصدر (1–7563). صحيح مسلم: ترقيم محمد فؤاد عبد الباقي (1–3033). بعض الأرقام غير موجودة في البيانات، فعدم العثور على نص لا يعني أنه ليس في الكتاب.",
  "sources.hadith.review": "اعتمد مالك المشروع المجموعتين في 2026-10-02 بعد فحوص آلية ومقارنة عيّنة؛ ولا يعني ذلك أن كل سجل قورن بطبعة مطبوعة. السجلات المستثناة تبقى «لم تكتمل مراجعته»، بلا حكم، ولا تُنتج «مطابق لنص المصدر».",
  "sources.hadith.notes": "استُعملت «الدرر السنية» (dorar.net) للتحقق من عيّنات فقط؛ ليست مصدراً للمطابقة ولا يعتمد عليها التطبيق عند التشغيل، وحقوقها محفوظة لمؤسسة الدرر السنية.",
  "sources.hadith.linkLabel": "fawazahmed0/hadith-api",

  // /how-it-works.
  "how.title": "كيف تعمل الأداة",
  "how.intro": "«عَزْو» يعرض هل النص المنقول موجود في المصدر بهذا اللفظ، ومن أين. لا يثبت صحة النص ولا يحكم عليه.",
  "how.steps.title": "الخطوات",
  "how.steps.1": "يستخرج النقول من المسودة. كل نقل هو مقطع من نصك كما كتبته، دون تغيير.",
  "how.steps.2": "يقرأ المرجع الذي ذكرته بجانب النقل، إن وُجد، بقواعد ثابتة.",
  "how.steps.3": "يبحث عن النص في سجلات المصادر المغطاة، ويقارنه بنص المصدر كلمةً كلمة.",
  "how.steps.4": "يحدد الحالة بقواعد ثابتة مختبرة. النموذج اللغوي لا يقرر حالةً ولا يُعتمد على ذاكرته مصدراً.",
  "how.steps.5": "يعرض نص المصدر ومرجعه والفروق في اللفظ. لا يغيّر مسودتك ولا يستبدل فيها شيئاً.",
  "how.statuses.title": "الحالات الأربع",
  "how.status.MATCH": "النص موجود في سجل مراجَع بهذا اللفظ، والمرجع المذكور (إن وُجد) يوافقه.",
  "how.status.DIFFERS": "وُجد نص قريب، لكن اللفظ يختلف، أو المرجع لا يوافق المصدر، أو النسبة تخالف نوع النص.",
  "how.status.NOT_FOUND": "لم يوجد سجل كافٍ في المصادر المغطاة. لا يعني ذلك حكماً على النص، ولا أنه غير موجود في مصادر أخرى.",
  "how.status.NEEDS_SPECIALIST": "الأدلة لا تكفي للجزم، أو العبارة استنباط أو حكم. الأداة تتوقف وتحيل إلى المختص.",
  "how.status.ERROR": "خلل في الأداة حال دون إتمام التحقق من هذا النص. لا يدل على شيء في النص نفسه.",
  "how.limits.title": "ما لا تفعله الأداة",
  "how.limits.1": "لا تُصدر فتاوى، ولا تفسّر الآيات، ولا تحكم على الأحاديث. الحكم يُعرض فقط إذا كان في بيانات المصدر، منسوباً إلى صاحبه.",
  "how.limits.2": "لا تبحث إلا في المصادر المغطاة المذكورة في الصفحة الرئيسية وصفحة المصادر.",
  "how.limits.3": "أي شرح مولَّد آلياً يُعرض في مربع منفصل بعنوان «شرح مولّد آلياً»، ولا يُخلط بنص المصدر.",
  "how.limits.4": "هي أداة مدعومة بالذكاء الاصطناعي، وليست عالماً ولا بديلاً عن المختص.",
} as const;

export type MessageKey = keyof typeof ar;

export function t(key: MessageKey): string {
  return ar[key];
}

// t() with every {name} replaced. A placeholder with no value is a programming error: it throws
// rather than show a sentence with a hole in it.
export function format(key: MessageKey, values: Readonly<Record<string, string | number>>): string {
  return ar[key].replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!Object.hasOwn(values, name)) throw new Error(`Message "${key}" needs a value for {${name}}`);
    return String(values[name]);
  });
}
