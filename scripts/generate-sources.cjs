#!/usr/bin/env node
/**
 * Generates sources.json with open-source platforms for backlink verification.
 * Run: node scripts/generate-sources.js
 *
 * Each source now also carries `cors_ok`:
 *   true  -> the endpoint sends permissive CORS headers (or supports MediaWiki's
 *            `origin=*` trick), so the browser-side "Tarama Başlat" scan can call
 *            it directly with fetch().
 *   false -> the endpoint does NOT support cross-origin browser fetches (this is
 *            true of almost every ordinary website). These sources are still
 *            checked perfectly reliably by the weekly GitHub Actions run
 *            (scripts/verify-backlinks.cjs), which runs in Node and has no CORS
 *            restriction at all. The browser scan will not report these as
 *            "Hata" — see src/lib/verify.ts.
 *
 * Sources that are effectively impossible to verify at all (dead wikis, search
 * engines that hard-block non-browser traffic, endpoints that don't actually
 * exist) have been removed rather than left to fail forever.
 */
const fs = require("fs");
const path = require("path");

const PATTERN = "immaculate\\.tr";
let order = 0;
function next() { return ++order; }

const sources = [];

function add(id, name, type, baseUrl, searchUrl, icon, color, corsOk = false) {
  sources.push({
    id, name,
    platform_type: type,
    base_url: baseUrl,
    search_url_template: searchUrl,
    verify_url_pattern: PATTERN,
    is_active: true,
    cors_ok: corsOk,
    logo_icon: icon,
    color,
    sort_order: next(),
  });
}

// === WIKIPEDIA — all live language editions ===
// NOTE: "zza" (Zaza Wikipedia) was rejected by the Wikimedia Language Committee
// and deleted — the subdomain has never pointed at a live wiki, so it's removed.
// "min-nan" was a bogus/duplicate code — the real domain is "zh-min-nan".
const wikiLangs = [
  "en","tr","de","fr","es","it","ru","ja","zh","pt","ar","ko","hi","fa","vi","id","ms","th","nl","pl",
  "sv","uk","cs","fi","he","no","da","hu","ro","el","ca","sr","sk","bg","sl","hr","lt","lv","et","ga",
  "cy","is","mt","lb","eu","gl","an","br","co","fur","li","lij","lmo","nap","pms","rm","sc","scn","vec",
  "wa","zh-yue","zh-classical","gan","hak","wuu","kl","chr","haw","ht","pap","pih","tn",
  "ts","xh","zu","st","ss","ve","af","am","ang","arz","ast","az","ba","be","be-tarask","bcl","bi","bm",
  "bn","bo","bs","bug","bxr","cdo","ce","ceb","ch","cho","chy","ckb","cr","crh","cu","cv","cy","diq",
  "dsb","dv","dz","ee","eml","eo","ext","ff","fiu-vro","fy","gag","gd","gn","gom","gu","gv","ha","hif",
  "hsb","hy","ia","ie","ig","ii","ik","ilo","io","iu","jam","jbo","jv","ka","kaa","kab","kbd","kg","ki",
  "kj","kk","km","kn","ko","kr","ks","ksh","ku","kv","kw","ky","la","lad","lb","lbe","lg","ln","lo",
  "ltg","mai","mdf","mg","mh","mhr","mi","min","mk","ml","mn","mr","mrj","ms","mus","mwl","my","myv",
  "mzn","na","nah","nds","nds-nl","ne","new","ng","nl","nn","no","nr","nso","nv","ny","oc","om","or",
  "os","pa","pag","pam","pap","pdc","pfl","pi","pl","pms","pnb","ps","pt","qu","rm","rmy","rn","ro",
  "roa-rup","roa-tara","ru","rue","rw","sa","sah","sc","scn","sco","sd","se","sg","sh","si","simple",
  "sk","sl","sm","sn","so","sq","sr","srn","ss","st","stq","su","sv","sw","szl","ta","te","tet","tg",
  "th","ti","tk","tl","tn","to","tpi","tr","ts","tt","tum","tw","ty","udm","ug","uk","ur","uz","ve",
  "vec","vep","vi","vls","vo","wa","war","wo","wuu","xal","xh","yi","yo","za","zh","zh-min-nan","zh-yue",
  "zu","aa","ak","bm","chy","ik","ii","kj","kg","ki","kj","kr","kv","lg","ln","mh","ms","mus","ng","nr",
  "nso","nv","ny","om","or","pa","pam","pap","pdc","pfl","pi","pms","pnb","ps","qu","rmy","rn","sa",
  "sah","sc","scn","sco","sd","se","sg","sh","si","simple","sk","sl","sm","sn","so","sq","srn","ss",
  "st","stq","su","sw","szl","ta","te","tet","tg","ti","tk","tl","tn","to","tpi","ts","tt","tum","tw",
  "ty","udm","ug","ur","uz","ve","vec","vep","vls","vo","wa","war","wo","xal","yi","yo","za",
];

