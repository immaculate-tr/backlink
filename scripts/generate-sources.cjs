#!/usr/bin/env node
/**
 * Generates sources.json with 500+ open-source platforms for backlink verification.
 * Run: node scripts/generate-sources.js
 */
const fs = require("fs");
const path = require("path");

const PATTERN = "immaculate\\.tr";
let order = 0;
function next() { return ++order; }

const sources = [];

function add(id, name, type, baseUrl, searchUrl, icon, color) {
  sources.push({
    id, name,
    platform_type: type,
    base_url: baseUrl,
    search_url_template: searchUrl,
    verify_url_pattern: PATTERN,
    is_active: true,
    logo_icon: icon,
    color,
    sort_order: next(),
  });
}

// === WIKIPEDIA — all ~330 language editions ===
const wikiLangs = [
  "en","tr","de","fr","es","it","ru","ja","zh","pt","ar","ko","hi","fa","vi","id","ms","th","nl","pl",
  "sv","uk","cs","fi","he","no","da","hu","ro","el","ca","sr","sk","bg","sl","hr","lt","lv","et","ga",
  "cy","is","mt","lb","eu","gl","an","br","co","fur","li","lij","lmo","nap","pms","rm","sc","scn","vec",
  "wa","zh-yue","zh-classical","gan","hak","min-nan","wuu","zza","kl","chr","haw","ht","pap","pih","tn",
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
    `https://${lang}.wikipedia.org/w/index.php?search={query}`,
    "BookOpen",
    "#000000"
  );
}

// === WIKIMEDIA SISTER PROJECTS ===
add("wikimedia-commons","Wikimedia Commons","wiki","https://commons.wikimedia.org","https://commons.wikimedia.org/w/index.php?search={query}","Image","#0066CC");
add("wikidata","Wikidata","wiki","https://www.wikidata.org","https://www.wikidata.org/w/index.php?search={query}","Database","#000000");
add("wiktionary-en","Wiktionary (EN)","wiki","https://en.wiktionary.org","https://en.wiktionary.org/w/index.php?search={query}","BookOpen","#4A4A4A");
add("wikiquote-en","Wikiquote (EN)","wiki","https://en.wikiquote.org","https://en.wikiquote.org/w/index.php?search={query}","BookOpen","#665A3E");
add("wikibooks-en","Wikibooks (EN)","wiki","https://en.wikibooks.org","https://en.wikibooks.org/w/index.php?search={query}","BookOpen","#5C7A99");
add("wikisource-en","Wikisource (EN)","wiki","https://en.wikisource.org","https://en.wikisource.org/w/index.php?search={query}","BookOpen","#436F82");
add("wikinews-en","Wikinews (EN)","wiki","https://en.wikinews.org","https://en.wikinews.org/w/index.php?search={query}","Newspaper","#995533");
add("wikiversity-en","Wikiversity (EN)","wiki","https://en.wikiversity.org","https://en.wikiversity.org/w/index.php?search={query}","BookOpen","#704090");
add("wikivoyage-en","Wikivoyage (EN)","wiki","https://en.wikivoyage.org","https://en.wikivoyage.org/w/index.php?search={query}","Globe","#7EBC6F");
add("wikispecies","Wikispecies","wiki","https://species.wikimedia.org","https://species.wikimedia.org/w/index.php?search={query}","Globe","#336699");
add("meta-wiki","Meta-Wiki","wiki","https://meta.wikimedia.org","https://meta.wikimedia.org/w/index.php?search={query}","Database","#666666");
add("mediawiki-wiki","MediaWiki","wiki","https://www.mediawiki.org","https://www.mediawiki.org/w/index.php?search={query}","BookOpen","#FF7F00");

// === STACK EXCHANGE NETWORK (~60+ sites) ===
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
  ["astronomy","Astronomy","#283593"],
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
  ["health","Medical Sciences","#EF5350"],
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
  ["cooking","Seasoned Advice","#FF7043"],
  ["bicycles","Bicycles","#42A5F5"],
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

const seenSE = new Set();
for (const [site, name, color] of seSites) {
  if (seenSE.has(site)) continue;
  seenSE.add(site);
  add(
    `se-${site}`,
    name,
    "qa",
    `https://${site}.stackexchange.com`,
    `https://api.stackexchange.com/2.3/search/advanced?q={query}&site=${site}&pagesize=10&order=desc&sort=relevance`,
    "HelpCircle",
    color
  );
}

