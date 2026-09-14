import { useEffect, useMemo, useState, useCallback } from "react";
import {
  SOURCES,
  TARGET_DOMAIN,
  type BacklinkSource,
} from "@/lib/sources";
import {
  runVerification,
  loadResults,
  saveResults,
  buildErrorReportCSV,
  downloadCSV,
  type VerificationResult,
  type ResultsData,
} from "@/lib/verify";
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Code,
  Database,
  Download,
  ExternalLink,
  GitBranch,
  Github,
  Globe,
  HelpCircle,
  Image,
  Info,
  Loader2,
  MessageCircle,
  Newspaper,
  Package,
  PenTool,
  Play,
  Search,
  Settings,
  TrendingUp,
  XCircle,
} from "lucide-react";

type IconProps = { className?: string; style?: React.CSSProperties };
const iconMap: Record<string, React.ComponentType<IconProps>> = {
  BookOpen,
  Github,
  Globe,
  Search,
  MessageCircle,
  HelpCircle,
  Newspaper,
  Archive,
  Image,
  Database,
  Code,
  GitBranch,
  PenTool,
  Package,
};

function getIcon(name: string) {
  return iconMap[name] || Globe;
}

type TabType = "overview" | "sources" | "results" | "setup";

export default function App() {
  const [sources] = useState<BacklinkSource[]>(SOURCES);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanCurrent, setScanCurrent] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadData = useCallback(async () => {
    const data = await loadResults();
    setResultsData(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanCompleted(0);
    setScanTotal(sources.filter((s) => s.is_active).length);
    setScanCurrent("Tarama başlatılıyor...");

    try {
      const results = await runVerification(
        TARGET_DOMAIN,
        sources,
        (completed, total, name) => {
          setScanCompleted(completed);
          setScanTotal(total);
          setScanCurrent(name);
        },
        resultsData?.results
      );

      const now = new Date().toISOString();
      saveResults(results, now);
      await loadData();
    } catch (err) {
      setScanCurrent("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        setScanCompleted(0);
        setScanCurrent("");
      }, 3000);
    }
  }, [sources, loadData, resultsData]);

  const handleDownloadErrorReport = useCallback(() => {
    if (!resultsData) return;
    const csv = buildErrorReportCSV(resultsData.results, resultsData.sources, TARGET_DOMAIN);
    if (!csv) return;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCSV(csv, `hata-raporu-${ts}.csv`);
  }, [resultsData]);

  const stats = useMemo(() => {
    if (!resultsData || resultsData.results.length === 0)
      return { total: 0, verified: 0, notFound: 0, errors: 0 };
    return {
      total: resultsData.results.length,
      verified: resultsData.verified,
      notFound: resultsData.not_found,
      errors: resultsData.errors,
    };
  }, [resultsData]);

  const displayResults: VerificationResult[] = useMemo(() => {
    if (!resultsData) return [];
    return resultsData.results;
  }, [resultsData]);

  const filteredResults = useMemo(() => {
    if (filterStatus === "all") return displayResults;
    return displayResults.filter((r) => r.status === filterStatus);
  }, [displayResults, filterStatus]);

  const historyByDate = useMemo(() => {
    if (!resultsData || !resultsData.history) return [];
    return resultsData.history.slice(-5).map((dateStr) => {
      const d = new Date(dateStr);
      const label = d.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      return [label, dateStr] as [string, string];
    });
  }, [resultsData]);

  const verifiedPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
  const lastChecked = resultsData?.checked_at || null;
  const scanPct = scanTotal > 0 ? Math.round((scanCompleted / scanTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#060B1A] text-slate-200">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#060B1A]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/20">
              <TrendingUp className="h-5 w-5 text-[#060B1A]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Backlink Doğrulama Merkezi</h1>
              <p className="text-xs text-slate-400">{TARGET_DOMAIN} — Açık Kaynak Tarama</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastChecked && (
              <div className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Son tarama:{" "}
                  {new Date(lastChecked).toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            <button
              onClick={runScan}
              disabled={isScanning}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-2 text-sm font-semibold text-[#060B1A] shadow-lg shadow-yellow-500/20 transition-all hover:shadow-yellow-500/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isScanning ? "Taranıyor..." : "Tarama Başlat"}
            </button>
            {stats.errors > 0 && (
              <button
                onClick={handleDownloadErrorReport}
                title="Hangi platformun hangi hatayı verdiğini gösteren CSV raporu indir"
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-all hover:bg-red-500/20"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Hata Raporu ({stats.errors})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Live Scan Progress */}
        {isScanning && (
          <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-yellow-300">
                <Activity className="h-4 w-4 animate-pulse" />
                {scanCurrent} taranıyor...
              </span>
              <span className="font-mono text-yellow-300">
                {scanCompleted}/{scanTotal} ({scanPct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-yellow-950/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-500"
                style={{ width: `${scanPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Scan complete flash */}
        {!isScanning && scanCompleted > 0 && scanPct === 100 && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Tarama tamamlandı! {stats.verified} backlink doğrulandı.
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
          {([
            { id: "overview", label: "Genel Bakış", icon: TrendingUp },
            { id: "sources", label: "Platformlar", icon: Globe },
            { id: "results", label: "Sonuçlar", icon: Search },
            { id: "setup", label: "Kurulum", icon: Settings },
          ] as { id: TabType; label: string; icon: React.ComponentType<IconProps> }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            verifiedPct={verifiedPct}
            lastChecked={lastChecked}
            historyByDate={historyByDate}
            sourcesCount={sources.length}
            displayResults={displayResults}
            isLoading={isLoading}
          />
        )}

        {activeTab === "sources" && <SourcesTab sources={sources} />}

        {activeTab === "results" && (
          <ResultsTab
            results={filteredResults}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            lastChecked={lastChecked}
          />
        )}

        {activeTab === "setup" && <SetupTab sourcesCount={sources.length} />}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sublabel,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<IconProps>;
  color: string;
  sublabel?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-white/10">
      <div className="absolute right-0 top-0 h-20 w-20 opacity-5 transition-opacity group-hover:opacity-10">
        <Icon className="h-full w-full" />
      </div>
      <div className="relative">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}20` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-slate-400">{label}</p>
        {sublabel && <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p>}
      </div>
    </div>
  );
}

function OverviewTab({
  stats,
  verifiedPct,
  lastChecked,
  historyByDate,
  sourcesCount,
  displayResults,
  isLoading,
}: {
  stats: { total: number; verified: number; notFound: number; errors: number };
  verifiedPct: number;
  lastChecked: string | null;
  historyByDate: [string, string][];
  sourcesCount: number;
  displayResults: VerificationResult[];
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Toplam Platform" value={sourcesCount} icon={Globe} color="#E5E7EB" sublabel="Aktif açık kaynak" />
        <StatCard label="Doğrulanmış Backlink" value={stats.verified} icon={CheckCircle2} color="#22C55E" sublabel={`${verifiedPct}% başarı oranı`} />
        <StatCard label="Bulunamadı" value={stats.notFound} icon={XCircle} color="#FACC15" sublabel="Backlink tespit edilmedi" />
        <StatCard label="Hata" value={stats.errors} icon={AlertCircle} color="#EF4444" sublabel="Erişilemedi" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-400">Doğrulama Oranı</h3>
          <div className="relative h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#gradVerify)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(verifiedPct / 100) * 264} 264`} className="transition-all duration-1000" />
              <defs>
                <linearGradient id="gradVerify" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#FACC15" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{verifiedPct}%</span>
              <span className="text-xs text-slate-400">doğrulandı</span>
            </div>
          </div>
          {lastChecked && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Son tarama:{" "}
              {new Date(lastChecked).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Doğrulanmış Backlinkler
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            </div>
          ) : displayResults.filter((r) => r.status === "verified").length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-500">Henüz doğrulanmış backlink bulunmuyor.</p>
              <p className="mt-1 text-xs text-slate-600">"Tarama Başlat" butonuna tıklayarak taramayı başlatın.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayResults.filter((r) => r.status === "verified").map((r, i) => (
                <div key={i} className="group flex items-center gap-3 rounded-lg border border-green-500/10 bg-green-500/5 p-3 transition-all hover:border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{r.source_name}</p>
                    <p className="truncate text-xs text-slate-400">{r.found_url || "URL bulunamadı"}</p>
                  </div>
                  {r.found_url && (
                    <a href={r.found_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-500 transition-colors hover:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {historyByDate.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock className="h-4 w-4 text-yellow-400" />
            Tarama Geçmişi
          </h3>
          <div className="space-y-3">
            {historyByDate.map(([date, dateStr]) => (
              <div key={dateStr} className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="w-32 shrink-0 text-xs text-slate-400">{date}</div>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-yellow-400 transition-all" style={{ width: `${verifiedPct}%` }} />
                  </div>
                </div>
                <div className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-300">{stats.verified}/{stats.total} doğrulandı</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SourcesTab({ sources }: { sources: BacklinkSource[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sources.map((src) => {
        const Icon = getIcon(src.logo_icon);
        return (
          <div key={src.id} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-white/10 hover:bg-white/[0.04]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${src.color}20` }}>
                <Icon className="h-5 w-5" style={{ color: src.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-semibold text-white">{src.name}</h4>
                  {src.is_active ? (
                    <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">Aktif</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">Pasif</span>
                  )}
                </div>
                <p className="mt-1 text-xs capitalize text-slate-400">{src.platform_type}</p>
                <a href={src.base_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-yellow-400">
                  {src.base_url.replace("https://", "")}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultsTab({
  results,
  filterStatus,
  setFilterStatus,
  lastChecked,
}: {
  results: VerificationResult[];
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  lastChecked: string | null;
}) {
  const filters = [
    { id: "all", label: "Tümü" },
    { id: "verified", label: "Doğrulandı" },
    { id: "not_found", label: "Bulunamadı" },
    { id: "error", label: "Hata" },
    { id: "server_only", label: "Sunucu Bekliyor" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterStatus === f.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {lastChecked && (
          <span className="text-xs text-slate-500">{new Date(lastChecked).toLocaleString("tr-TR")}</span>
        )}
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] py-20 text-center">
          <Search className="mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">Henüz doğrulama sonucu yok.</p>
          <p className="mt-1 text-xs text-slate-600">"Tarama Başlat" butonuna tıklayarak ilk taramayı yapın.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#060B1A]">
                <tr className="border-b border-white/5 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">HTTP</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Süre</th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">Bulunan URL</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><span className="text-sm font-medium text-white">{r.source_name}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="hidden px-4 py-3 md:table-cell"><span className="font-mono text-xs text-slate-400">{r.http_status || "—"}</span></td>
                    <td className="hidden px-4 py-3 lg:table-cell"><span className="font-mono text-xs text-slate-400">{r.response_time_ms ? `${r.response_time_ms}ms` : "—"}</span></td>
                    <td className="hidden max-w-xs px-4 py-3 xl:table-cell"><span className="block truncate text-xs text-slate-400">{r.found_url || r.error_message || "—"}</span></td>
                    <td className="px-4 py-3 text-right">
                      {r.found_url && (
                        <a href={r.found_url} target="_blank" rel="noopener noreferrer" className="inline-flex text-slate-500 transition-colors hover:text-white">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupTab({ sourcesCount }: { sourcesCount: number }) {
  const steps = [
    {
      title: "Projeyi GitHub'a yükleyin",
      desc: "Tüm dosyaları bir GitHub reposuna pushlayın. Repoyu public yapın ki GitHub Pages ücretsiz çalışsın.",
    },
    {
      title: "GitHub Pages'i açın",
      desc: "Repo ayarları > Pages > Source: GitHub Actions seçin. Deploy workflow otomatik siteyi yayımlar.",
    },
    {
      title: "Otomatik taramayı çalıştırın",
      desc: "Actions sekmesinden 'Weekly Backlink Verification' workflow'unu bulun ve 'Run workflow' ile manuel başlatın.",
    },
    {
      title: "Sonuçları görüntüleyin",
      desc: "Tarama bitince sonuçlar otomatik kaydedilir ve siteye yansır. Her hafta pazartesi otomatik tekrarlanır.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
          <Info className="h-5 w-5 text-yellow-400" />
          Nasıl Çalışır?
        </h3>
        <p className="text-sm text-slate-400">
          Bu sistem {sourcesCount} açık kaynak platformda immaculate.tr için gerçek backlink arar.
          Tarama iki şekilde çalışır: tarayıcıdan "Tarama Başlat" ile anında, veya GitHub Actions ile her hafta otomatik.
        </p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
          <Settings className="h-5 w-5 text-yellow-400" />
          Kurulum Adımları
        </h3>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-sm font-bold text-yellow-400">
                {i + 1}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">{step.title}</h4>
                <p className="mt-1 text-sm text-slate-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.03] p-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Play className="h-4 w-4 text-green-400" />
          Tarayıcıdan Tarama
        </h3>
        <p className="text-sm text-slate-400">
          "Tarama Başlat" butonuna tıklayarak anında tarama yapabilirsiniz.
          Tarama sonucu tarayıcıda kaydedilir ve sayfa yenilense bile kaybolmaz.
          Bazı platformlar tarayıcı güvenlik kısıtlamaları (CORS) nedeniyle erişilemez —
          bu platformlar tarayıcı taramasında "Sunucu Taraması Bekliyor" olarak işaretlenir
          (bu bir hata değildir) ve yalnızca GitHub Actions üzerinden otomatik olarak taranır.
        </p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Clock className="h-4 w-4 text-yellow-400" />
          Otomatik Haftalık Tarama
        </h3>
        <p className="text-sm text-slate-400">
          GitHub Actions her hafta pazartesi 03:00 UTC'de otomatik olarak tüm {sourcesCount} platformu tarar,
          sonuçları <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-slate-300">results.json</code> dosyasına kaydeder ve
          siteyi günceller. Manuel tetiklemek için Actions sekmesinden "Weekly Backlink Verification" workflow'unu çalıştırın.
        </p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Database className="h-4 w-4 text-yellow-400" />
          Platform Dağılımı
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "Wiki", icon: BookOpen, color: "#000000" },
            { label: "Soru-Cevap", icon: HelpCircle, color: "#F48024" },
            { label: "Sosyal", icon: MessageCircle, color: "#FF4500" },
            { label: "Dokümantasyon", icon: Code, color: "#0A0A0A" },
            { label: "Dizin", icon: Package, color: "#CB3837" },
            { label: "Arama", icon: Search, color: "#DE5833" },
            { label: "Akademik", icon: BookOpen, color: "#B31B1B" },
            { label: "Medya", icon: Image, color: "#0063DC" },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${cat.color}20` }}>
                  <Icon className="h-4 w-4" style={{ color: cat.color }} />
                </div>
                <span className="text-xs text-slate-400">{cat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: VerificationResult["status"] }) {
  const config = {
    verified: { icon: CheckCircle2, text: "Doğrulandı", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    not_found: { icon: XCircle, text: "Bulunamadı", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    error: { icon: AlertCircle, text: "Hata", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    server_only: { icon: Clock, text: "Sunucu Taraması Bekliyor", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.border} ${c.color}`}>
      <c.icon className="h-3 w-3" />
      {c.text}
    </span>
  );
}