const wikiLangNames = {
  en: "English", tr: "Turkish", de: "German", fr: "French", es: "Spanish", it: "Italian",
  ru: "Russian", ja: "Japanese", zh: "Chinese", pt: "Portuguese", ar: "Arabic", ko: "Korean",
  hi: "Hindi", fa: "Persian", vi: "Vietnamese", id: "Indonesian", ms: "Malay", th: "Thai",
  nl: "Dutch", pl: "Polish", sv: "Swedish", uk: "Ukrainian", cs: "Czech", fi: "Finnish",
  he: "Hebrew", no: "Norwegian", da: "Danish", hu: "Hungarian", ro: "Romanian", el: "Greek",
  ca: "Catalan", sr: "Serbian", sk: "Slovak", bg: "Bulgarian", sl: "Slovenian", hr: "Croatian",
  lt: "Lithuanian", lv: "Latvian", et: "Estonian", ga: "Irish", cy: "Welsh", is: "Icelandic",
  mt: "Maltese", lb: "Luxembourgish", eu: "Basque", gl: "Galician", simple: "Simple English",
};

// The MediaWiki API's `origin=*` parameter is an officially documented CORS
// mechanism (https://www.mediawiki.org/wiki/API:Cross-site_requests), so in
// principle every Wikimedia project below CAN be verified directly from the
// browser. In practice, all Wikimedia wikis (every language edition of
// Wikipedia plus every sister project — Wiktionary, Wikiquote, etc.) sit
// behind the SAME shared edge/rate-limiter. Firing near-simultaneous requests
// at dozens of them from one visitor's browser reliably trips that shared
// limiter and comes back as HTTP 429 — this is exactly what the uploaded
// error report showed (Wikipedia (ak), Wiktionary (EN), Wikiquote (EN) all
// 429). Rather than "fix" that with more retries (it isn't a bug, it's a
// resource limit), only a small, proven-safe set of major-language editions
// is checked live from the browser. Everything else is still checked — just
// server-side, once a week, from Node (scripts/verify-backlinks.cjs), which
// has no CORS restriction and paces its own requests across the whole
// Wikimedia family (see WIKIMEDIA_FAMILY below) so it never gets rate-limited
// either.
const CLIENT_SAFE_WIKI_LANGS = new Set([
  "en", "tr", "de", "fr", "es", "ru", "ar", "zh", "ja", "pt", "it", "nl",
]);
const seenWiki = new Set();
for (const lang of wikiLangs) {
  if (seenWiki.has(lang)) continue;
  seenWiki.add(lang);
  const name = wikiLangNames[lang] || `Wikipedia (${lang})`;
  add(
    `wiki-${lang}`,
    `Wikipedia (${name})`,
    "wiki",
    `https://${lang}.wikipedia.org`,
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*`,
    "BookOpen",
    "#000000",
    CLIENT_SAFE_WIKI_LANGS.has(lang)
  );
}

// === WIKIMEDIA SISTER PROJECTS ===
// Server-only (see comment above) — checked weekly via GitHub Actions instead
// of from every visitor's browser.
add("wikimedia-commons","Wikimedia Commons","wiki","https://commons.wikimedia.org","https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","Image","#0066CC",false);
add("wikidata","Wikidata","wiki","https://www.wikidata.org","https://www.wikidata.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","Database","#000000",false);
add("wiktionary-en","Wiktionary (EN)","wiki","https://en.wiktionary.org","https://en.wiktionary.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","BookOpen","#4A4A4A",false);
add("wikiquote-en","Wikiquote (EN)","wiki","https://en.wikiquote.org","https://en.wikiquote.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","BookOpen","#665A3E",false);
add("wikibooks-en","Wikibooks (EN)","wiki","https://en.wikibooks.org","https://en.wikibooks.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","BookOpen","#5C7A99",false);
add("wikisource-en","Wikisource (EN)","wiki","https://en.wikisource.org","https://en.wikisource.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","BookOpen","#436F82",false);
add("wikinews-en","Wikinews (EN)","wiki","https://en.wikinews.org","https://en.wikinews.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","Newspaper","#995533",false);
add("wikiversity-en","Wikiversity (EN)","wiki","https://en.wikiversity.org","https://en.wikiversity.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","BookOpen","#704090",false);
add("wikivoyage-en","Wikivoyage (EN)","wiki","https://en.wikivoyage.org","https://en.wikivoyage.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","Globe","#7EBC6F",false);
add("wikispecies","Wikispecies","wiki","https://species.wikimedia.org","https://species.wikimedia.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","Globe","#336699",false);
add("meta-wiki","Meta-Wiki","wiki","https://meta.wikimedia.org","https://meta.wikimedia.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","Database","#666666",false);
add("mediawiki-wiki","MediaWiki","wiki","https://www.mediawiki.org","https://www.mediawiki.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=10&format=json&origin=*","BookOpen","#FF7F00",false);

// === STACK EXCHANGE NETWORK ===
// "health" and "astronomy" were removed: there is no standalone health.* or
// astronomy.* Stack Exchange site (astronomy lives inside Space Exploration,
// medical topics live at medicalsciences.stackexchange.com) — calling the API
// with those site slugs always returned HTTP 400.
const seSites = [
  ["stackoverflow","Stack Overflow","#F48024"],
  ["serverfault","Server Fault","#E7282D"],
  ["superuser","Super User","#47A8DA"],
  ["webapps","Web Applications","#3B82F6"],
  ["askubuntu","Ask Ubuntu","#DD4814"],
  ["gamedev","Game Development","#85B842"],
  ["gaming","Arqade (Gaming)","#A36565"],
  ["tex","TeX - LaTeX","#5B7D9B"],
  ["math","Mathematics","#4A90D9"],
  ["mathoverflow","MathOverflow","#C95A3D"],
  ["physics","Physics","#3F7E9E"],
  ["chemistry","Chemistry","#6A8F3F"],
  ["biology","Biology","#5B8C5A"],
  ["cs","Computer Science","#6C5B9E"],
  ["cstheory","Theoretical CS","#A33EBA"],
  ["crypto","Cryptography","#5C6BC0"],
  ["datascience","Data Science","#26C6DA"],
  ["ai","Artificial Intelligence","#42A5F5"],
  ["ml","Machine Learning","#7E57C2"],
  ["softwareengineering","Software Engineering","#E57373"],
  ["codegolf","Code Golf","#5BA65B"],
  ["sqa","Software Quality","#9C27B0"],
  ["security","Security","#E53935"],
  ["dba","Database Administrators","#5C6BC0"],
  ["wordpress","WordPress","#21759B"],
  ["drupal","Drupal","#0678BE"],
  ["joomla","Joomla","#F0A000"],
  ["magento","Magento","#F26322"],
  ["salesforce","Salesforce","#00A1E0"],
  ["sharepoint","SharePoint","#0078D4"],
  ["ux","User Experience","#7E57C2"],
  ["graphicdesign","Graphic Design","#66BB6A"],
  ["photography","Photography","#78909C"],
  ["scifi","Science Fiction","#6A8F3F"],
  ["movies","Movies & TV","#5C6BC0"],
  ["music","Music","#EF6C00"],
  ["cooking","Seasoned Advice (Cooking)","#FF7043"],
  ["diy","Home Improvement","#8D6E63"],
  ["crafts","Crafts","#AB47BC"],
  ["garden","Gardening","#66BB6A"],
  ["bicycles","Bicycles","#42A5F5"],
  ["fitness","Physical Fitness","#FF7043"],
  ["skeptics","Skeptics","#78909C"],
  ["sustainability","Sustainability","#43A047"],
  ["travel","Travel","#FFA000"],
  ["outdoors","The Great Outdoors","#558B2F"],
  ["aviation","Aviation","#42A5F5"],
  ["space","Space Exploration","#1A237E"],
  ["earthscience","Earth Science","#5C6BC0"],
  ["geography","Geography","#26A69A"],
  ["history","History","#B71C1C"],
  ["politics","Politics","#5C6BC0"],
  ["law","Law","#37474F"],
  ["economics","Economics","#1565C0"],
  ["philosophy","Philosophy","#6D4C41"],
  ["linguistics","Linguistics","#7E57C2"],
  ["english","English Language","#1976D2"],
  ["ell","English Learners","#42A5F5"],
  ["french","French Language","#26C6DA"],
  ["german","German Language","#FFCA28"],
  ["spanish","Spanish Language","#FF7043"],
  ["chinese","Chinese Language","#D32F2F"],
  ["japanese","Japanese Language","#EC407A"],
  ["russian","Russian Language","#D32F2F"],
  ["italian","Italian Language","#66BB6A"],
  ["portuguese","Portuguese Language","#26A69A"],
  ["esperanto","Esperanto","#4CAF50"],
  ["latin","Latin","#8D6E63"],
  ["hindi","Hindi Language","#FF9800"],
  ["islam","Islam","#4CAF50"],
  ["christianity","Christianity","#5C6BC0"],
  ["judaism","Judaism","#1976D2"],
  ["buddhism","Buddhism","#FFB74D"],
  ["hinduism","Hinduism","#FF7043"],
  ["academia","Academia","#5C6BC0"],
  ["workplace","The Workplace","#FF7043"],
  ["money","Personal Finance","#43A047"],
  ["quant","Quant Finance","#1976D2"],
  ["pm","Project Management","#6A8F3F"],
  ["freelancing","Freelancing","#78909C"],
  ["patents","Patents","#37474F"],
  ["bitcoin","Bitcoin","#F7931A"],
  ["ethereum","Ethereum","#8A92B2"],
  ["stellar","Stellar","#7D26C6"],
  ["tezos","Tezos","#2C7DF7"],
  ["cardano","Cardano","#0033AD"],
  ["solana","Solana","#14F195"],
  ["iota","IOTA","#131F37"],
  ["monero","Monero","#FF6600"],
  ["litecoin","Litecoin","#A6A9AA"],
  ["dogecoin","Dogecoin","#BA9F33"],
  ["ripple","Ripple","#232E52"],
  ["hardwarerecs","Hardware Recs","#5C6BC0"],
  ["softwarerecs","Software Recs","#42A5F5"],
  ["opendata","Open Data","#26A69A"],
  ["medicalsciences","Medical Sciences","#EF5350"],
  ["bioinformatics","Bioinformatics","#66BB6A"],
  ["neuroscience","Neuroscience","#7E57C2"],
  ["psychology","Psychology","#5C6BC0"],
  ["cogsci","Cognitive Science","#26C6DA"],
  ["robots","Robotics","#FF7043"],
  ["arduino","Arduino","#00979D"],
  ["raspberrypi","Raspberry Pi","#C51A4A"],
  ["iot","Internet of Things","#42A5F5"],
  ["3dprinting","3D Printing","#FF7043"],
  ["blender","Blender","#E87D0D"],
  ["bldg","Building","#8D6E63"],
  ["ham","Amateur Radio","#EF6C00"],
  ["engineering","Engineering","#5C6BC0"],
  ["mechanics","Motor Vehicle","#78909C"],
  ["boardgames","Board Games","#66BB6A"],
  ["chess","Chess","#5C6BC0"],
  ["poker","Poker","#37474F"],
  ["sports","Sports","#FF7043"],
  ["beer","Beer","#FFA000"],
  ["coffee","Coffee","#795548"],
  ["wine","Wine","#880E4F"],
  ["expressionengine","ExpressionEngine","#5C6BC0"],
  ["craftcms","Craft CMS","#E57373"],
  ["tridion","Tridion","#42A5F5"],
  ["sitecore","Sitecore","#5C6BC0"],
  ["networkengineering","Network Engineering","#1976D2"],
  ["devops","DevOps","#00BCD4"],
  ["opensource","Open Source","#FF6600"],
  ["writing","Writing","#6D4C41"],
  ["worldbuilding","Worldbuilding","#5C6BC0"],
  ["scicomp","Computational Science","#26C6DA"],
  ["stats","Cross Validated (Stats)","#3B82F6"],
];

// A handful of Stack Exchange sites predate the unified *.stackexchange.com
// naming and live at their own historic domains — everything else genuinely
// is at https://{site}.stackexchange.com.
const SE_CUSTOM_DOMAINS = {
  stackoverflow: "https://stackoverflow.com",
  serverfault: "https://serverfault.com",
  superuser: "https://superuser.com",
  askubuntu: "https://askubuntu.com",
  mathoverflow: "https://mathoverflow.net",
};

// The Stack Exchange API (api.stackexchange.com) sends
// `Access-Control-Allow-Origin: *`, so a browser CAN call it directly — but
// every one of these 128 sites is really just a `site=` query parameter
// against that single shared host, with a single shared request quota. All
// 128 checked back-to-back from one visitor's browser is what produced the
// HTTP 400 "throttle_violation" / cascading "Failed to fetch" wall in the
// error report. So: server-only. The weekly Node run (unlimited by CORS,
// see scripts/verify-backlinks.cjs) paces these properly instead.
const seenSE = new Set();
for (const [site, name, color] of seSites) {
  if (seenSE.has(site)) continue;
  seenSE.add(site);
  add(
    `se-${site}`,
    name,
    "qa",
    SE_CUSTOM_DOMAINS[site] || `https://${site}.stackexchange.com`,
    `https://api.stackexchange.com/2.3/search/advanced?q={query}&site=${site}&pagesize=10&order=desc&sort=relevance`,
    "HelpCircle",
    color,
    false
  );
}

