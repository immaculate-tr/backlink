import { useMemo, useState } from "react";
import type { BacklinkSource } from "@/lib/sources";
import {
  DEFAULT_PROFILE,
  STATUS_LABELS,
  buildSubmissionText,
  isProfileDefault,
  isSubmittable,
  loadProfile,
  loadSubmissionStatuses,
  saveBulkSubmissionStatus,
  saveProfile,
  saveSubmissionStatus,
  type BusinessProfile,
  type SubmissionStatus,
} from "@/lib/submission";
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Save,
  Search,
  Square,
} from "lucide-react";

const STATUS_ORDER: SubmissionStatus[] = [
  "not_started",
  "submitted",
  "in_review",
  "live",
  "rejected",
];

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  not_started: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  submitted: "text-blue-300 bg-blue-500/10 border-blue-500/20",
  in_review: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
  live: "text-green-300 bg-green-500/10 border-green-500/20",
  rejected: "text-red-300 bg-red-500/10 border-red-500/20",
};

export default function SubmissionAssistant({ sources }: { sources: BacklinkSource[] }) {
  const [profile, setProfile] = useState<BusinessProfile>(() => loadProfile());
  const [profileOpen, setProfileOpen] = useState<boolean>(() => isProfileDefault(loadProfile()));
  const [savedFlash, setSavedFlash] = useState(false);
  const [statuses, setStatuses] = useState(() => loadSubmissionStatuses());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SubmissionStatus>("all");
  const [onlySubmittable, setOnlySubmittable] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<SubmissionStatus>("submitted");

  const candidates = useMemo(() => {
    let list = onlySubmittable ? sources.filter(isSubmittable) : sources;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.base_url.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter((s) => (statuses[s.id]?.status || "not_started") === statusFilter);
    }
    return list;
  }, [sources, onlySubmittable, query, statusFilter, statuses]);

  const totalCandidates = useMemo(() => sources.filter(isSubmittable).length, [sources]);
  const statCounts = useMemo(() => {
    const counts: Record<SubmissionStatus, number> = {
      not_started: 0,
      submitted: 0,
      in_review: 0,
      live: 0,
      rejected: 0,
    };
    for (const s of sources.filter(isSubmittable)) {
      const st: SubmissionStatus = statuses[s.id]?.status || "not_started";
      counts[st]++;
    }
    return counts;
  }, [sources, statuses]);

  const handleSaveProfile = () => {
    saveProfile(profile);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleStatusChange = (sourceId: string, status: SubmissionStatus) => {
    const next = saveSubmissionStatus(sourceId, { status });
    setStatuses({ ...next });
  };

  const handleNoteChange = (sourceId: string, note: string) => {
    const next = saveSubmissionStatus(sourceId, { note });
    setStatuses({ ...next });
  };

  const allVisibleSelected = candidates.length > 0 && candidates.every((s) => selected.has(s.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        // Deselect just the currently visible ones, keep any selection outside this filter
        const next = new Set(prev);
        for (const s of candidates) next.delete(s.id);
        return next;
      }
      const next = new Set(prev);
      for (const s of candidates) next.add(s.id);
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyBulkStatus = () => {
    if (selected.size === 0) return;
    const next = saveBulkSubmissionStatus(Array.from(selected), bulkStatus);
    setStatuses({ ...next });
    setSelected(new Set());
  };

  const handleCopy = async (source: BacklinkSource) => {
    const text = buildSubmissionText(source, profile);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(source.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard API unavailable — nothing to do, user can still select the text manually elsewhere
    }
  };

  const usingDefaultProfile = isProfileDefault(profile);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.03] p-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          Bu bir otomatik gönderim botu değildir
        </h3>
        <p className="text-sm text-slate-400">
          Aşağıdaki her platform için hazır başlık/açıklama/anahtar kelime metni üretir ve hangi platformlara
          gönderim yaptığınızı takip etmenizi sağlar. Gönderimin kendisi — form doldurma, CAPTCHA, e-posta
          onayı — sizin tarafınızdan, elle yapılır. Bu bilinçli bir tercih: yüzlerce sitede otomatik hesap/form
          işlemleri hem o sitelerin kullanım şartlarını ihlal eder hem de {profile.websiteUrl.replace(/^https?:\/\//, "")}'nin
          arama sıralamasını riske atar.
        </p>
      </div>

      {/* Profile editor */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            İşletme Profili
            {usingDefaultProfile && (
              <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-300">
                Düzenlenmedi — önce bunu doldurun
              </span>
            )}
          </h3>
          {profileOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {profileOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-500">
              Bu bilgiler tarayıcınızda ({typeof window !== "undefined" ? "localStorage" : "cihazınızda"}) saklanır,
              hiçbir yere gönderilmez. Her platform kartındaki "Kopyala" butonu bu profilden metin üretir.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Site / İşletme Adı">
                <input
                  className="input"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </Field>
              <Field label="Web Sitesi">
                <input
                  className="input"
                  value={profile.websiteUrl}
                  onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
                />
              </Field>
              <Field label="Kategori">
                <input
                  className="input"
                  value={profile.category}
                  onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                />
              </Field>
              <Field label="İletişim E-postası (opsiyonel)">
                <input
                  className="input"
                  value={profile.contactEmail}
                  onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                />
              </Field>
              <Field label="Slogan">
                <input
                  className="input"
                  value={profile.tagline}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                />
              </Field>
              <Field label="Anahtar Kelimeler (virgülle ayırın)">
                <input
                  className="input"
                  value={profile.keywords}
                  onChange={(e) => setProfile({ ...profile, keywords: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Kısa Açıklama (~80 karakter — sıkı limitli dizinler için)">
              <textarea
                className="input min-h-[60px]"
                value={profile.shortDescription}
                onChange={(e) => setProfile({ ...profile, shortDescription: e.target.value })}
              />
            </Field>
            <Field label="Orta Açıklama (~160 karakter — genel amaçlı varsayılan)">
              <textarea
                className="input min-h-[70px]"
                value={profile.mediumDescription}
                onChange={(e) => setProfile({ ...profile, mediumDescription: e.target.value })}
              />
            </Field>
            <Field label="Uzun Açıklama (~400 karakter — 'Hakkımızda' alanları için)">
              <textarea
                className="input min-h-[100px]"
                value={profile.longDescription}
                onChange={(e) => setProfile({ ...profile, longDescription: e.target.value })}
              />
            </Field>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-400"
              >
                <Save className="h-4 w-4" />
                Profili Kaydet
              </button>
              {savedFlash && (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                  <Check className="h-4 w-4" /> Kaydedildi
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatMini label="Toplam Aday" value={totalCandidates} />
        {STATUS_ORDER.map((s) => (
          <StatMini key={s} label={STATUS_LABELS[s]} value={statCounts[s]} accent={STATUS_COLORS[s]} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            Tümü
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === s ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={onlySubmittable}
              onChange={(e) => setOnlySubmittable(e.target.checked)}
              className="accent-yellow-500"
            />
            Sadece gönderim adayları (dizin/sosyal/medya)
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Platform ara..."
              className="input w-48 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Select all + bulk action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <button
          onClick={toggleSelectAll}
          disabled={candidates.length === 0}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 transition-colors hover:text-white disabled:opacity-40"
        >
          {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-yellow-400" /> : <Square className="h-4 w-4" />}
          Tümünü Seç {candidates.length > 0 && `(${candidates.length})`}
        </button>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">{selected.size} platform seçildi —</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as SubmissionStatus)}
              className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-xs text-slate-200"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s} className="bg-[#060B1A] text-white">
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              onClick={handleApplyBulkStatus}
              className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-1 text-xs font-semibold text-black transition-colors hover:bg-yellow-400"
            >
              Seçilenlere Uygula
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              Seçimi Temizle
            </button>
          </div>
        )}
      </div>

      {/* Candidate list */}
      <div className="space-y-3">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] py-16 text-center">
            <Search className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">Bu filtrelerle eşleşen platform yok.</p>
          </div>
        ) : (
          candidates.map((source) => {
            const record = statuses[source.id];
            const status = record?.status || "not_started";
            return (
              <div key={source.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(source.id)}
                      onChange={() => toggleSelectOne(source.id)}
                      className="accent-yellow-500"
                    />
                    <span className="text-sm font-medium text-white">{source.name}</span>
                    <a
                      href={source.base_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-white"
                    >
                      {source.base_url.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(source.id, e.target.value as SubmissionStatus)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[status]} bg-transparent`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s} className="bg-[#060B1A] text-white">
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleCopy(source)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"
                    >
                      {copiedId === source.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === source.id ? "Kopyalandı" : "Metni Kopyala"}
                    </button>
                  </div>
                </div>
                <input
                  value={record?.note || ""}
                  onChange={(e) => handleNoteChange(source.id, e.target.value)}
                  placeholder="Not ekle (ör. gönderim tarihi, onay bekleniyor, kullanıcı adı...)"
                  className="input mt-3 w-full text-xs"
                />
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: white;
        }
        .input:focus {
          outline: none;
          border-color: rgba(234,179,8,0.4);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function StatMini({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const [textCls, bgCls, borderCls] = (accent || "").split(" ");
  const wrapperCls = accent ? `${borderCls} ${bgCls}` : "border-white/5 bg-white/[0.02]";
  return (
    <div className={`rounded-xl border p-3 ${wrapperCls}`}>
      <div className={`text-lg font-bold ${textCls || "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