// === CODE HOSTING (Git platforms) ===
add("github","GitHub","social","https://github.com","https://github.com/search?q={query}&type=code","Github","#181717");
add("gitlab","GitLab","social","https://gitlab.com","https://gitlab.com/search?search={query}","GitBranch","#FC6D26");
add("codeberg","Codeberg","social","https://codeberg.org","https://codeberg.org/explore/repos?q={query}","GitBranch","#2185D0");
add("sourcehut","SourceHut","social","https://sr.ht","https://sr.ht/projects?search={query}","GitBranch","#000000");
add("bitbucket","Bitbucket","social","https://bitbucket.org","https://bitbucket.org/search?q={query}","GitBranch","#0052CC");
add("gitea","Gitea","social","https://gitea.com","https://gitea.com/explore/repos?q={query}","GitBranch","#609926");
add("notabug","NotABug","social","https://notabug.org","https://notabug.org/explore/repos?q={query}","GitBranch","#4A4A4A");
add("forgejo","Forgejo","social","https://codeberg.org/forgejo","https://codeberg.org/forgejo","GitBranch","#2185D0");
add("gitee","Gitee","social","https://gitee.com","https://gitee.com/search?q={query}","GitBranch","#C71D23");
add("gitgud","GitGud","social","https://gitgud.io","https://gitgud.io/explore/projects?q={query}","GitBranch","#E67E22");
add("dagsh","DagsHub","social","https://dagshub.com","https://dagshub.com/search?q={query}","GitBranch","#3B82F6");
add("repoorcz","repo.or.cz","social","https://repo.or.cz","https://repo.or.cz/?s={query}","GitBranch","#000000");
add("pagure","Pagure","social","https://pagure.io","https://pagure.io/search?q={query}","GitBranch","#39A0DC");
add("opensuse","openSUSE Code","social","https://code.opensuse.org","https://code.opensuse.org/search?q={query}","GitBranch","#73BA25");
add("fedora-pagure","Fedora Pagure","social","https://pagure.io","https://pagure.io/search?q={query}","GitBranch","#3C6EB4");
add("android-aosp","AOSP Gerrit","social","https://android.googlesource.com","https://android.googlesource.com/","GitBranch","#3DDC84");
add("chromium","Chromium Code","social","https://chromium.googlesource.com","https://chromium.googlesource.com/","GitBranch","#4285F4");
add("freebsd","FreeBSD Git","social","https://cgit.freebsd.org","https://cgit.freebsd.org/","GitBranch","#AB2B28");
add("netbsd","NetBSD CVS","social","https://cdn.netbsd.org","https://cdn.netbsd.org/","GitBranch","#FF6600");
add("openbsd","OpenBSD CVS","social","https://cvsweb.openbsd.org","https://cvsweb.openbsd.org/","GitBranch","#E8E8E8");

// === SOCIAL / NEWS ===
add("reddit","Reddit","social","https://www.reddit.com","https://www.reddit.com/search/.json?q={query}&limit=25","MessageCircle","#FF4500");
add("hackernews","Hacker News","social","https://news.ycombinator.com","https://hn.algolia.com/api/v1/search?query={query}","Newspaper","#FF6600");
add("lobsters","Lobsters","social","https://lobste.rs","https://lobste.rs/search.json?q={query}","Newspaper","#AC130D");
add("slashdot","Slashdot","social","https://slashdot.org","https://slashdot.org/search?query={query}","Newspaper","#026664");
add("quora","Quora","qa","https://www.quora.com","https://www.quora.com/search?q={query}","HelpCircle","#B92B27");
add("diaspora","Diaspora","social","https://diasp.org","https://diasp.org/search?q={query}","MessageCircle","#2D2D2D");
add("mastodon","Mastodon","social","https://mastodon.social","https://mastodon.social/api/v2/search?q={query}","MessageCircle","#6364FF");
add("pleroma","Pleroma","social","https://pleroma.social","https://pleroma.social/","MessageCircle","#2D2D2D");
add("friendica","Friendica","social","https://friendi.ca","https://friendi.ca/","MessageCircle","#2D2D2D");
add("pixelfed","Pixelfed","social","https://pixelfed.org","https://pixelfed.org/","MessageCircle","#A45DD8");
add("lemmy","Lemmy","social","https://lemmy.world","https://lemmy.world/search?q={query}","MessageCircle","#00BCD4");
add("kbin","Kbin","social","https://kbin.social","https://kbin.social/search?q={query}","MessageCircle","#E91E63");
add("misskey","Misskey","social","https://misskey.io","https://misskey.io/","MessageCircle","#86B300");
add("peertube","PeerTube","social","https://joinpeertube.org","https://sepiasearch.org/api/v1/search/videos?search={query}","Newspaper","#F1680D");
add("nextcloud","Nextcloud Forum","social","https://help.nextcloud.com","https://help.nextcloud.com/search?q={query}","MessageCircle","#0082C9");
add("discourse-meta","Discourse Meta","social","https://meta.discourse.org","https://meta.discourse.org/search?q={query}","MessageCircle","#000000");
add("element","Element/Matrix","social","https://matrix.org","https://matrix.org/","MessageCircle","#0DBD8B");
add("xmpp","XMPP","social","https://xmpp.org","https://xmpp.org/","MessageCircle","#0080FF");