// === CODE HOSTING (Git platforms) ===
// GitHub's REST API (api.github.com) sends permissive CORS headers and works
// unauthenticated (rate-limited); the old github.com/search HTML UI now
// requires a login for code search, so we point at the real API instead.
add("github","GitHub","social","https://github.com","https://api.github.com/search/repositories?q={query}&per_page=10","Github","#181717",true);
add("gitlab","GitLab","social","https://gitlab.com","https://gitlab.com/search?search={query}","GitBranch","#FC6D26");
add("codeberg","Codeberg","social","https://codeberg.org","https://codeberg.org/explore/repos?q={query}","GitBranch","#2185D0");
add("sourcehut","SourceHut","social","https://sr.ht","https://sr.ht/projects?search={query}","GitBranch","#000000");
add("bitbucket","Bitbucket","social","https://bitbucket.org","https://bitbucket.org/search?q={query}","GitBranch","#0052CC");
add("gitea","Gitea","social","https://gitea.com","https://gitea.com/explore/repos?q={query}","GitBranch","#609926");
add("notabug","NotABug","social","https://notabug.org","https://notabug.org/explore/repos?q={query}","GitBranch","#4A4A4A");
add("gitee","Gitee","social","https://gitee.com","https://gitee.com/search?q={query}","GitBranch","#C71D23");
add("gitgud","GitGud","social","https://gitgud.io","https://gitgud.io/explore/projects?q={query}","GitBranch","#E67E22");
add("dagsh","DagsHub","social","https://dagshub.com","https://dagshub.com/search?q={query}","GitBranch","#3B82F6");
add("repoorcz","repo.or.cz","social","https://repo.or.cz","https://repo.or.cz/?s={query}","GitBranch","#000000");
add("pagure","Pagure","social","https://pagure.io","https://pagure.io/search?q={query}","GitBranch","#39A0DC");
add("opensuse","openSUSE Code","social","https://code.opensuse.org","https://code.opensuse.org/search?q={query}","GitBranch","#73BA25");
add("github-repos","GitHub (Repositories)","social","https://github.com","https://github.com/search?q={query}&type=repositories","Github","#181717");
add("github-gist","GitHub Gist","social","https://gist.github.com","https://gist.github.com/search?q={query}","Github","#181717");
add("softwareheritage","Software Heritage","directory","https://archive.softwareheritage.org","https://archive.softwareheritage.org/api/1/origin/search/{query}/?limit=20","GitBranch","#D91C36");

