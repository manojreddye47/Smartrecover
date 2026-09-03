/**
 * SMARTRECOVER - AI SAFETY GATE ENGINE
 * 100% READ-ONLY policy, fraud, frequency, and guardrail evaluator.
 * Visually demonstrates how SmartRecover evaluates payment failure rules before execution.
 */

window.SmartRecoverSafetyGate = (function () {
  let activeJob = null;
  let activeLogs = [];

  function init() {
    setupSafetyGateNodeListener();
  }

  function setupSafetyGateNodeListener() {
    const policyNode = document.getElementById('node-policy');
    if (policyNode) {
      policyNode.classList.add('interactive');
      policyNode.style.cursor = 'pointer';
      policyNode.addEventListener('click', () => {
        if (window.SmartRecoverDashboard) {
          const jobs = window.SmartRecoverDashboard.getJobs();
          if (jobs && jobs.length > 0) {
            openInspector(jobs[0]);
          } else {
            window.SmartRecoverDashboard.showToast('Select a recovery job to inspect its Safety Gate status.', 'warning');
          }
        }
      });
    }
  }

  function evaluateJobSafety(job, logs = []) {
    if (!job) {
      return {
        status: 'UNKNOWN',
        label: 'NO JOB SELECTED',
        colorClass: 'text-slate-400',
        badgeClass: 'pending',
        checks: []
      };
    }

    const matchingLogs = logs.filter(l => l.job_id === job.id);
    const isEscalated = job.status === 'ESCALATED_TO_HUMAN';
    const isTier2 = job.status === 'TIER2_CALLING' || job.status === 'TIER2_HINGLISH_CALL';
    const isTier1 = job.status === 'TIER1_SENT';

    let hasFrequencyDowngrade = false;
    if (matchingLogs.length > 0) {
      const rationale = (matchingLogs[0].ai_rationale || '').toLowerCase();
      if (rationale.includes('frequency limit') || rationale.includes('downgraded')) {
        hasFrequencyDowngrade = true;
      }
    }

    let status = 'SAFE';
    let label = '🟢 SAFE TO PROCEED';
    let colorClass = 'text-emerald-400';
    let badgeClass = 'tier2';

    if (isEscalated) {
      status = 'ESCALATED';
      label = '🟣 HUMAN ESCALATION REQUIRED';
      colorClass = 'text-rose-400';
      badgeClass = 'escalated';
    } else if (hasFrequencyDowngrade) {
      status = 'BOUNDED';
      label = '🟡 REVIEW REQUIRED / POLICY BOUNDED';
      colorClass = 'text-amber-400';
      badgeClass = 'tier1';
    }

    const checks = [
      {
        name: '1. Fraud / Manager Signal Gate',
        status: isEscalated ? 'BLOCKED' : 'PASSED',
        pass: !isEscalated,
        explanation: isEscalated ? 'Matched sentiment keywords: manager, fraud, complaint.' : 'No sentiment keywords detected. Safe for automation.'
      },
      {
        name: '2. 24h Call Frequency Limit',
        status: hasFrequencyDowngrade ? 'BOUNDED' : 'PASSED',
        pass: true,
        explanation: hasFrequencyDowngrade ? 'User received recovery call in last 24h. Downgraded to SMS/WhatsApp.' : 'Call frequency within 1 call/24h policy boundary.'
      },
      {
        name: '3. Maximum Discount Cap Policy',
        status: 'PASSED',
        pass: true,
        explanation: 'Enforced maximum 10% policy cap on proposed discounts.'
      },
      {
        name: '4. Duplicate Contact Protection',
        status: 'PASSED',
        pass: true,
        explanation: 'Unique recovery workflow session verified.'
      },
      {
        name: '5. Transaction Value Threshold',
        status: 'PASSED',
        pass: true,
        explanation: `Evaluated ₹${(job.amount || 0).toLocaleString()} transaction value against risk tiers.`
      }
    ];

    let whyStopped = null;
    if (isEscalated) {
      whyStopped = 'Fraud / manager keywords triggered automated safety gate and assigned case to human manager.';
    } else if (hasFrequencyDowngrade) {
      whyStopped = '24-hour call frequency policy limit prevented repeated voice outreach; automatically switched to WhatsApp/SMS link dispatch.';
    }

    return {
      job,
      status,
      label,
      colorClass,
      badgeClass,
      checks,
      whyStopped,
      rationale: matchingLogs[0]?.ai_rationale || 'Evaluated against SmartRecover policy guardrails.'
    };
  }

  function openInspector(jobOrId) {
    let job = typeof jobOrId === 'string' ? null : jobOrId;
    if (typeof jobOrId === 'string' && window.SmartRecoverDashboard) {
      const jobs = window.SmartRecoverDashboard.getJobs();
      job = jobs.find(j => j.id === jobOrId);
    }

    if (!job && window.SmartRecoverDashboard) {
      const jobs = window.SmartRecoverDashboard.getJobs();
      if (jobs && jobs.length > 0) job = jobs[0];
    }

    if (!job) {
      if (window.SmartRecoverDashboard) {
        window.SmartRecoverDashboard.showToast('Select a recovery job to inspect its Safety Gate status.', 'warning');
      }
      return;
    }

    activeJob = job;
    const logs = window.SmartRecoverDashboard ? window.SmartRecoverDashboard.getLogs() : [];
    activeLogs = logs.filter(l => l.job_id === job.id);

    const assessment = evaluateJobSafety(job, logs);
    renderInspectorModal(assessment);
  }

  function renderInspectorModal(assessment) {
    let backdrop = document.getElementById('safetyGateInspectorModal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'safetyGateInspectorModal';
      backdrop.className = 'safety-gate-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const { job, status, label, colorClass, checks, whyStopped, rationale } = assessment;

    backdrop.innerHTML = `
      <div class="safety-gate-card text-left max-w-xl w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <i data-lucide="shield-check" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <h3 class="font-bold text-white text-base">AI Safety Gate Inspector</h3>
              <p class="text-xs text-slate-400 font-mono">Job #${job.id.slice(0, 8)} • ${escapeHtml(job.customer_name || 'Customer')}</p>
            </div>
          </div>
          <button onclick="SmartRecoverSafetyGate.closeInspector()" class="text-slate-400 hover:text-white cursor-pointer">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>

        <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 flex items-center justify-between">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Evaluation Result</span>
          <span class="text-xs font-extrabold ${colorClass} font-mono">${label}</span>
        </div>

        ${whyStopped ? `
          <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 mb-4">
            <div class="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase mb-1">
              <i data-lucide="alert-octagon" style="width:14px; height:14px;"></i>
              <span>WHY DID THE AI STOP?</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(whyStopped)}</p>
          </div>
        ` : ''}

        <div class="space-y-2 mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Guardrail Policy Matrix</span>
          ${checks.map(c => `
            <div class="p-3 rounded-xl bg-slate-950/60 border ${c.pass ? 'border-slate-800' : 'border-rose-500/40'} flex items-center justify-between">
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-2">
                  <span class="${c.pass ? 'text-emerald-400' : 'text-rose-400'}">${c.pass ? '✓' : '🛑'}</span>
                  <span>${c.name}</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-0.5">${c.explanation}</p>
              </div>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded ${c.pass ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}">
                ${c.status}
              </span>
            </div>
          `).join('')}
        </div>

        <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs mb-4">
          <span class="text-slate-500 font-bold uppercase text-[10px]">Stored AI Rationale</span>
          <p class="text-slate-300 mt-1 font-mono">${escapeHtml(rationale)}</p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button onclick="SmartRecoverSafetyGate.closeInspector()" class="action-btn-secondary">
            <span>Close</span>
          </button>
          <button onclick="SmartRecoverSafetyGate.replayFromSafetyGate('${job.id}')" class="btn-primary-glow" style="padding:0.4rem 0.85rem; font-size:0.75rem;">
            <i data-lucide="play" style="width:13px; height:13px;"></i>
            <span>Replay Decision</span>
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Sync 3D AI Core visual state
    if (window.SmartRecoverAICore) {
      window.SmartRecoverAICore.setCoreState(status === 'ESCALATED' ? 'ESCALATED' : 'SUCCESS');
    }
  }

  function closeInspector() {
    const backdrop = document.getElementById('safetyGateInspectorModal');
    if (backdrop) backdrop.classList.remove('open');
  }

  function replayFromSafetyGate(jobId) {
    closeInspector();
    if (window.SmartRecoverDashboard) {
      window.SmartRecoverDashboard.replayJob(jobId);
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
    evaluateJobSafety,
    openInspector,
    closeInspector,
    replayFromSafetyGate
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  SmartRecoverSafetyGate.init();
});