// === BLOG / PUBLISHING ===
add("devto","Dev.to","social","https://dev.to","https://dev.to/search/feed?q={query}&per_page=30","Code","#0A0A0A");
add("medium","Medium","social","https://medium.com","https://medium.com/search?q={query}","PenTool","#12100E");
add("hashnode","Hashnode","social","https://hashnode.com","https://hashnode.com/search?q={query}","Code","#2962FF");
add("substack","Substack","social","https://substack.com","https://substack.com/search/{query}","PenTool","#FF6719");
add("ghost","Ghost","social","https://ghost.org","https://ghost.org/","PenTool","#212B36");
add("writefreely","WriteFreely","social","https://write.as","https://write.as/","PenTool","#5AC4F4");
add("omgblog","OMG Blog","social","https://omg.blog","https://omg.blog/","PenTool","#000000");
add("wordpress-com","WordPress.com","social","https://wordpress.com","https://wordpress.com/search/{query}","PenTool","#21759B");
add("tumblr","Tumblr","social","https://www.tumblr.com","https://www.tumblr.com/search/{query}","PenTool","#001935");
add("livejournal","LiveJournal","social","https://www.livejournal.com","https://www.livejournal.com/search/?q={query}","PenTool","#00B0EF");
add("dreamwidth","Dreamwidth","social","https://www.dreamwidth.org","https://www.dreamwidth.org/","PenTool","#5C6BC0");
add("plurk","Plurk","social","https://www.plurk.com","https://www.plurk.com/","PenTool","#CF682F");
add("telegram-search","Telegram Search","social","https://t.me","https://t.me/s/search?q={query}","MessageCircle","#0088CC");

// === SEARCH ENGINES ===
add("duckduckgo","DuckDuckGo","search","https://duckduckgo.com","https://html.duckduckgo.com/html/?q={query}","Search","#DE5833");
add("bing","Bing","search","https://www.bing.com","https://www.bing.com/search?q={query}","Search","#008373");
add("yandex","Yandex","search","https://yandex.com","https://yandex.com/search/?text={query}","Search","#FF0000");
add("startpage","Startpage","search","https://www.startpage.com","https://www.startpage.com/sp/search?query={query}","Search","#6C5CE7");
add("brave-search","Brave Search","search","https://search.brave.com","https://search.brave.com/search?q={query}","Search","#FB542B");
add("ecosia","Ecosia","search","https://www.ecosia.org","https://www.ecosia.org/search?q={query}","Search","#1A8B3E");
add("swisscows","Swisscows","search","https://swisscows.com","https://swisscows.com/web?query={query}","Search","#DC0000");
add("mojeek","Mojeek","search","https://www.mojeek.com","https://www.mojeek.com/search?q={query}","Search","#4D8FAC");
add("searx","Searx","search","https://searx.be","https://searx.be/search?q={query}","Search","#3050C0");
add("qwant","Qwant","search","https://www.qwant.com","https://www.qwant.com/?q={query}","Search","#5C97FF");
add("dogpile","Dogpile","search","https://www.dogpile.com","https://www.dogpile.com/serp?q={query}","Search","#D03C2A");
add("exalead","Exalead","search","https://www.exalead.com","https://www.exalead.com/search/web/results/?q={query}","Search","#1A6FA0");
add("gigablast","Gigablast","search","https://gigablast.com","https://gigablast.com/search?q={query}","Search","#000000");
add("onesearch","OneSearch","search","https://www.onesearch.com","https://www.onesearch.com/yhs/search?q={query}","Search","#4A90D9");
add("lycos","Lycos","search","https://www.lycos.com","https://search.lycos.com/web/?q={query}","Search","#1A1A1A");
add("teoma","Teoma","search","https://www.teoma.com","https://www.teoma.com/web?q={query}","Search","#4A4A4A");
add("wisenut","WiseNut","search","https://www.wisenut.com","https://www.wisenut.com/search?q={query}","Search","#5C6BC0");
add("aol-search","AOL Search","search","https://search.aol.com","https://search.aol.com/aol/search?q={query}","Search","#000000");
add("ask","Ask.com","search","https://www.ask.com","https://www.ask.com/web?q={query}","Search","#CF0000");
add("blekko","Blekko","search","https://blekko.com","https://blekko.com/ws/{query}","Search","#000000");