// === SOCIAL / NEWS ===
// "Quora" was removed — its search results require a login wall almost every
// time and it aggressively blocks non-browser traffic, so it never produces a
// usable result either from the browser or from GitHub Actions.
add("reddit","Reddit","social","https://www.reddit.com","https://www.reddit.com/search/.json?q={query}&limit=25","MessageCircle","#FF4500");
add("hackernews","Hacker News","social","https://news.ycombinator.com","https://hn.algolia.com/api/v1/search?query={query}","MessageCircle","#FF6600",true);
add("bluesky","Bluesky","social","https://bsky.app","https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q={query}","MessageCircle","#0085FF",false);
add("lobsters","Lobsters","social","https://lobste.rs","https://lobste.rs/search.json?q={query}","Newspaper","#AC130D");
add("slashdot","Slashdot","social","https://slashdot.org","https://slashdot.org/search?query={query}","Newspaper","#026664");
add("diaspora","Diaspora","social","https://diasp.org","https://diasp.org/search?q={query}","MessageCircle","#2D2D2D");
add("mastodon","Mastodon","social","https://mastodon.social","https://mastodon.social/api/v2/search?q={query}","MessageCircle","#6364FF");
add("lemmy","Lemmy","social","https://lemmy.world","https://lemmy.world/api/v3/search?q={query}&type_=All&sort=New&limit=20","MessageCircle","#00BCD4");
add("kbin","Kbin","social","https://kbin.social","https://kbin.social/search?q={query}","MessageCircle","#E91E63");
add("peertube","PeerTube","social","https://joinpeertube.org","https://sepiasearch.org/api/v1/search/videos?search={query}","Newspaper","#F1680D");
add("nextcloud","Nextcloud Forum","social","https://help.nextcloud.com","https://help.nextcloud.com/search?q={query}","MessageCircle","#0082C9");
add("discourse-meta","Discourse Meta","social","https://meta.discourse.org","https://meta.discourse.org/search?q={query}","MessageCircle","#000000");

