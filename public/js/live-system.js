/**
 * SMARTRECOVER - LIVE SYSTEM EXPERIENCE ENGINE
 * Real-time AI Operations Control Center stream, system health monitor,
 * active recovery spotlight card, and 3D Neural Core state labels.
 */

window.SmartRecoverLiveSystem = (function () {
  let isPollingActive = true;
  let activeFilter = 'ALL';
  let currentLatency = 24;

  function init() {
    setupHealthMonitor();
    setupActivityStreamFilters();
    setupVisibilityListener();
  }

  function setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      isPollingActive = !document.hidden;
    });
  }

  async function checkSystemHealth() {
    const start = Date.now();
    try {
      const res = await fetch('/health');
      const data = await res.json();
      currentLatency = Date.now() - start;

      updateHealthStatusPill(data.status === 'active', currentLatency);
    } catch (err) {
      updateHealthStatusPill(false, 0);
    }
  }

  function updateHealthStatusPill(isOnline, latencyMs) {
    const indicator = document.querySelector('.system-status-indicator');
    if (!indicator) return;

    if (isOnline) {
      indicator.innerHTML = `
        <div class="status-dot-pulse"></div>
        <div>
          <div class="status-text text-emerald-400 font-bold font-mono">● LIVE SYSTEM</div>
          <div style="font-size: 0.65rem; color: var(--text-subtle); font-family: monospace;">LATENCY: ${latencyMs}ms • SUPABASE & AI ONLINE</div>
        </div>
      `;
    } else {
      indicator.innerHTML = `
        <div style="width:8px; height:8px; border-radius:50%; background:var(--rose-danger);"></div>
        <div>
          <div class="status-text text-rose-400 font-bold font-mono">OFFLINE</div>
          <div style="font-size: 0.65rem; color: var(--text-subtle); font-family: monospace;">BACKEND UNREACHABLE</div>
        </div>
      `;
    }
  }

  function setupHealthMonitor() {
    checkSystemHealth();
    setInterval(() => {
      if (isPollingActive) checkSystemHealth();
    }, 8000);
  }

  function setupActivityStreamFilters() {
    const filters = document.querySelectorAll('.activity-filter-pill');
    filters.forEach(pill => {
      pill.addEventListener('click', () => {
        filters.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.getAttribute('data-filter') || 'ALL';
        renderLiveActivityStream();
      });
    });
  }

  function renderLiveActivityStream() {
    if (!window.SmartRecoverDashboard) return;

    const jobs = window.SmartRecoverDashboard.getJobs();
    const logs = window.SmartRecoverDashboard.getLogs();

    let events = [];

    // Synthesize timeline events from real database jobs and audit logs
    jobs.forEach(j => {
      const isEscalation = j.status === 'ESCALATED_TO_HUMAN';
      const isTier2 = j.status === 'TIER2_CALLING' || j.status === 'TIER2_HINGLISH_CALL';
      const formattedTime = new Date(j.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      events.push({
        id: j.id,
        timestamp: formattedTime,
        created_at: j.created_at,
        type: isEscalation ? 'HUMAN' : (isTier2 ? 'VOICE' : 'PAYMENT'),
        tag: isEscalation ? '[HUMAN ESCALATION]' : (isTier2 ? '[TIER 2 VOICE]' : '[TIER 1 DISPATCH]'),
        tagColor: isEscalation ? 'text-rose-400' : (isTier2 ? 'text-emerald-400' : 'text-amber-400'),
        title: `${escapeHtml(j.customer_name || 'Customer')} • ₹${(j.amount || 0).toLocaleString()}`,
        subtitle: `Status: ${j.status} | Failure: ${escapeHtml(j.failure_reason || 'Gateway failure')}`,
        jobId: j.id
      });
    });

    if (activeFilter !== 'ALL') {
      events = events.filter(e => e.type === activeFilter);
    }

    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderSpotlightCard(jobs[0]);
    updateAICoreLabel(jobs[0]);
  }

  function renderSpotlightCard(activeJob) {
    let container = document.getElementById('activeRecoverySpotlightCard');
    if (!container) {
      const parent = document.getElementById('scenariosSection');
      if (!parent) return;

      container = document.createElement('div');
      container.id = 'activeRecoverySpotlightCard';
      container.className = 'p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 mb-6 shadow-xl';
      parent.parentNode.insertBefore(container, parent);
    }

    if (!activeJob) {
      container.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="status-dot-pulse"></span>
            <span class="text-xs font-mono font-bold text-cyan-400">AI ENGINE MONITORING NORMALLY</span>
          </div>
          <span class="text-xs text-slate-500 font-mono">Waiting for payment failure events...</span>
        </div>
      `;
      return;
    }

    const isEscalation = activeJob.status === 'ESCALATED_TO_HUMAN';
    const shortLink = activeJob.payment_link ? activeJob.payment_link.replace('https://', '') : 'Bypassed';

    container.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2 pb-3 mb-3 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold uppercase border border-cyan-500/30">
            ● SPOTLIGHT RECOVERY CASE
          </span>
          <span class="text-xs font-extrabold text-white">${escapeHtml(activeJob.customer_name || 'Customer')}</span>
          <span class="text-xs text-emerald-400 font-mono font-bold">₹${(activeJob.amount || 0).toLocaleString()}</span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="SmartRecoverCaseInvestigation.renderCaseFile('${activeJob.id}')" class="action-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.7rem;">
            <i data-lucide="file-text" style="width:12px; height:12px; color:var(--cyan-neural);"></i>
            <span>Case File</span>
          </button>
          <button onclick="SmartRecoverSafetyGate.openInspector('${activeJob.id}')" class="action-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.7rem; color:var(--emerald-active);">
            <i data-lucide="shield-check" style="width:12px; height:12px;"></i>
            <span>Safety</span>
          </button>
          <button onclick="SmartRecoverReplay.loadJobForReplay(SmartRecoverDashboard.getJobs()[0], SmartRecoverDashboard.getLogs())" class="btn-primary-glow" style="padding:0.25rem 0.65rem; font-size:0.7rem;">
            <i data-lucide="play" style="width:12px; height:12px;"></i>
            <span>Replay</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div>
          <span class="text-[10px] text-slate-500 uppercase font-bold">Failure Reason</span>
          <div class="text-slate-300 font-sans font-semibold truncate">${escapeHtml(activeJob.failure_reason || 'Gateway Failure')}</div>
        </div>
        <div>
          <span class="text-[10px] text-slate-500 uppercase font-bold">AI Channel Route</span>
          <div class="text-cyan-400 font-bold">${activeJob.status}</div>
        </div>
        <div>
          <span class="text-[10px] text-slate-500 uppercase font-bold">Safety Guardrails</span>
          <div class="${isEscalation ? 'text-rose-400' : 'text-emerald-400'} font-bold">${isEscalation ? '🛑 HUMAN ESCALATION' : '✓ PASSED CLEANLY'}</div>
        </div>
        <div>
          <span class="text-[10px] text-slate-500 uppercase font-bold">Razorpay Link</span>
          <div class="text-slate-400 truncate">${escapeHtml(shortLink)}</div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function updateAICoreLabel(activeJob) {
    const labelOverlay = document.querySelector('.hero-3d-overlay');
    if (!labelOverlay) return;

    if (!activeJob) {
      labelOverlay.innerHTML = `
        <span class="status-dot-pulse" style="width:6px; height:6px;"></span>
        <span>AI ENGINE ● MONITORING</span>
      `;
      return;
    }

    const isEscalation = activeJob.status === 'ESCALATED_TO_HUMAN';
    const isTier2 = activeJob.status === 'TIER2_CALLING' || activeJob.status === 'TIER2_HINGLISH_CALL';

    if (isEscalation) {
      labelOverlay.innerHTML = `
        <span style="width:6px; height:6px; border-radius:50%; background:var(--rose-danger);"></span>
        <span class="text-rose-400 font-bold">AI ENGINE ● HUMAN ESCALATION</span>
      `;
      if (window.SmartRecoverAICore) window.SmartRecoverAICore.setCoreState('ESCALATED');
    } else if (isTier2) {
      labelOverlay.innerHTML = `
        <span class="status-dot-pulse" style="width:6px; height:6px;"></span>
        <span class="text-emerald-400 font-bold">AI ENGINE ● TIER 2 VOICE ACTIVE</span>
      `;
      if (window.SmartRecoverAICore) window.SmartRecoverAICore.setCoreState('RECOVERY');
    } else {
      labelOverlay.innerHTML = `
        <span style="width:6px; height:6px; border-radius:50%; background:var(--cyan-neural);"></span>
        <span class="text-cyan-400 font-bold">AI ENGINE ● TIER 1 DISPATCHED</span>
      `;
      if (window.SmartRecoverAICore) window.SmartRecoverAICore.setCoreState('SUCCESS');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  return {
    init,
    checkSystemHealth,
    renderLiveActivityStream,
    renderSpotlightCard,
    updateAICoreLabel
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  SmartRecoverLiveSystem.init();
});
