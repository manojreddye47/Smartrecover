/**
 * SMARTRECOVER AI ENGINE - DASHBOARD INTERACTIVITY CONTROLLER
 * Command Palette (Ctrl+K), 9-step Live Demo Mode, Job Investigation Drawer,
 * Safety Gate Modal, 3D Core state sync, search & filtering, Chart.js telemetry,
 * and AI Decision Replay integration.
 */

window.SmartRecoverDashboard = (function () {
  let allJobs = [];
  let allLogs = [];
  let currentFilter = 'ALL';
  let searchQuery = '';
  let distributionChart = null;
  let isLiveDemoRunning = false;

  function init() {
    setupSidebar();
    setupTableInteractions();
    setupCharts();
    setupCommandPalette();
    setupPresentationMode();
    initLucideIcons();
  }

  function initLucideIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function getJobs() { return allJobs; }
  function getLogs() { return allLogs; }

  // Toast Notification System
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    
    let iconName = 'info';
    let iconColor = 'text-blue-400';
    if (type === 'success') { iconName = 'check-circle'; iconColor = 'var(--emerald-active)'; }
    if (type === 'danger' || type === 'error') { iconName = 'alert-triangle'; iconColor = 'var(--rose-danger)'; }
    if (type === 'warning') { iconName = 'alert-circle'; iconColor = 'var(--amber-warning)'; }

    toast.innerHTML = `
      <div style="color: ${iconColor}; display: flex; align-items: center; font-size: 1.1rem;">
        <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
      </div>
      <div style="font-size: 0.8rem; font-weight: 600; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(toast);
    initLucideIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function setupSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const mobileToggleBtn = document.getElementById('mobileMenuBtn');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }

    if (mobileToggleBtn && sidebar) {
      mobileToggleBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
    }
  }

  function setupCommandPalette() {
    const backdrop = document.getElementById('commandPaletteBackdrop');
    const input = document.getElementById('commandPaletteInput');
    const searchBtn = document.getElementById('openCommandPaletteBtn');

    if (searchBtn) {
      searchBtn.addEventListener('click', openCommandPalette);
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      if (e.key === 'Escape') {
        closeCommandPalette();
        closeJobDrawer();
        closeSafetyGateModal();
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeCommandPalette();
      });
    }

    if (input) {
      input.addEventListener('input', (e) => {
        filterCommandItems(e.target.value.toLowerCase());
      });
    }
  }

  function openCommandPalette() {
    const backdrop = document.getElementById('commandPaletteBackdrop');
    const input = document.getElementById('commandPaletteInput');
    if (backdrop) backdrop.classList.add('open');
    if (input) {
      input.value = '';
      input.focus();
    }
    filterCommandItems('');
  }

  function closeCommandPalette() {
    const backdrop = document.getElementById('commandPaletteBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function filterCommandItems(query) {
    const items = document.querySelectorAll('.command-item');
    items.forEach(item => {
      const text = item.innerText.toLowerCase();
      if (!query || text.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  function setupPresentationMode() {
    const btn = document.getElementById('presentationModeToggleBtn');
    if (btn) {
      btn.addEventListener('click', togglePresentationMode);
    }
  }

  function togglePresentationMode() {
    document.body.classList.toggle('presentation-mode');
    const isPres = document.body.classList.contains('presentation-mode');
    showToast(isPres ? '🖥 Presentation Mode Enabled' : 'Presentation Mode Exited', 'info');
    if (window.SmartRecoverAICore) {
      window.SmartRecoverAICore.setCoreState(isPres ? 'ANALYZING' : 'IDLE');
    }
  }

  async function animateDecisionFlow(tier, isEscalation) {
    const packet = document.getElementById('flowDataPacket');
    const nodes = document.querySelectorAll('.flow-node');
    if (!packet || nodes.length === 0) return;

    if (window.SmartRecoverAICore) {
      window.SmartRecoverAICore.setCoreState(isEscalation ? 'ESCALATED' : 'ANALYZING');
    }

    packet.classList.add('traveling');

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].classList.add('active');
      await new Promise(r => setTimeout(r, 450));
      if (i < nodes.length - 1) {
        nodes[i].classList.remove('active');
      }
    }

    setTimeout(() => {
      packet.classList.remove('traveling');
      nodes.forEach(n => n.classList.remove('active'));
      if (window.SmartRecoverAICore) {
        window.SmartRecoverAICore.setCoreState(isEscalation ? 'ESCALATED' : 'SUCCESS');
      }
    }, 2500);
  }

  function logLiveActivity(message, tag = 'EVENT') {
    const feed = document.getElementById('liveActivityFeed');
    if (!feed) return;

    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs font-mono';
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-blue-400 font-bold">[${tag}]</span>
        <span class="text-slate-300">${message}</span>
      </div>
      <span class="text-slate-500">${formattedTime}</span>
    `;

    feed.prepend(item);
    if (feed.children.length > 10) feed.lastElementChild.remove();
  }

  async function triggerDemo(type, btnElement) {
    const origHtml = btnElement ? btnElement.innerHTML : '';
    if (btnElement) {
      btnElement.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:0.4rem;">
          <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
          Processing...
        </span>`;
      btnElement.disabled = true;
    }

    let payload = {};
    let scenarioLabel = '';

    if (type === 'standard') {
      scenarioLabel = 'High-Value Failure (₹3,500)';
      payload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              amount: 350000,
              contact: "+919014453381",
              error_description: "Bank server gateway timeout",
              notes: { customer_name: "Rahul Sharma (High-Value)" }
            }
          }
        }
      };
    } else if (type === 'escalation') {
      scenarioLabel = 'Manager / Fraud Safety Gate';
      payload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              amount: 500000,
              contact: "+919014453381",
              error_description: "Customer requested to speak with a manager regarding fraud",
              notes: { customer_name: "Vikram Mehta (Escalation)" }
            }
          }
        }
      };
    } else if (type === 'duplicate') {
      scenarioLabel = 'Duplicate Contact Frequency Fallback';
      payload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              amount: 250000,
              contact: "+919014453381",
              error_description: "Insufficient funds decline",
              notes: { customer_name: "Rahul Sharma (Repeat)" }
            }
          }
        }
      };
    }

    showToast(`Simulating: ${scenarioLabel}`, 'info');
    logLiveActivity(`Simulation initiated: ${scenarioLabel}`, 'TRIGGER');

    try {
      const response = await fetch('/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        const isEscalation = result.status === 'ESCALATED_TO_HUMAN';
        animateDecisionFlow(result.decision?.recommended_tier, isEscalation);

        if (isEscalation) {
          showToast(`⚠️ Safety Gate Triggered: Escalated to Human Manager.`, 'warning');
          openSafetyGateModal(result.message, result.triggerKeywords);
          logLiveActivity(`Safety Gate Triggered: ${result.triggerKeywords?.join(', ')}`, 'ESCALATION');
        } else {
          showToast(`✅ Payment Link Dispatched via ${result.decision?.recommended_tier || 'Tier 2 Voice'}`, 'success');
          logLiveActivity(`Link Dispatched: ${result.decision?.recommended_tier}`, 'DISPATCH');
        }

        updateDecisionInspector({
          scenario: scenarioLabel,
          amount: (payload.payload.payment.entity.amount / 100),
          status: result.status || result.decision?.recommended_tier,
          rationale: result.decision?.rationale || result.message || 'Escalated by keyword trigger',
          policyNote: result.policyNote || 'Evaluated against safety bounds',
          guardrailPassed: result.guardrailPassed !== false
        });

        await refreshDashboardData();

        // Auto trigger replay option for newly created job
        if (allJobs.length > 0 && window.SmartRecoverReplay) {
          window.SmartRecoverReplay.loadJobForReplay(allJobs[0], allLogs);
        }
      } else {
        showToast(`Server response: ${result.message || 'Complete'}`, 'info');
        await refreshDashboardData();
      }
    } catch (err) {
      console.error('Trigger error:', err);
      showToast('Simulation error: ' + err.message, 'error');
    } finally {
      if (btnElement) {
        btnElement.innerHTML = origHtml;
        btnElement.disabled = false;
        initLucideIcons();
      }
    }
  }

  async function runLiveDemo() {
    if (isLiveDemoRunning) return;
    isLiveDemoRunning = true;
    closeCommandPalette();

    showToast('▶ Launching 9-Step Autonomous Recovery Presentation', 'info');
    logLiveActivity('9-Step Presentation Mode started', 'DEMO');

    const steps = [
      "STEP 1: PAYMENT FAILURE DETECTED (Razorpay Webhook)",
      "STEP 2: AI ANALYSIS (Gemini Risk & Intent Engine)",
      "STEP 3: RISK CHECK (Value & Failure Reason)",
      "STEP 4: 🛡 AI SAFETY GATE EVALUATION (Discount Caps & Frequency Limits)",
      "STEP 5: RECOVERY TIER SELECTED (Tier 2 Hinglish Voice AI)",
      "STEP 6: PAYMENT LINK GENERATED (Razorpay Link API)",
      "STEP 7: MULTI-CHANNEL DISPATCH (Vapi Voice Session)",
      "STEP 8: CUSTOMER TOUCHPOINT (Rahul Sharma Contacted)",
      "STEP 9: RECOVERY WORKFLOW COMPLETE"
    ];

    for (let i = 0; i < steps.length; i++) {
      showToast(steps[i], 'info');
      logLiveActivity(steps[i], `STEP ${i+1}`);
      if (window.SmartRecoverAICore) {
        window.SmartRecoverAICore.setCoreState(i === 0 ? 'ANALYZING' : (i === 3 ? 'ESCALATED' : (i < 8 ? 'RECOVERY' : 'SUCCESS')));
      }
      await new Promise(r => setTimeout(r, 1200));
    }

    await triggerDemo('standard', null);
    isLiveDemoRunning = false;
  }

  function openSafetyGateModal(reason, keywords) {
    let backdrop = document.getElementById('safetyGateModalBackdrop');
    if (!backdrop) return;
    const kwText = keywords ? keywords.join(', ') : 'manager, fraud';
    document.getElementById('safetyGateKeywords').innerText = kwText;
    backdrop.classList.add('open');
  }

  function closeSafetyGateModal() {
    const backdrop = document.getElementById('safetyGateModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function openJobDrawer(jobId) {
    if (window.SmartRecoverCaseInvestigation) {
      window.SmartRecoverCaseInvestigation.renderCaseFile(jobId);
      return;
    }

    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;

    const backdrop = document.getElementById('jobDrawerBackdrop');
    const content = document.getElementById('jobDrawerContent');
    if (!backdrop || !content) return;

    const shortLink = job.payment_link ? job.payment_link.replace('https://', '') : 'Pending';

    content.innerHTML = `
      <div>
        <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Customer Info</span>
        <h3 class="text-lg font-bold text-white mt-1">${escapeHtml(job.customer_name || 'Rahul Sharma')}</h3>
        <p class="font-mono text-xs text-slate-400 mt-0.5">${escapeHtml(job.customer_phone || '+91 90145••••1')}</p>
      </div>

      <div class="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div>
          <span class="text-xs text-slate-500 font-bold uppercase">Amount</span>
          <p class="text-lg font-bold text-emerald-400">₹${(job.amount || 0).toLocaleString()}</p>
        </div>
        <div>
          <span class="text-xs text-slate-500 font-bold uppercase">Status</span>
          <p class="text-xs font-bold text-cyan-400 mt-1">${job.status}</p>
        </div>
      </div>

      <div>
        <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Failure Reason</span>
        <p class="text-sm text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 mt-1">${escapeHtml(job.failure_reason || 'Bank gateway timeout')}</p>
      </div>

      <div>
        <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Auto-Dispatched Razorpay Link</span>
        <div class="link-box-interactive w-full mt-1 justify-between">
          <a href="${job.payment_link || '#'}" target="_blank" class="link-short-text">${escapeHtml(shortLink)}</a>
          <div class="flex items-center gap-2">
            ${job.payment_link ? `<button class="copy-btn-icon" onclick="SmartRecoverDashboard.copyToClipboard('${job.payment_link}')"><i data-lucide="copy" style="width:14px;height:14px;"></i></button>` : ''}
          </div>
        </div>
      </div>

      <div>
        <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Guardrail Checks</span>
        <div class="space-y-2 mt-2 text-xs">
          <div class="flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            <span>✓ Discount Cap Policy</span>
            <span>Capped 10%</span>
          </div>
          <div class="flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            <span>✓ Frequency Limit Check</span>
            <span>1 Call / 24h</span>
          </div>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-800 flex flex-col gap-2">
        <button onclick="SmartRecoverDashboard.inspectSafetyGateForJob('${job.id}')" class="action-btn-secondary justify-center text-emerald-400 border-emerald-500/30">
          <i data-lucide="shield-check" style="width:14px; height:14px;"></i>
          <span>🛡 INSPECT SAFETY GATE</span>
        </button>

        <button onclick="SmartRecoverDashboard.replayJob('${job.id}')" class="btn-primary-glow justify-center">
          <i data-lucide="play" style="width:14px; height:14px;"></i>
          <span>▶ REPLAY AI DECISION</span>
        </button>
      </div>
    `;

    backdrop.classList.add('open');
    initLucideIcons();
  }

  function closeJobDrawer() {
    const backdrop = document.getElementById('jobDrawerBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function inspectSafetyGateForJob(jobId) {
    closeJobDrawer();
    if (window.SmartRecoverSafetyGate) {
      window.SmartRecoverSafetyGate.openInspector(jobId);
    }
  }

  function replayJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;
    closeJobDrawer();
    if (window.SmartRecoverReplay) {
      window.SmartRecoverReplay.loadJobForReplay(job, allLogs);
    }
  }

  function replayAuditLog(jobId) {
    const job = allJobs.find(j => j.id === jobId) || { id: jobId, customer_name: 'Audit Target', amount: 3500, created_at: new Date().toISOString() };
    if (window.SmartRecoverReplay) {
      window.SmartRecoverReplay.loadJobForReplay(job, allLogs);
    }
  }

  function updateDecisionInspector(info) {
    const card = document.getElementById('aiDecisionInspectorCard');
    if (!card) return;

    const tierColor = info.status === 'ESCALATED_TO_HUMAN' ? 'var(--rose-danger)' : 
                      info.status === 'TIER2_CALLING' || info.status === 'TIER2_HINGLISH_CALL' ? 'var(--emerald-active)' : 'var(--amber-warning)';

    card.innerHTML = `
      <div class="factor-row">
        <span class="factor-label">Transaction Value</span>
        <span class="factor-value text-white font-bold">₹${info.amount.toLocaleString()}</span>
      </div>
      <div class="factor-row">
        <span class="factor-label">Autonomous Decision</span>
        <span class="factor-value" style="color: ${tierColor};">${info.status}</span>
      </div>
      <div class="factor-row">
        <span class="factor-label">Guardrail Compliance</span>
        <span class="factor-value" style="color: ${info.guardrailPassed ? 'var(--emerald-active)' : 'var(--rose-danger)'}">
          ${info.guardrailPassed ? 'PASSED CLEANLY' : 'SAFETY BOUND TRIGGERED'}
        </span>
      </div>
      <div style="margin-top: 0.5rem; background: rgba(2,6,23,0.6); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
        <p style="font-size: 0.72rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 700; margin-bottom: 0.25rem;">AI Rationale</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.45;">${info.rationale}</p>
        ${info.policyNote ? `<p style="font-size: 0.75rem; color: var(--cyan-neural); margin-top: 0.4rem;">${info.policyNote}</p>` : ''}
      </div>
    `;
  }

  async function refreshDashboardData() {
    try {
      const [jobsRes, logsRes] = await Promise.all([
        fetch('/api/jobs').then(r => r.json()),
        fetch('/api/logs').then(r => r.json())
      ]);

      if (jobsRes.data) {
        allJobs = jobsRes.data;
        renderJobsTable();
        updateMetrics(allJobs);
      }

      if (logsRes.data) {
        allLogs = logsRes.data;
        renderAuditLogs();
      }
    } catch (e) {
      console.warn('Live refresh fallback:', e);
    }
  }

  function updateMetrics(jobs) {
    const totalJobsEl = document.getElementById('metricTotalJobs');
    const voiceJobsEl = document.getElementById('metricVoiceJobs');
    const smsJobsEl = document.getElementById('metricSmsJobs');
    const escalatedJobsEl = document.getElementById('metricEscalatedJobs');

    const total = jobs.length;
    const voice = jobs.filter(j => j.status === 'TIER2_CALLING').length;
    const sms = jobs.filter(j => j.status === 'TIER1_SENT').length;
    const escalated = jobs.filter(j => j.status === 'ESCALATED_TO_HUMAN').length;

    if (totalJobsEl) totalJobsEl.innerText = total;
    if (voiceJobsEl) voiceJobsEl.innerText = voice;
    if (smsJobsEl) smsJobsEl.innerText = sms;
    if (escalatedJobsEl) escalatedJobsEl.innerText = escalated;

    updateCharts(total, voice, sms, escalated);
  }

  function setupTableInteractions() {
    const searchInput = document.getElementById('jobSearchInput');
    const filterPills = document.querySelectorAll('.filter-pill');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderJobsTable();
      });
    }

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.getAttribute('data-filter') || 'ALL';
        renderJobsTable();
      });
    });
  }

  function renderJobsTable() {
    const tbody = document.getElementById('recoveryJobsTableBody');
    if (!tbody) return;

    let filtered = allJobs.filter(job => {
      const matchesFilter = currentFilter === 'ALL' || job.status === currentFilter;
      const matchesSearch = !searchQuery || 
        (job.customer_name && job.customer_name.toLowerCase().includes(searchQuery)) ||
        (job.customer_phone && job.customer_phone.includes(searchQuery)) ||
        (job.failure_reason && job.failure_reason.toLowerCase().includes(searchQuery));
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-subtle);">
            No recovery jobs match the selected filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(j => {
      let badgeClass = 'pending';
      let dotColor = 'var(--text-subtle)';
      if (j.status === 'TIER2_CALLING') { badgeClass = 'tier2'; dotColor = 'var(--emerald-active)'; }
      else if (j.status === 'TIER1_SENT') { badgeClass = 'tier1'; dotColor = 'var(--amber-warning)'; }
      else if (j.status === 'ESCALATED_TO_HUMAN') { badgeClass = 'escalated'; dotColor = 'var(--rose-danger)'; }

      const shortLink = j.payment_link ? j.payment_link.replace('https://', '') : null;

      return `
        <tr onclick="SmartRecoverDashboard.openJobDrawer('${j.id}')">
          <td>
            <div class="customer-cell">
              <span class="customer-name">${escapeHtml(j.customer_name || 'Anonymous')}</span>
              <span class="customer-meta">${escapeHtml(j.failure_reason || 'Gateway Failure')}</span>
            </div>
          </td>
          <td class="font-mono text-xs text-slate-400">${escapeHtml(j.customer_phone || 'N/A')}</td>
          <td class="font-bold text-white text-base">₹${(j.amount || 0).toLocaleString()}</td>
          <td>
            <span class="status-badge ${badgeClass}">
              <span style="width:6px; height:6px; border-radius:50%; background:${dotColor};"></span>
              ${j.status}
            </span>
          </td>
          <td onclick="event.stopPropagation()">
            ${j.payment_link ? `
              <div class="link-box-interactive">
                <a href="${j.payment_link}" target="_blank" class="link-short-text" title="${j.payment_link}">
                  ${escapeHtml(shortLink.length > 22 ? shortLink.slice(0, 20) + '...' : shortLink)}
                </a>
                <button class="copy-btn-icon" onclick="SmartRecoverDashboard.copyToClipboard('${j.payment_link}')" title="Copy payment link">
                  <i data-lucide="copy" style="width: 13px; height: 13px;"></i>
                </button>
              </div>
            ` : '<span style="color: var(--text-subtle); font-size: 0.75rem;">Pending</span>'}
          </td>
          <td onclick="event.stopPropagation()">
            <div class="flex items-center gap-1">
              <button onclick="SmartRecoverDashboard.inspectSafetyGateForJob('${j.id}')" class="action-btn-secondary" style="padding: 0.3rem 0.5rem; font-size: 0.7rem; color:var(--emerald-active);" title="Inspect Safety Gate">
                <i data-lucide="shield-check" style="width: 12px; height: 12px;"></i>
                Guardrails
              </button>
              <button onclick="SmartRecoverDashboard.replayJob('${j.id}')" class="action-btn-secondary" style="padding: 0.3rem 0.5rem; font-size: 0.7rem;" title="Replay Decision">
                <i data-lucide="play" style="width: 12px; height: 12px; color: var(--cyan-neural);"></i>
                Replay
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    initLucideIcons();
  }

  function renderAuditLogs() {
    const list = document.getElementById('auditTrailList');
    if (!list) return;

    list.innerHTML = allLogs.map(l => {
      const isPassed = l.guardrail_passed !== false;
      const formattedTime = new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return `
        <div class="timeline-item ${isPassed ? 'passed' : 'escalated'}">
          <div class="timeline-bullet">
            <i data-lucide="${isPassed ? 'check' : 'alert-octagon'}" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="timeline-content-card flex items-center justify-between gap-2">
            <div>
              <div class="timeline-header">
                <span class="timeline-action-tag">[${escapeHtml(l.action_taken || 'ACTION')}]</span>
                <span class="timeline-time font-mono">${formattedTime}</span>
              </div>
              <p class="timeline-rationale">${escapeHtml(l.ai_rationale || 'Autonomous action recorded')}</p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button onclick="SmartRecoverDashboard.inspectSafetyGateForJob('${l.job_id}')" class="action-btn-secondary" style="padding:0.25rem 0.45rem; font-size:0.68rem; color:var(--emerald-active);" title="Inspect Safety Gate">
                <i data-lucide="shield-check" style="width:11px; height:11px;"></i>
                Guardrails
              </button>
              <button onclick="SmartRecoverDashboard.replayAuditLog('${l.job_id}')" class="action-btn-secondary" style="padding:0.25rem 0.45rem; font-size:0.68rem;">
                <i data-lucide="play" style="width:11px; height:11px; color:var(--cyan-neural);"></i>
                Replay
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    initLucideIcons();
  }

  function setupCharts() {
    const ctx = document.getElementById('recoveryDistributionChart');
    if (!ctx || typeof Chart === 'undefined') return;

    distributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Tier 2 Voice AI', 'Tier 1 SMS/WhatsApp', 'Human Escalated'],
        datasets: [{
          data: [1, 1, 1],
          backgroundColor: ['#34D399', '#FBBF24', '#FB7185'],
          borderColor: '#0B1224',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }, padding: 12, usePointStyle: true } }
        },
        cutout: '72%'
      }
    });
  }

  function updateCharts(total, voice, sms, escalated) {
    if (distributionChart) {
      distributionChart.data.datasets[0].data = [voice, sms, escalated];
      distributionChart.update();
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Payment link copied to clipboard!', 'success');
    }).catch(err => {
      showToast('Failed to copy: ' + err, 'error');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function setInitialData(jobs, logs) {
    allJobs = jobs || [];
    allLogs = logs || [];
    renderJobsTable();
    renderAuditLogs();
    updateMetrics(allJobs);
    if (window.SmartRecoverLiveSystem) {
      window.SmartRecoverLiveSystem.renderLiveActivityStream();
    }
  }

  return {
    init,
    triggerDemo,
    runLiveDemo,
    openCommandPalette,
    closeCommandPalette,
    openJobDrawer,
    closeJobDrawer,
    closeSafetyGateModal,
    togglePresentationMode,
    inspectSafetyGateForJob,
    replayJob,
    replayAuditLog,
    copyToClipboard,
    setInitialData,
    showToast,
    getJobs,
    getLogs
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  SmartRecoverDashboard.init();
});