// === BLOG / PUBLISHING ===
// "Telegram Search" was removed — Telegram has no public endpoint that
// searches across channels/messages; "t.me/s/search" isn't a real route
// (t.me/s/<channel> only ever previews one specific channel), so this source
// could never return anything but a 404.
add("medium","Medium","social","https://medium.com","https://medium.com/search?q={query}","PenTool","#12100E");
add("devto","DEV Community","social","https://dev.to","https://dev.to/search/feed?q={query}&per_page=30","Code","#0A0A0A");
add("hashnode","Hashnode","social","https://hashnode.com","https://hashnode.com/search?q={query}","Code","#2962FF");
add("substack","Substack","social","https://substack.com","https://substack.com/search/{query}","PenTool","#FF6719");
add("wordpress-com","WordPress.com","social","https://wordpress.com","https://wordpress.com/search/{query}","PenTool","#21759B");
add("tumblr","Tumblr","social","https://www.tumblr.com","https://www.tumblr.com/search/{query}","PenTool","#001935");
add("livejournal","LiveJournal","social","https://www.livejournal.com","https://www.livejournal.com/search/?q={query}","PenTool","#00B0EF");
add("indiehackers","Indie Hackers","social","https://www.indiehackers.com","https://www.indiehackers.com/search?query={query}","MessageCircle","#0E2439");
add("producthunt","Product Hunt","social","https://www.producthunt.com","https://www.producthunt.com/search?q={query}","MessageCircle","#DA552F");
add("alternativeto","AlternativeTo","directory","https://alternativeto.net","https://alternativeto.net/browse/search/?q={query}","Package","#2E4258");
add("opencollective","Open Collective","directory","https://opencollective.com","https://opencollective.com/search?q={query}","Package","#3385FF");

// === SEARCH ENGINES ===
// Most commercial search engines actively fingerprint and block non-browser
// traffic with CAPTCHAs/JS challenges (Yandex, Bing, Mojeek, Startpage,
// Swisscows, Brave Search) or wrap results in a client-rendered SPA with no
// server HTML to read (Qwant, Dogpile, Stract). SearX/SearXNG public
// instances are community-run and go offline unpredictably. None of these
// can ever be made to "just work", so per your instruction they were removed
// rather than left permanently red. What's left below has a track record of
// actually returning plain, scrapeable HTML.
add("duckduckgo","DuckDuckGo","search","https://duckduckgo.com","https://html.duckduckgo.com/html/?q={query}","Search","#DE5833");
add("ecosia","Ecosia","search","https://www.ecosia.org","https://www.ecosia.org/search?q={query}","Search","#1A8B3E");
add("marginalia","Marginalia Search","search","https://search.marginalia.nu","https://search.marginalia.nu/search?query={query}","Search","#4A7C59");
add("curlie","Curlie (Open Directory)","directory","https://curlie.org","https://curlie.org/search?q={query}","Search","#1E88E5");