// === PACKAGE REGISTRIES ===
add("npm","npm","directory","https://www.npmjs.com","https://registry.npmjs.org/-/v1/search?text={query}&size=25","Package","#CB3837");
add("pypi","PyPI","directory","https://pypi.org","https://pypi.org/search/?q={query}","Package","#3775A9");
add("crates-io","crates.io","directory","https://crates.io","https://crates.io/api/v1/crates?q={query}&per_page=10","Package","#8B5CF6");
add("rubygems","RubyGems","directory","https://rubygems.org","https://rubygems.org/api/v1/search.json?query={query}","Package","#E9573F");
add("packagist","Packagist (PHP)","directory","https://packagist.org","https://packagist.org/search/?q={query}","Package","#F28D0A");
add("nuget","NuGet","directory","https://www.nuget.org","https://www.nuget.org/packages?q={query}","Package","#004880");
add("maven","Maven Central","directory","https://central.sonatype.com","https://central.sonatype.com/search?q={query}","Package","#C71A23");
add("go-pkg","Go Packages","directory","https://pkg.go.dev","https://pkg.go.dev/search?q={query}","Package","#00ADD8");
add("cargo","Cargo","directory","https://doc.rust-lang.org","https://doc.rust-lang.org/cargo/","Package","#000000");
add("conda","Conda","directory","https://anaconda.org","https://anaconda.org/search?q={query}","Package","#43B02A");
add("brew","Homebrew","directory","https://formulae.brew.sh","https://formulae.brew.sh/","Package","#FBB040");
add("chocolatey","Chocolatey","directory","https://community.chocolatey.org","https://community.chocolatey.org/packages?q={query}","Package","#7EB900");
add("winget","Winget","directory","https://github.com/microsoft/winget-pkgs","https://github.com/search?q={query}+repo%3Amicrosoft%2Fwinget-pkgs&type=code","Package","#005A9E");
add("flatpak","Flathub","directory","https://flathub.org","https://flathub.org/api/v2/search?q={query}","Package","#4A86CF");
add("snap","Snap Store","directory","https://snapcraft.io","https://snapcraft.io/search?q={query}","Package","#82BAA0");
add("appimage","AppImageHub","directory","https://appimage.github.io","https://appimage.github.io/","Package","#1A1A1A");
add("docker-hub","Docker Hub","directory","https://hub.docker.com","https://hub.docker.com/search?q={query}","Package","#2496ED");
add("pypi2","PyPI JSON API","directory","https://pypi.org","https://pypi.org/simple/","Package","#3775A9");
add("crates2","crates.io API","directory","https://crates.io","https://crates.io/api/v1/crates","Package","#8B5CF6");
add("hackage","Hackage (Haskell)","directory","https://hackage.haskell.org","https://hackage.haskell.org/search?terms={query}","Package","#5E5086");
add("stackage","Stackage","directory","https://www.stackage.org","https://www.stackage.org/","Package","#7E57C2");
add("clojars","Clojars","directory","https://clojars.org","https://clojars.org/search?q={query}","Package","#4A8B5C");
add("pub-dev","pub.dev (Dart)","directory","https://pub.dev","https://pub.dev/packages?q={query}","Package","#00BCD4");
add("hex","Hex (Elixir)","directory","https://hex.pm","https://hex.pm/packages?search={query}","Package","#7E57C2");
add("cpan","CPAN (Perl)","directory","https://metacpan.org","https://metacpan.org/search?q={query}","Package","#1A6FA0");
add("ctan","CTAN (LaTeX)","directory","https://ctan.org","https://ctan.org/search?phrase={query}","Package","#3F7E9E");
add("freshmeat","Freshcode","directory","https://freshcode.club","https://freshcode.club/search?q={query}","Package","#5C6BC0");
add("fsf","FSF Directory","directory","https://directory.fsf.org","https://directory.fsf.org/wiki?search={query}","Package","#5C6BC0");
add("foss","FOSS Directory","directory","https://foss.directory","https://foss.directory/","Package","#43A047");

