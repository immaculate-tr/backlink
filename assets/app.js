(function () {
  'use strict';

  // ---- Utility: HTML escape (XSS protection) ----
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // ---- Utility: format date ----
  function formatDate(iso) {
    if (!iso) return '--';
    try {
      var d = new Date(iso);
      var day = String(d.getDate()).padStart(2, '0');
      var month = String(d.getMonth() + 1).padStart(2, '0');
      var year = d.getFullYear();
      var hours = String(d.getHours()).padStart(2, '0');
      var mins = String(d.getMinutes()).padStart(2, '0');
      return day + '.' + month + '.' + year + ' ' + hours + ':' + mins;
    } catch (e) {
      return '--';
    }
  }

  // ---- Data loader ----
  var DATA_BASE = 'data/';

  function loadData(filename, callback) {
    fetch(DATA_BASE + filename)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) { callback(null, data); })
      .catch(function (err) { callback(err, null); });
  }

  function loadText(filename, callback) {
    fetch(DATA_BASE + filename)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (data) { callback(null, data); })
      .catch(function (err) { callback(err, null); });
  }

  // ---- Theme ----
  function initTheme() {
    var saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    var toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') || 'light';
        var next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      });
    }
  }

  // ---- Sidebar ----
  function initSidebar() {
    var toggle = document.getElementById('menuToggle');
    var sidebar = document.querySelector('.sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
    }
    // Close sidebar on nav click (mobile)
    if (sidebar) {
      var items = sidebar.querySelectorAll('.sidebar-nav-item');
      items.forEach(function (item) {
        item.addEventListener('click', function () {
          if (window.innerWidth < 768) {
            sidebar.classList.remove('open');
          }
        });
      });
    }
  }

  // ---- Toast ----
  function showToast(message, type) {
    type = type || 'info';
    var container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

  // ---- Navigation ----
  function navigateTo(page) {
    window.location.href = page;
  }

  // ---- Dashboard ----
  function initDashboard() {
    var dash = document.getElementById('dashboardPage');
    if (!dash) return;

    loadData('statistics.json', function (err, stats) {
      if (err) {
        showToast('Veri yüklenemedi', 'error');
        return;
      }
      renderDashboardStats(stats);
    });

    loadData('platforms.json', function (err, platforms) {
      if (err) return;
      renderRecentActivity(platforms);
    });

    loadData('backlinks.json', function (err, backlinks) {
      if (err) return;
      renderBacklinkHealth(backlinks);
    });

    loadData('business.json', function (err, business) {
      if (err) return;
      renderHeroCard(business);
    });
  }

  function renderHeroCard(business) {
    var el = document.getElementById('heroCard');
    if (!el) return;
    var name = escapeHtml(business.name || 'Henüz site eklenmedi');
    var website = escapeHtml(business.website || 'https://example.com');
    el.innerHTML =
      '<h1>' + name + '</h1>' +
      '<p>Premium Backlink Automation Project</p>' +
      '<div class="hero-card-info">' +
        '<div class="hero-info-item">' +
          '<span class="hero-info-label">Website</span>' +
          '<span class="hero-info-value">' + website + '</span>' +
        '</div>' +
        '<div class="hero-info-item">' +
          '<span class="hero-info-label">Status</span>' +
          '<span class="hero-info-value"><span class="status-dot active"></span>Aktif</span>' +
        '</div>' +
        '<div class="hero-info-item">' +
          '<span class="hero-info-label">Last Run</span>' +
          '<span class="hero-info-value" id="lastRun">--</span>' +
        '</div>' +
      '</div>';
  }

  function renderDashboardStats(stats) {
    var el = document.getElementById('statGrid');
    if (!el) return;
    var lastRunEl = document.getElementById('lastRun');
    if (lastRunEl && stats.last_run) lastRunEl.textContent = formatDate(stats.last_run);

    el.innerHTML =
      statCard('Platforms', stats.total_platforms || 0, 'primary', 'P') +
      statCard('Published', stats.published || 0, 'success', 'Pu') +
      statCard('Pending', stats.queued || 0, 'warning', 'Pe') +
      statCard('Failed', stats.failed || 0, 'error', 'F');
  }

  function statCard(label, value, color, icon) {
    return '<div class="stat-card">' +
      '<div class="stat-card-icon ' + color + '">' + escapeHtml(icon) + '</div>' +
      '<div class="stat-card-label">' + escapeHtml(label) + '</div>' +
      '<div class="stat-card-value">' + escapeHtml(String(value)) + '</div>' +
    '</div>';
  }

  function renderRecentActivity(platforms) {
    var el = document.getElementById('recentActivity');
    if (!el) return;
    var items = platforms.slice(0, 6).map(function (p) {
      var initial = escapeHtml(p.name.charAt(0).toUpperCase());
      var status = p.active ? 'Published' : 'Pending';
      var badgeClass = p.active ? 'badge-success' : 'badge-warning';
      return '<div class="activity-item">' +
        '<div class="activity-platform">' +
          '<div class="activity-platform-icon">' + initial + '</div>' +
          escapeHtml(p.name) +
        '</div>' +
        '<span class="badge ' + badgeClass + '">' + status + '</span>' +
      '</div>';
    });
    el.innerHTML = items.join('') || '<div class="empty-state"><div class="empty-state-text">Henüz aktivite yok</div></div>';
  }

  function renderBacklinkHealth(backlinks) {
    var el = document.getElementById('backlinkHealth');
    if (!el) return;
    var counts = { verified: 0, pending: 0, removed: 0, failed: 0, noindex: 0, nofollow: 0, redirect: 0 };
    backlinks.forEach(function (b) {
      if (counts[b.status] !== undefined) counts[b.status]++;
      if (b.nofollow) counts.nofollow++;
    });
    var total = backlinks.length || 1;
    var items = [
      { label: 'Verified', key: 'verified', color: 'success' },
      { label: 'Pending', key: 'pending', color: 'warning' },
      { label: 'Removed', key: 'removed', color: 'error' },
      { label: 'Failed', key: 'failed', color: 'error' },
      { label: 'Noindex', key: 'noindex', color: 'warning' },
      { label: 'Nofollow', key: 'nofollow', color: 'warning' },
      { label: 'Redirect', key: 'redirect', color: 'primary' }
    ];
    el.innerHTML = items.map(function (item) {
      var count = counts[item.key] || 0;
      var pct = Math.round((count / total) * 100);
      return '<div class="health-bar-item">' +
        '<div class="health-bar-header">' +
          '<span class="health-bar-label">' + escapeHtml(item.label) + '</span>' +
          '<span class="health-bar-value">' + count + ' (' + pct + '%)</span>' +
        '</div>' +
        '<div class="progress-bar"><div class="progress-bar-fill ' + item.color + '" style="width:' + pct + '%"></div></div>' +
      '</div>';
    }).join('');
  }

  // ---- Site (Add Site form) ----
  function initSiteForm() {
    var form = document.getElementById('siteForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        name: document.getElementById('businessName').value,
        website: document.getElementById('website').value,
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        country: document.getElementById('country').value,
        city: document.getElementById('city').value,
        language: document.getElementById('language').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        logo: document.getElementById('logo').value,
        keywords: document.getElementById('keywords').value.split(',').map(function (k) { return k.trim(); }).filter(Boolean),
        social_profiles: {
          twitter: document.getElementById('socialTwitter').value,
          facebook: document.getElementById('socialFacebook').value,
          instagram: document.getElementById('socialInstagram').value,
          linkedin: document.getElementById('socialLinkedin').value
        },
        target_urls: document.getElementById('targetUrls').value.split('\n').map(function (u) { return u.trim(); }).filter(Boolean)
      };

      // Download as business.json
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'business.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Site bilgileri kaydedildi. business.json dosyasını data/ klasörüne yerleştirin.', 'success');
    });
  }

  // ---- Platforms page ----
  function initPlatforms() {
    var el = document.getElementById('platformGrid');
    if (!el) return;
    loadData('platforms.json', function (err, platforms) {
      if (err) {
        showToast('Platform verisi yüklenemedi', 'error');
        return;
      }
      el.innerHTML = platforms.map(function (p) {
        var initial = escapeHtml(p.name.charAt(0).toUpperCase());
        var statusBadge = p.active
          ? '<span class="badge badge-success">Aktif</span>'
          : '<span class="badge badge-neutral">Devre Dışı</span>';
        var apiBadge = p.api
          ? '<span class="badge badge-primary">API</span>'
          : '<span class="badge badge-warning">Manual</span>';
        return '<div class="platform-card">' +
          '<div class="platform-card-header">' +
            '<div class="platform-card-name">' +
              '<div class="platform-card-icon">' + initial + '</div>' +
              escapeHtml(p.name) +
            '</div>' +
            statusBadge +
          '</div>' +
          '<div class="platform-card-details">' +
            '<div class="platform-card-detail"><span>Kategori</span><strong>' + escapeHtml(p.category) + '</strong></div>' +
            '<div class="platform-card-detail"><span>Tip</span><strong>' + escapeHtml(p.type) + '</strong></div>' +
            '<div class="platform-card-detail"><span>API</span><strong>' + (p.api ? 'Evet' : 'Hayır') + '</strong></div>' +
            '<div class="platform-card-detail"><span>OAuth</span><strong>' + (p.oauth ? 'Evet' : 'Hayır') + '</strong></div>' +
            '<div class="platform-card-detail"><span>Rate Limit</span><strong>' + escapeHtml(p.rate_limit) + '</strong></div>' +
            '<div class="platform-card-detail"><span>Kalite Skoru</span><span class="quality-score ' + qualityClass(p.quality_score) + '">' + p.quality_score + '/100</span></div>' +
            '<div class="platform-card-detail"><span>Risk Skoru</span><strong>' + p.risk_score + '/100</strong></div>' +
          '</div>' +
          '<div style="margin-top:12px">' + apiBadge + '</div>' +
        '</div>';
      }).join('');
    });
  }

  function qualityClass(score) {
    if (score >= 90) return 'high';
    if (score >= 75) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  // ---- Backlinks page ----
  function initBacklinks() {
    var el = document.getElementById('backlinksTable');
    if (!el) return;
    loadData('backlinks.json', function (err, backlinks) {
      if (err) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-text">Backlink verisi yüklenemedi</div></div>';
        return;
      }
      if (backlinks.length === 0) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><div class="empty-state-text">Henüz backlink yok</div></div>';
        return;
      }
      var rows = backlinks.map(function (b) {
        var statusBadge = statusToBadge(b.status);
        return '<tr>' +
          '<td>' + escapeHtml(b.platform) + '</td>' +
          '<td><a href="' + escapeAttr(b.source_url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(truncate(b.source_url, 50)) + '</a></td>' +
          '<td><a href="' + escapeAttr(b.target_url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(truncate(b.target_url, 50)) + '</a></td>' +
          '<td>' + escapeHtml(b.anchor || '') + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' + (b.nofollow ? '<span class="badge badge-warning">nofollow</span>' : '<span class="badge badge-success">dofollow</span>') + '</td>' +
          '<td>' + escapeHtml(b.http_status || '--') + '</td>' +
          '<td>' + formatDate(b.created_at) + '</td>' +
        '</tr>';
      });
      el.innerHTML = '<table><thead><tr>' +
        '<th>Platform</th><th>Source URL</th><th>Target URL</th><th>Anchor</th>' +
        '<th>Status</th><th>Follow Type</th><th>HTTP</th><th>Created</th>' +
        '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
    });

    // Export buttons
    var exportCsv = document.getElementById('exportCsv');
    var exportJson = document.getElementById('exportJson');
    if (exportCsv) {
      exportCsv.addEventListener('click', function () { exportBacklinks('csv'); });
    }
    if (exportJson) {
      exportJson.addEventListener('click', function () { exportBacklinks('json'); });
    }
  }

  function exportBacklinks(format) {
    loadData('backlinks.json', function (err, data) {
      if (err || !data.length) { showToast('Dışa aktarılacak veri yok', 'warning'); return; }
      var content, mime, ext;
      if (format === 'csv') {
        var headers = ['id', 'platform', 'source_url', 'target_url', 'anchor', 'status', 'http_status', 'nofollow', 'ugc', 'sponsored', 'created_at', 'last_checked'];
        var lines = [headers.join(',')];
        data.forEach(function (b) {
          lines.push(headers.map(function (h) {
            var v = b[h] !== undefined ? String(b[h]) : '';
            if (v.includes(',')) v = '"' + v.replace(/"/g, '""') + '"';
            return v;
          }).join(','));
        });
        content = lines.join('\n');
        mime = 'text/csv';
        ext = 'csv';
      } else {
        content = JSON.stringify(data, null, 2);
        mime = 'application/json';
        ext = 'json';
      }
      var blob = new Blob([content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'backlinks.' + ext;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Dışa aktarma tamamlandı', 'success');
    });
  }

  function statusToBadge(status) {
    var map = {
      verified: 'badge-success',
      published: 'badge-primary',
      pending: 'badge-warning',
      failed: 'badge-error',
      removed: 'badge-neutral',
      manual: 'badge-warning',
      retry: 'badge-secondary'
    };
    var cls = map[status] || 'badge-neutral';
    return '<span class="badge ' + cls + '">' + escapeHtml(status || 'unknown') + '</span>';
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  // ---- Queue page ----
  function initQueue() {
    var el = document.getElementById('queueTable');
    if (!el) return;
    loadData('queue.json', function (err, queue) {
      if (err || !queue.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Kuyruk boş</div></div>';
        return;
      }
      var rows = queue.map(function (q) {
        return '<tr>' +
          '<td>' + escapeHtml(q.id || '') + '</td>' +
          '<td>' + escapeHtml(q.platform || '') + '</td>' +
          '<td>' + escapeHtml(q.target_url || '') + '</td>' +
          '<td>' + statusToBadge(q.status) + '</td>' +
          '<td>' + escapeHtml(q.priority || 'normal') + '</td>' +
          '<td>' + formatDate(q.created_at) + '</td>' +
        '</tr>';
      });
      el.innerHTML = '<table><thead><tr>' +
        '<th>ID</th><th>Platform</th><th>Target URL</th><th>Status</th><th>Priority</th><th>Created</th>' +
        '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
    });
  }

  // ---- Failed page ----
  function initFailed() {
    var el = document.getElementById('failedTable');
    if (!el) return;
    loadData('failed.json', function (err, failed) {
      if (err || !failed.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">Başarısız işlem yok</div></div>';
        return;
      }
      var rows = failed.map(function (f) {
        return '<tr>' +
          '<td>' + escapeHtml(f.id || '') + '</td>' +
          '<td>' + escapeHtml(f.platform || '') + '</td>' +
          '<td>' + escapeHtml(f.error || '') + '</td>' +
          '<td>' + escapeHtml(f.retry_count || 0) + '</td>' +
          '<td>' + statusToBadge(f.status) + '</td>' +
          '<td>' + formatDate(f.created_at) + '</td>' +
        '</tr>';
      });
      el.innerHTML = '<table><thead><tr>' +
        '<th>ID</th><th>Platform</th><th>Error</th><th>Retry Count</th><th>Status</th><th>Created</th>' +
        '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
    });
  }

  // ---- Manual page ----
  function initManual() {
    var el = document.getElementById('manualTable');
    if (!el) return;
    loadData('queue.json', function (err, queue) {
      if (err) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-text">Veri yüklenemedi</div></div>';
        return;
      }
      var manual = queue.filter(function (q) { return q.status === 'manual'; });
      if (manual.length === 0) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">Manuel işlem yok</div></div>';
        return;
      }
      var rows = manual.map(function (m) {
        return '<tr>' +
          '<td>' + escapeHtml(m.platform || '') + '</td>' +
          '<td>' + escapeHtml(m.reason || '') + '</td>' +
          '<td><a href="' + escapeAttr(m.url || '') + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(truncate(m.url || '', 50)) + '</a></td>' +
          '<td>' + escapeHtml(m.instructions || '') + '</td>' +
          '<td>' + formatDate(m.created_at) + '</td>' +
          '<td>' + escapeHtml(m.priority || 'normal') + '</td>' +
        '</tr>';
      });
      el.innerHTML = '<table><thead><tr>' +
        '<th>Platform</th><th>Reason</th><th>URL</th><th>Instructions</th><th>Created</th><th>Priority</th>' +
        '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
    });
  }

  // ---- Logs page ----
  function initLogs() {
    var el = document.getElementById('logsTable');
    if (!el) return;
    loadData('logs.json', function (err, logs) {
      if (err || !logs.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-text">Log kaydı yok</div></div>';
        return;
      }
      var rows = logs.slice(-100).reverse().map(function (l) {
        var statusBadge = l.status === 'success'
          ? '<span class="badge badge-success">Success</span>'
          : '<span class="badge badge-error">Error</span>';
        return '<tr>' +
          '<td>' + formatDate(l.timestamp) + '</td>' +
          '<td>' + escapeHtml(l.platform || '') + '</td>' +
          '<td>' + escapeHtml(l.job_id || '') + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' + escapeHtml(l.message || '') + '</td>' +
        '</tr>';
      });
      el.innerHTML = '<table><thead><tr>' +
        '<th>Timestamp</th><th>Platform</th><th>Job ID</th><th>Status</th><th>Message</th>' +
        '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
    });
  }

  // ---- Statistics page ----
  function initStatistics() {
    var el = document.getElementById('statsContent');
    if (!el) return;
    loadData('statistics.json', function (err, stats) {
      if (err) { showToast('İstatistik yüklenemedi', 'error'); return; }
      var items = [
        { label: 'Total Platforms', value: stats.total_platforms, icon: 'P', color: 'primary' },
        { label: 'Active Platforms', value: stats.active_platforms, icon: 'A', color: 'success' },
        { label: 'API Platforms', value: stats.api_platforms, icon: 'AP', color: 'secondary' },
        { label: 'Manual Platforms', value: stats.manual_platforms, icon: 'M', color: 'warning' },
        { label: 'Queued', value: stats.queued, icon: 'Q', color: 'warning' },
        { label: 'Published', value: stats.published, icon: 'Pu', color: 'success' },
        { label: 'Verified', value: stats.verified, icon: 'V', color: 'success' },
        { label: 'Failed', value: stats.failed, icon: 'F', color: 'error' },
        { label: 'Retry', value: stats.retry, icon: 'R', color: 'warning' },
        { label: 'Removed', value: stats.removed, icon: 'Rm', color: 'error' },
        { label: 'Success Rate', value: (stats.success_rate || 0) + '%', icon: 'S', color: 'success' },
        { label: 'Verification Rate', value: (stats.verification_rate || 0) + '%', icon: 'VR', color: 'secondary' }
      ];
      el.innerHTML = '<div class="stat-grid">' + items.map(function (item) {
        return statCard(item.label, item.value, item.color, item.icon);
      }).join('') + '</div>';
    });
  }

  // ---- Campaigns page ----
  function initCampaigns() {
    var el = document.getElementById('campaignsContent');
    if (!el) return;
    loadData('campaigns.json', function (err, campaigns) {
      if (err || !campaigns.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Kampanya yok</div></div>';
        return;
      }
      el.innerHTML = campaigns.map(function (c) {
        return '<div class="card" style="margin-bottom:16px">' +
          '<div class="card-header">' +
            '<div><div class="card-title">' + escapeHtml(c.name) + '</div>' +
            '<div class="card-subtitle">' + escapeHtml(c.description || '') + '</div></div>' +
            statusToBadge(c.status) +
          '</div>' +
          '<div class="platform-card-details">' +
            '<div class="platform-card-detail"><span>Min Quality Score</span><strong>' + (c.min_quality_score || 70) + '</strong></div>' +
            '<div class="platform-card-detail"><span>Platforms</span><strong>' + (c.platforms ? c.platforms.length : 0) + '</strong></div>' +
            '<div class="platform-card-detail"><span>Created</span><strong>' + formatDate(c.created_at) + '</strong></div>' +
          '</div>' +
        '</div>';
      }).join('');
    });
  }

  // ---- Settings page ----
  function initSettings() {
    var automationToggle = document.getElementById('automationToggle');
    var dryRunToggle = document.getElementById('dryRunToggle');
    var approvalToggle = document.getElementById('approvalToggle');
    var minQuality = document.getElementById('minQuality');
    var minQualityValue = document.getElementById('minQualityValue');

    if (automationToggle) {
      automationToggle.checked = localStorage.getItem('automation') !== 'off';
      automationToggle.addEventListener('change', function () {
        localStorage.setItem('automation', automationToggle.checked ? 'on' : 'off');
        showToast('Otomasyon ' + (automationToggle.checked ? 'açık' : 'kapalı'), automationToggle.checked ? 'success' : 'warning');
      });
    }
    if (dryRunToggle) {
      dryRunToggle.checked = localStorage.getItem('dryRun') !== 'off';
      dryRunToggle.addEventListener('change', function () {
        localStorage.setItem('dryRun', dryRunToggle.checked ? 'on' : 'off');
        showToast('Dry Run ' + (dryRunToggle.checked ? 'açık' : 'kapalı'), dryRunToggle.checked ? 'info' : 'warning');
      });
    }
    if (approvalToggle) {
      approvalToggle.checked = localStorage.getItem('approval') === 'on';
      approvalToggle.addEventListener('change', function () {
        localStorage.setItem('approval', approvalToggle.checked ? 'on' : 'off');
        showToast('Onay modu ' + (approvalToggle.checked ? 'açık' : 'kapalı'), 'info');
      });
    }
    if (minQuality && minQualityValue) {
      minQuality.value = localStorage.getItem('minQuality') || 70;
      minQualityValue.textContent = minQuality.value;
      minQuality.addEventListener('input', function () {
        minQualityValue.textContent = minQuality.value;
        localStorage.setItem('minQuality', minQuality.value);
      });
    }
  }

  // ---- Init ----
  function init() {
    initTheme();
    initSidebar();
    initDashboard();
    initSiteForm();
    initPlatforms();
    initBacklinks();
    initQueue();
    initFailed();
    initInitManual();
    initLogs();
    initStatistics();
    initCampaigns();
    initSettings();
  }

  function initInitManual() { initManual(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for inline use
  window.App = { showToast: showToast, navigateTo: navigateTo, escapeHtml: escapeHtml };
})();