// === PACKAGE REGISTRIES ===
add("npm","npm","directory","https://www.npmjs.com","https://registry.npmjs.org/-/v1/search?text={query}&size=25","Package","#CB3837",true);
add("pypi","PyPI","directory","https://pypi.org","https://pypi.org/search/?q={query}","Package","#3775A9");
add("crates-io","crates.io","directory","https://crates.io","https://crates.io/api/v1/crates?q={query}&per_page=10","Package","#8B5CF6");
add("rubygems","RubyGems","directory","https://rubygems.org","https://rubygems.org/api/v1/search.json?query={query}","Package","#E9573F");
add("packagist","Packagist (PHP)","directory","https://packagist.org","https://packagist.org/search/?q={query}","Package","#F28D0A");
add("nuget","NuGet","directory","https://www.nuget.org","https://www.nuget.org/packages?q={query}","Package","#004880");
add("maven","Maven Central","directory","https://central.sonatype.com","https://central.sonatype.com/search?q={query}","Package","#C71A23");
add("go-pkg","Go Packages","directory","https://pkg.go.dev","https://pkg.go.dev/search?q={query}","Package","#00ADD8");
add("conda","Conda","directory","https://anaconda.org","https://anaconda.org/search?q={query}","Package","#43B02A");
add("chocolatey","Chocolatey","directory","https://community.chocolatey.org","https://community.chocolatey.org/packages?q={query}","Package","#7EB900");
add("winget","Winget","directory","https://github.com/microsoft/winget-pkgs","https://github.com/search?q={query}+repo%3Amicrosoft%2Fwinget-pkgs&type=code","Package","#005A9E");
add("flatpak","Flathub","directory","https://flathub.org","https://flathub.org/api/v2/search?q={query}","Package","#4A86CF");
add("snap","Snap Store","directory","https://snapcraft.io","https://snapcraft.io/search?q={query}","Package","#82BAA0");
add("fdroid","F-Droid","directory","https://f-droid.org","https://search.f-droid.org/?q={query}","Package","#1976D2");
add("sourceforge","SourceForge","directory","https://sourceforge.net","https://sourceforge.net/search/?q={query}","Package","#FF6600");
add("docker-hub","Docker Hub","directory","https://hub.docker.com","https://hub.docker.com/search?q={query}","Package","#2496ED");
add("huggingface","Hugging Face","directory","https://huggingface.co","https://huggingface.co/api/models?search={query}","Package","#FFD21E",true);
add("hackage","Hackage (Haskell)","directory","https://hackage.haskell.org","https://hackage.haskell.org/search?terms={query}","Package","#5E5086");
add("clojars","Clojars","directory","https://clojars.org","https://clojars.org/search?q={query}","Package","#4A8B5C");
add("pub-dev","pub.dev (Dart)","directory","https://pub.dev","https://pub.dev/packages?q={query}","Package","#00BCD4");
add("hex","Hex (Elixir)","directory","https://hex.pm","https://hex.pm/packages?search={query}","Package","#7E57C2");
add("cpan","CPAN (Perl)","directory","https://metacpan.org","https://metacpan.org/search?q={query}","Package","#1A6FA0");
add("ctan","CTAN (LaTeX)","directory","https://ctan.org","https://ctan.org/search?phrase={query}","Package","#3F7E9E");
add("freshmeat","Freshcode","directory","https://freshcode.club","https://freshcode.club/search?q={query}","Package","#5C6BC0");
add("fsf","FSF Directory","directory","https://directory.fsf.org","https://directory.fsf.org/wiki?search={query}","Package","#5C6BC0");

// === ARCHIVES ===
// The Internet Archive's APIs send permissive CORS headers, so both of these
// work straight from the browser — this is the "web arşiv" coverage.
add("archive-org","Internet Archive","archive","https://archive.org","https://archive.org/advancedsearch.php?q={query}&fl[]=identifier&fl[]=title&fl[]=url&rows=25&output=json","Archive","#000000",true);
add("wayback","Wayback Machine","archive","https://web.archive.org","https://web.archive.org/cdx/search/cdx?url={query}&output=json&limit=25","Archive","#000000",false);

// === DIRECTORY / MAPPING ===
// "WorldCat" was removed — worldcat.org is a JavaScript single-page app; a
// plain fetch only ever returns an empty shell with no search results in it,
// so it can never be verified by either the browser or a script.
add("openlibrary","OpenLibrary","directory","https://openlibrary.org","https://openlibrary.org/search.json?q={query}&limit=10","BookOpen","#336699",true);
add("project-gutenberg","Project Gutenberg","directory","https://www.gutenberg.org","https://www.gutenberg.org/ebooks/search/?query={query}","BookOpen","#5C6BC0");
add("dbpedia","DBpedia Lookup","directory","https://dbpedia.org","https://lookup.dbpedia.org/api/search?query={query}","Database","#FF7A59");