// === ARCHIVES ===
add("archive-org","Internet Archive","archive","https://archive.org","https://archive.org/advancedsearch.php?q={query}&fl[]=identifier&fl[]=title&fl[]=url&rows=25&output=json","Archive","#000000");
add("archive-today","archive.today","archive","https://archive.ph","https://archive.ph/{query}","Archive","#0E0E0E");
add("archive-is","archive.is","archive","https://archive.is","https://archive.is/{query}","Archive","#0E0E0E");
add("webcite","WebCite","archive","https://www.webcitation.org","https://www.webcitation.org/","Archive","#5C6BC0");
add("wayback","Wayback Machine","archive","https://web.archive.org","https://web.archive.org/cdx/search/cdx?url={query}&output=json&limit=25","Archive","#000000");

// === DIRECTORY / MAPPING ===
add("openstreetmap","OpenStreetMap","directory","https://www.openstreetmap.org","https://www.openstreetmap.org/api/0.6/search?q={query}&format=json","Globe","#7EBC6F");
add("openlibrary","OpenLibrary","directory","https://openlibrary.org","https://openlibrary.org/search.json?q={query}&limit=10","BookOpen","#336699");
add("project-gutenberg","Project Gutenberg","directory","https://www.gutenberg.org","https://www.gutenberg.org/ebooks/search/?query={query}","BookOpen","#5C6BC0");
add("wikimedia-meta","Wikimedia Meta","directory","https://meta.wikimedia.org","https://meta.wikimedia.org/w/index.php?search={query}","Database","#666666");

// === ACADEMIC ===
add("arxiv","arXiv","academic","https://arxiv.org","https://arxiv.org/search/?query={query}&searchtype=all","BookOpen","#B31B1B");
add("doaj","DOAJ","academic","https://doaj.org","https://doaj.org/search?source={query}","BookOpen","#00A651");
add("plos","PLOS","academic","https://www.plos.org","https://www.plos.org/search?q={query}","BookOpen","#C10B0B");
add("semantic-scholar","Semantic Scholar","academic","https://www.semanticscholar.org","https://www.semanticscholar.org/search?q={query}","BookOpen","#1857B6");
add("core","CORE","academic","https://core.ac.uk","https://core.ac.uk/search?q={query}","BookOpen","#004B87");
add("zenodo","Zenodo","academic","https://zenodo.org","https://zenodo.org/search?q={query}","BookOpen","#00B5A5");
add("figshare","Figshare","academic","https://figshare.com","https://figshare.com/search?q={query}","BookOpen","#1A1A1A");
add("osf","Open Science Framework","academic","https://osf.io","https://osf.io/search/?q={query}","BookOpen","#2D2D2D");
add("dblp","DBLP","academic","https://dblp.org","https://dblp.org/search?q={query}","BookOpen","#1B5E20");
add("crossref","Crossref","academic","https://www.crossref.org","https://api.crossref.org/works?query={query}&rows=10","BookOpen","#3B82F6");
add("opencitations","OpenCitations","academic","https://opencitations.net","https://opencitations.net/","BookOpen","#4A4A4A");
add("connected-papers","Connected Papers","academic","https://www.connectedpapers.com","https://www.connectedpapers.com/","BookOpen","#5C6BC0");

// === DOCUMENTATION ===
add("readthedocs","Read the Docs","docs","https://readthedocs.org","https://readthedocs.org/search/?q={query}","BookOpen","#8CA1AF");
add("gitbook","GitBook","docs","https://www.gitbook.com","https://www.gitbook.com/","BookOpen","#3884FF");
add("docusaurus","Docusaurus","docs","https://docusaurus.io","https://docusaurus.io/","BookOpen","#3ECC8F");
add("mdn","MDN Web Docs","docs","https://developer.mozilla.org","https://developer.mozilla.org/en-US/search?q={query}","BookOpen","#000000");
add("devdocs","DevDocs","docs","https://devdocs.io","https://devdocs.io/","BookOpen","#5C6BC0");
add("cdnjs","cdnjs","docs","https://cdnjs.com","https://cdnjs.com/search?q={query}","BookOpen","#E6852C");
add("jsdelivr","jsDelivr","docs","https://www.jsdelivr.com","https://www.jsdelivr.com/?query={query}","BookOpen","#F84F2C");
add("unpkg","unpkg","docs","https://unpkg.com","https://unpkg.com/","BookOpen","#000000");