// === ACADEMIC ===
// arXiv/DOAJ/Zenodo/DBLP were switched from their HTML search pages to their
// real JSON/Atom APIs (faster, and they don't time out the way the heavy
// search UI did). Crossref/OpenAlex/Semantic Scholar/Europe PMC APIs are all
// documented to support direct cross-origin browser requests.
add("arxiv","arXiv","academic","https://arxiv.org","https://export.arxiv.org/api/query?search_query=all:{query}&max_results=20","BookOpen","#B31B1B");
add("doaj","DOAJ","academic","https://doaj.org","https://doaj.org/api/search/articles/{query}","BookOpen","#00A651");
add("plos","PLOS","academic","https://www.plos.org","https://api.plos.org/search?q={query}","BookOpen","#C10B0B");
add("semantic-scholar","Semantic Scholar","academic","https://www.semanticscholar.org","https://api.semanticscholar.org/graph/v1/paper/search?query={query}","BookOpen","#1857B6",false);
add("core","CORE","academic","https://core.ac.uk","https://core.ac.uk/search?q={query}","BookOpen","#004B87");
add("zenodo","Zenodo","academic","https://zenodo.org","https://zenodo.org/api/records?q={query}","BookOpen","#00B5A5",true);
add("figshare","Figshare","academic","https://figshare.com","https://figshare.com/search?q={query}","BookOpen","#1A1A1A");
add("osf","Open Science Framework","academic","https://osf.io","https://osf.io/search/?q={query}","BookOpen","#2D2D2D");
add("dblp","DBLP","academic","https://dblp.org","https://dblp.org/search/publ/api?q={query}&format=json","BookOpen","#1B5E20");
add("crossref","Crossref","academic","https://www.crossref.org","https://api.crossref.org/works?query={query}&rows=10","BookOpen","#3B82F6",true);
add("openalex","OpenAlex","academic","https://openalex.org","https://api.openalex.org/works?search={query}","BookOpen","#6A5ACD",true);
add("europepmc","Europe PMC","academic","https://europepmc.org","https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={query}&format=json","BookOpen","#00A19A",true);
add("ia-scholar","Internet Archive Scholar","academic","https://scholar.archive.org","https://scholar.archive.org/search?q={query}","BookOpen","#000000");
add("hathitrust","HathiTrust","academic","https://www.hathitrust.org","https://babel.hathitrust.org/cgi/ls?q1={query};a=srchls;lmt=ft","BookOpen","#8B1A1A");

// === DOCUMENTATION ===
add("readthedocs","Read the Docs","docs","https://readthedocs.org","https://readthedocs.org/search/?q={query}","BookOpen","#8CA1AF");
add("mdn","MDN Web Docs","docs","https://developer.mozilla.org","https://developer.mozilla.org/en-US/search?q={query}","BookOpen","#000000");
add("cdnjs","cdnjs","docs","https://cdnjs.com","https://cdnjs.com/search?q={query}","BookOpen","#E6852C");
add("jsdelivr","jsDelivr","docs","https://www.jsdelivr.com","https://www.jsdelivr.com/?query={query}","BookOpen","#F84F2C");

// === MEDIA / CREATIVE ===
add("flickr","Flickr","media","https://www.flickr.com","https://www.flickr.com/search/?q={query}","Image","#0063DC");
add("wikimedia-video","Wikimedia Video","media","https://commons.wikimedia.org","https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={query}+filetype%3Avideo&srlimit=10&format=json&origin=*","Image","#0066CC",false);
add("openclipart","OpenClipart","media","https://openclipart.org","https://openclipart.org/search/?query={query}","Image","#000000");
add("openverse","Openverse","media","https://openverse.org","https://api.openverse.org/v1/images/?q={query}","Image","#0A1B2A",true);
add("freemusicarchive","Free Music Archive","media","https://freemusicarchive.org","https://freemusicarchive.org/search?q={query}","Image","#1A1A1A");
add("bandcamp","Bandcamp","media","https://bandcamp.com","https://bandcamp.com/search?q={query}","Image","#1DA0C3");
add("jamendo","Jamendo","media","https://www.jamendo.com","https://www.jamendo.com/search?q={query}","Image","#0054A6");
add("soundcloud","SoundCloud","media","https://soundcloud.com","https://soundcloud.com/search?q={query}","Image","#FF5500");
add("audius","Audius","media","https://audius.co","https://audius.co/search?q={query}","Image","#CC2567");
add("vimeo","Vimeo","media","https://vimeo.com","https://vimeo.com/search?q={query}","Image","#1AB7EA");
add("invidious","Invidious","media","https://yewtu.be","https://yewtu.be/search?q={query}","Image","#5C6BC0");

// === OTHER OPEN SOURCE / MISC ===
add("openstreetmap-wiki","OSM Wiki","wiki","https://wiki.openstreetmap.org","https://wiki.openstreetmap.org/w/index.php?search={query}","Globe","#7EBC6F");
add("archwiki","Arch Wiki","wiki","https://wiki.archlinux.org","https://wiki.archlinux.org/index.php?search={query}","BookOpen","#1793D1");
add("gentoo-wiki","Gentoo Wiki","wiki","https://wiki.gentoo.org","https://wiki.gentoo.org/index.php?search={query}","BookOpen","#54487A");
add("debian-wiki","Debian Wiki","wiki","https://wiki.debian.org","https://wiki.debian.org/FrontPage?action=fullsearch&value={query}","BookOpen","#A81D33");
add("ubuntu-wiki","Ubuntu Wiki","wiki","https://wiki.ubuntu.com","https://wiki.ubuntu.com/FrontPage?action=fullsearch&value={query}","BookOpen","#E95420");
add("fedora-wiki","Fedora Wiki","wiki","https://fedoraproject.org","https://fedoraproject.org/wiki/Special:Search?search={query}","BookOpen","#3C6EB4");
add("freebsd-wiki","FreeBSD Wiki","wiki","https://wiki.freebsd.org","https://wiki.freebsd.org/Special:Search?search={query}","BookOpen","#AB2B28");
add("openbsd-wiki","OpenBSD Wiki","wiki","https://wiki.openbsd.org","https://wiki.openbsd.org/wiki/Special:Search?search={query}","BookOpen","#E8E8E8");
add("nixos-wiki","NixOS Wiki","wiki","https://nixos.wiki","https://nixos.wiki/index.php?search={query}","BookOpen","#7E57C2");
add("alpine-wiki","Alpine Wiki","wiki","https://wiki.alpinelinux.org","https://wiki.alpinelinux.org/w/index.php?search={query}","BookOpen","#0D597F");
add("mozilla-wiki","Mozilla Wiki","wiki","https://wiki.mozilla.org","https://wiki.mozilla.org/Special:Search?search={query}","BookOpen","#000000");
add("opensuse-wiki","openSUSE Wiki","wiki","https://en.opensuse.org","https://en.opensuse.org/index.php?search={query}","BookOpen","#73BA25");
add("caddy-wiki","Caddy Wiki","docs","https://caddyserver.com","https://caddyserver.com/docs?q={query}","BookOpen","#1F8C8A");
add("docker-docs","Docker Docs","docs","https://docs.docker.com","https://docs.docker.com/search/?q={query}","BookOpen","#2496ED");
add("k8s-docs","Kubernetes Docs","docs","https://kubernetes.io","https://kubernetes.io/search/?q={query}","BookOpen","#326CE5");
add("python-docs","Python Docs","docs","https://docs.python.org","https://docs.python.org/3/search.html?q={query}","BookOpen","#3776AB");
add("rust-docs","Rust Docs","docs","https://doc.rust-lang.org","https://doc.rust-lang.org/std/?search={query}","BookOpen","#000000");
add("go-docs","Go Docs","docs","https://go.dev","https://go.dev/search?q={query}","BookOpen","#00ADD8");
add("php-docs","PHP Docs","docs","https://www.php.net","https://www.php.net/manual-lookup.php?pattern={query}","BookOpen","#777BB4");
add("java-docs","Java Docs","docs","https://docs.oracle.com","https://docs.oracle.com/search/?q={query}&pt=en","BookOpen","#ED8B00");
add("cpp-docs","C++ Reference","docs","https://en.cppreference.com","https://en.cppreference.com/mwiki/index.php?search={query}","BookOpen","#659AD2");
add("elixir-docs","Elixir Docs","docs","https://hexdocs.pm","https://hexdocs.pm/search?q={query}","BookOpen","#4B275F");
add("scala-docs","Scala Docs","docs","https://docs.scala-lang.org","https://docs.scala-lang.org/search.html?q={query}","BookOpen","#DC322F");
add("dart-docs","Dart Docs","docs","https://dart.dev","https://dart.dev/search?q={query}","BookOpen","#00BCD4");
add("angular-docs","Angular Docs","docs","https://angular.io","https://angular.io/search?q={query}","BookOpen","#DD0031");
add("django-docs","Django Docs","docs","https://docs.djangoproject.com","https://docs.djangoproject.com/search/?q={query}","BookOpen","#0C4B33");

// Sort by sort_order
sources.sort((a, b) => a.sort_order - b.sort_order);

// Deduplicate by id
const seen = new Set();
const deduped = [];
for (const s of sources) {
  if (!seen.has(s.id)) {
    seen.add(s.id);
    deduped.push(s);
  }
}

const outPath = path.join(__dirname, "..", "public", "data", "sources.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));

const corsCount = deduped.filter((s) => s.cors_ok).length;
console.log(`Generated ${deduped.length} sources to ${outPath}`);
console.log(`  ${corsCount} are browser-verifiable (cors_ok=true), ${deduped.length - corsCount} are server-only (checked weekly via GitHub Actions).`);