// === FORUM / DISCUSSION ===
add("discourse-org","Discourse","forum","https://www.discourse.org","https://www.discourse.org/","MessageCircle","#000000");
add("fluxbb","FluxBB","forum","https://fluxbb.org","https://fluxbb.org/","MessageCircle","#5C6BC0");
add("phpbb","phpBB","forum","https://www.phpbb.com","https://www.phpbb.com/","MessageCircle","#5A7CA0");
add("vanilla","Vanilla Forums","forum","https://vanillaforums.com","https://vanillaforums.com/","MessageCircle","#2D2D2D");
add("flarum","Flarum","forum","https://flarum.org","https://flarum.org/","MessageCircle","#1876E4");
add("nodebb","NodeBB","forum","https://nodebb.org","https://nodebb.org/","MessageCircle","#1A8B3E");

// === MEDIA / CREATIVE ===
add("flickr","Flickr","media","https://www.flickr.com","https://www.flickr.com/search/?q={query}","Image","#0063DC");
add("wikimedia-video","Wikimedia Video","media","https://commons.wikimedia.org","https://commons.wikimedia.org/w/index.php?search={query}+filetype%3Avideo","Image","#0066CC");
add("openclipart","OpenClipart","media","https://openclipart.org","https://openclipart.org/search/?query={query}","Image","#000000");
add("openphoto","OpenPhoto","media","https://openphoto.net","https://openphoto.net/","Image","#5C6BC0");
add("freemusicarchive","Free Music Archive","media","https://freemusicarchive.org","https://freemusicarchive.org/search?q={query}","Image","#1A1A1A");
add("ccmixter","ccMixter","media","https://ccmixter.org","https://ccmixter.org/","Image","#FF6600");
add("bandcamp","Bandcamp","media","https://bandcamp.com","https://bandcamp.com/search?q={query}","Image","#1DA0C3");
add("jamendo","Jamendo","media","https://www.jamendo.com","https://www.jamendo.com/search?q={query}","Image","#0054A6");
add("soundcloud","SoundCloud","media","https://soundcloud.com","https://soundcloud.com/search?q={query}","Image","#FF5500");
add("audius","Audius","media","https://audius.co","https://audius.co/search?q={query}","Image","#CC2567");
add("vimeo","Vimeo","media","https://vimeo.com","https://vimeo.com/search?q={query}","Image","#1AB7EA");
add("invidious","Invidious","media","https://yewtu.be","https://yewtu.be/search?q={query}","Image","#5C6BC0");
add("mediagoblin","MediaGoblin","media","https://mediagoblin.org","https://mediagoblin.org/","Image","#1A8B3E");

// === RSS / FEED ===
add("rss-bridge","RSS Bridge","feed","https://rss-bridge.org","https://rss-bridge.org/","Newspaper","#5C6BC0");
add("miniflux","Miniflux","feed","https://miniflux.app","https://miniflux.app/","Newspaper","#5C6BC0");
add("freshrss","FreshRSS","feed","https://freshrss.org","https://freshrss.org/","Newspaper","#0066CC");
add("tt-rss","Tiny Tiny RSS","feed","https://tt-rss.org","https://tt-rss.org/","Newspaper","#FF8800");

// === OTHER OPEN SOURCE / MISC ===
add("openstreetmap-wiki","OSM Wiki","wiki","https://wiki.openstreetmap.org","https://wiki.openstreetmap.org/w/index.php?search={query}","Globe","#7EBC6F");
add("archwiki","Arch Wiki","wiki","https://wiki.archlinux.org","https://wiki.archlinux.org/index.php?search={query}","BookOpen","#1793D1");
add("gentoo-wiki","Gentoo Wiki","wiki","https://wiki.gentoo.org","https://wiki.gentoo.org/index.php?search={query}","BookOpen","#54487A");
add("debian-wiki","Debian Wiki","wiki","https://wiki.debian.org","https://wiki.debian.org/FrontPage?action=fullsearch&value={query}","BookOpen","#A81D33");
add("ubuntu-wiki","Ubuntu Wiki","wiki","https://wiki.ubuntu.com","https://wiki.ubuntu.com/FrontPage?action=fullsearch&value={query}","BookOpen","#E95420");
add("fedora-wiki","Fedora Wiki","wiki","https://fedoraproject.org","https://fedoraproject.org/wiki/Special:Search?search={query}","BookOpen","#3C6EB4");
add("freebsd-wiki","FreeBSD Wiki","wiki","https://wiki.freebsd.org","https://wiki.freebsd.org/Special:Search?search={query}","BookOpen","#AB2B28");
add("openbsd-wiki","OpenBSD Wiki","wiki","https://wiki.openbsd.org","https://wiki.openbsd.org/","BookOpen","#E8E8E8");
add("nixos-wiki","NixOS Wiki","wiki","https://nixos.wiki","https://nixos.wiki/index.php?search={query}","BookOpen","#7E57C2");
add("alpine-wiki","Alpine Wiki","wiki","https://wiki.alpinelinux.org","https://wiki.alpinelinux.org/w/index.php?search={query}","BookOpen","#0D597F");
add("mozilla-wiki","Mozilla Wiki","wiki","https://wiki.mozilla.org","https://wiki.mozilla.org/Special:Search?search={query}","BookOpen","#000000");
add("opensuse-wiki","openSUSE Wiki","wiki","https://en.opensuse.org","https://en.opensuse.org/index.php?search={query}","BookOpen","#73BA25");
add("caddy-wiki","Caddy Wiki","docs","https://caddyserver.com","https://caddyserver.com/docs?q={query}","BookOpen","#1F8C8A");
add("nginx-docs","NGINX Docs","docs","https://nginx.org","https://nginx.org/en/docs/","BookOpen","#009639");
add("apache-docs","Apache Docs","docs","https://httpd.apache.org","https://httpd.apache.org/docs/","BookOpen","#B21142");
add("docker-docs","Docker Docs","docs","https://docs.docker.com","https://docs.docker.com/search/?q={query}","BookOpen","#2496ED");
add("k8s-docs","Kubernetes Docs","docs","https://kubernetes.io","https://kubernetes.io/search/?q={query}","BookOpen","#326CE5");
add("nodejs-docs","Node.js Docs","docs","https://nodejs.org","https://nodejs.org/en/docs/","BookOpen","#5FA04E");
add("python-docs","Python Docs","docs","https://docs.python.org","https://docs.python.org/3/search.html?q={query}","BookOpen","#3776AB");
add("rust-docs","Rust Docs","docs","https://doc.rust-lang.org","https://doc.rust-lang.org/std/?search={query}","BookOpen","#000000");
add("go-docs","Go Docs","docs","https://go.dev","https://go.dev/search?q={query}","BookOpen","#00ADD8");
add("ruby-docs","Ruby Docs","docs","https://docs.ruby-lang.org","https://docs.ruby-lang.org/en/","BookOpen","#CC342D");
add("php-docs","PHP Docs","docs","https://www.php.net","https://www.php.net/manual-lookup.php?pattern={query}","BookOpen","#777BB4");
add("java-docs","Java Docs","docs","https://docs.oracle.com","https://docs.oracle.com/search/?q={query}&pt=en","BookOpen","#ED8B00");
add("cpp-docs","C++ Reference","docs","https://en.cppreference.com","https://en.cppreference.com/mwiki/index.php?search={query}","BookOpen","#659AD2");
add("elixir-docs","Elixir Docs","docs","https://hexdocs.pm","https://hexdocs.pm/search?q={query}","BookOpen","#4B275F");
add("haskell-docs","Haskell Docs","docs","https://haskell.org","https://haskell.org/documentation.html","BookOpen","#5E5086");
add("swift-docs","Swift Docs","docs","https://swift.org","https://swift.org/documentation/","BookOpen","#FA7343");
add("kotlin-docs","Kotlin Docs","docs","https://kotlinlang.org","https://kotlinlang.org/docs/home.html","BookOpen","#7F52FF");
add("scala-docs","Scala Docs","docs","https://docs.scala-lang.org","https://docs.scala-lang.org/search.html?q={query}","BookOpen","#DC322F");
add("perl-docs","Perl Docs","docs","https://perldoc.perl.org","https://perldoc.perl.org/","BookOpen","#39A0DC");
add("lua-docs","Lua Docs","docs","https://www.lua.org","https://www.lua.org/docs.html","BookOpen","#000080");
add("dart-docs","Dart Docs","docs","https://dart.dev","https://dart.dev/search?q={query}","BookOpen","#00BCD4");
add("typescript-docs","TypeScript Docs","docs","https://www.typescriptlang.org","https://www.typescriptlang.org/","BookOpen","#3178C6");
add("react-docs","React Docs","docs","https://react.dev","https://react.dev/search?q={query}","BookOpen","#087EA4");
add("vue-docs","Vue Docs","docs","https://vuejs.org","https://vuejs.org/","BookOpen","#42B883");
add("angular-docs","Angular Docs","docs","https://angular.io","https://angular.io/search?q={query}","BookOpen","#DD0031");
add("svelte-docs","Svelte Docs","docs","https://svelte.dev","https://svelte.dev/","BookOpen","#FF3E00");
add("nextjs-docs","Next.js Docs","docs","https://nextjs.org","https://nextjs.org/","BookOpen","#000000");
add("nuxt-docs","Nuxt Docs","docs","https://nuxt.com","https://nuxt.com/","BookOpen","#00DC82");
add("astro-docs","Astro Docs","docs","https://astro.build","https://astro.build/","BookOpen","#FF5D01");
add("remix-docs","Remix Docs","docs","https://remix.run","https://remix.run/","BookOpen","#3992FF");
add("vite-docs","Vite Docs","docs","https://vitejs.dev","https://vitejs.dev/","BookOpen","#646CFF");
add("webpack-docs","Webpack Docs","docs","https://webpack.js.org","https://webpack.js.org/","BookOpen","#1C78C0");
add("rollup-docs","Rollup Docs","docs","https://rollupjs.org","https://rollupjs.org/","BookOpen","#EC4A3F");
add("esbuild-docs","esBuild Docs","docs","https://esbuild.github.io","https://esbuild.github.io/","BookOpen","#FFAA00");
add("tailwind-docs","Tailwind Docs","docs","https://tailwindcss.com","https://tailwindcss.com/","BookOpen","#06B6D4");
add("bootstrap-docs","Bootstrap Docs","docs","https://getbootstrap.com","https://getbootstrap.com/","BookOpen","#7952B3");
add("jquery-docs","jQuery Docs","docs","https://jquery.com","https://jquery.com/","BookOpen","#0769AD");
add("django-docs","Django Docs","docs","https://docs.djangoproject.com","https://docs.djangoproject.com/search/?q={query}","BookOpen","#0C4B33");
add("flask-docs","Flask Docs","docs","https://flask.palletsprojects.com","https://flask.palletsprojects.com/","BookOpen","#000000");
add("fastapi-docs","FastAPI Docs","docs","https://fastapi.tiangolo.com","https://fastapi.tiangolo.com/","BookOpen","#009688");
add("rails-docs","Rails Docs","docs","https://guides.rubyonrails.org","https://guides.rubyonrails.org/","BookOpen","#CC0000");
add("laravel-docs","Laravel Docs","docs","https://laravel.com","https://laravel.com/","BookOpen","#FF2D20");
add("spring-docs","Spring Docs","docs","https://spring.io","https://spring.io/","BookOpen","#6DB33F");
add("express-docs","Express Docs","docs","https://expressjs.com","https://expressjs.com/","BookOpen","#000000");
add("fastify-docs","Fastify Docs","docs","https://fastify.io","https://fastify.io/","BookOpen","#000000");
add("nestjs-docs","NestJS Docs","docs","https://nestjs.com","https://nestjs.com/","BookOpen","#E0234E");
add("actix-docs","Actix Docs","docs","https://actix.rs","https://actix.rs/","BookOpen","#000000");
add("axum-docs","Axum Docs","docs","https://docs.rs/axum","https://docs.rs/axum","BookOpen","#000000");
add("rocket-docs","Rocket Docs","docs","https://rocket.rs","https://rocket.rs/","BookOpen","#D3382B");
add("gin-docs","Gin Docs","docs","https://gin-gonic.com","https://gin-gonic.com/","BookOpen","#00BEC8");
add("fiber-docs","Fiber Docs","docs","https://docs.gofiber.io","https://docs.gofiber.io/","BookOpen","#00B570");
add("echo-docs","Echo Docs","docs","https://echo.labstack.com","https://echo.labstack.com/","BookOpen","#3FB0EF");
add("phoenix-docs","Phoenix Docs","docs","https://hexdocs.pm/phoenix","https://hexdocs.pm/phoenix/","BookOpen","#FD4F00");
add("symfony-docs","Symfony Docs","docs","https://symfony.com","https://symfony.com/","BookOpen","#000000");
add("codeigniter-docs","CodeIgniter Docs","docs","https://codeigniter.com","https://codeigniter.com/","BookOpen","#DD4814");
add("yii-docs","Yii Docs","docs","https://www.yiiframework.com","https://www.yiiframework.com/","BookOpen","#40B570");
add("tornado-docs","Tornado Docs","docs","https://www.tornadoweb.org","https://www.tornadoweb.org/","BookOpen","#000000");
add("aiohttp-docs","aiohttp Docs","docs","https://docs.aiohttp.org","https://docs.aiohttp.org/","BookOpen","#2C5BB4");
add("starlette-docs","Starlette Docs","docs","https://www.starlette.io","https://www.starlette.io/","BookOpen","#E91E63");

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

console.log(`Generated ${deduped.length} sources to ${outPath}`);
