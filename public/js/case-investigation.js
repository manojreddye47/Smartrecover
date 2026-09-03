/**
 * SMARTRECOVER - CASE INVESTIGATION CENTER
 * Premium 100% READ-ONLY AI Recovery Case File experience.
 * Displays complete end-to-end recovery stories without context switching.
 */

window.SmartRecoverCaseInvestigation = (function () {

  function renderCaseFile(jobId) {
    if (!window.SmartRecoverDashboard) return;

    const jobs = window.SmartRecoverDashboard.getJobs();
    const logs = window.SmartRecoverDashboard.getLogs();
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      window.SmartRecoverDashboard.showToast('Recovery job not found.', 'warning');
      return;
    }

    const drawerContent = document.getElementById('jobDrawerContent');
    const backdrop = document.getElementById('jobDrawerBackdrop');
    if (!drawerContent || !backdrop) return;

    const matchingLogs = logs.filter(l => l.job_id === job.id);
    const safetyAssessment = window.SmartRecoverSafetyGate ? 
      window.SmartRecoverSafetyGate.evaluateJobSafety(job, logs) : 
      { status: 'UNKNOWN', label: 'Safety Gate Evaluated', checks: [] };

    const isEscalation = job.status === 'ESCALATED_TO_HUMAN';
    const isTier2 = job.status === 'TIER2_CALLING' || job.status === 'TIER2_HINGLISH_CALL';
    const isTier1 = job.status === 'TIER1_SENT';

    const shortId = job.id ? job.id.slice(0, 8).toUpperCase() : 'CASE';
    const maskedPhone = maskPhone(job.customer_phone || '+919014453381');
    const formattedTime = new Date(job.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedDate = new Date(job.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    const shortLink = job.payment_link ? job.payment_link.replace('https://', '') : null;
    const storedRationale = matchingLogs[0]?.ai_rationale || `Automated recovery process executed for ₹${(job.amount || 0).toLocaleString()} payment failure.`;

    drawerContent.innerHTML = `
      <div class="space-y-4">
        
        <!-- CASE HEADER -->
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold uppercase border border-cyan-500/30">
                CASE #REC-${shortId}
              </span>
              <span class="text-xs text-slate-500 font-mono">${formattedDate} • ${formattedTime}</span>
            </div>
            <span class="status-badge ${isEscalation ? 'escalated' : (isTier2 ? 'tier2' : 'tier1')} font-mono">
              <span>●</span> ${job.status}
            </span>
          </div>

          <h2 class="text-xl font-extrabold text-white">${escapeHtml(job.customer_name || 'Anonymous Customer')}</h2>
          <div class="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
            <span>${maskedPhone}</span>
            <span>•</span>
            <span>Failure: <strong class="text-slate-200 font-sans">${escapeHtml(job.failure_reason || 'Gateway Failure')}</strong></span>
          </div>
        </div>

        <!-- CASE SUMMARY CARDS -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Transaction Amount</span>
            <div class="text-lg font-bold text-emerald-400 mt-0.5">₹${(job.amount || 0).toLocaleString()}</div>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Safety Gate Status</span>
            <div class="text-xs font-bold ${safetyAssessment.colorClass} mt-1 font-mono truncate">${safetyAssessment.label}</div>
          </div>
        </div>

        <!-- VISUAL CASE JOURNEY PIPELINE -->
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Visual Case Journey</span>
          
          <div class="grid grid-cols-4 gap-1 pt-1 text-[10px] font-mono text-center">
            <div class="p-2 rounded bg-slate-950 border border-slate-800">
              <div class="text-blue-400 font-bold">1. FAILURE</div>
              <div class="text-slate-400 truncate">Ingested</div>
            </div>
            <div class="p-2 rounded bg-slate-950 border border-slate-800">
              <div class="text-cyan-400 font-bold">2. AI RISK</div>
              <div class="text-slate-400 truncate">Gemini AI</div>
            </div>
            <div class="p-2 rounded bg-slate-950 border ${isEscalation ? 'border-rose-500/40 text-rose-400' : 'border-emerald-500/40 text-emerald-400'}">
              <div class="font-bold">3. SAFETY</div>
              <div class="truncate">${isEscalation ? 'BLOCKED' : 'PASSED'}</div>
            </div>
            <div class="p-2 rounded bg-slate-950 border border-slate-800">
              <div class="${isEscalation ? 'text-rose-400' : 'text-emerald-400'} font-bold">4. ACTION</div>
              <div class="truncate">${job.status}</div>
            </div>
          </div>
        </div>

        <!-- WHY DID THE AI DO THIS? (EXPLAINABILITY CARD) -->
        <div class="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 space-y-2">
          <div class="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase">
            <i data-lucide="brain" style="width: 15px; height: 15px;"></i>
            <span>🧠 WHY DID THE AI DO THIS?</span>
          </div>
          
          <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5">
            <div>
              <span class="text-slate-500 text-[10px] uppercase font-bold">Observed Context:</span>
              <p class="text-slate-300 font-sans">${escapeHtml(job.failure_reason || 'Bank Gateway Failure')} (₹${(job.amount || 0).toLocaleString()})</p>
            </div>
            <div>
              <span class="text-slate-500 text-[10px] uppercase font-bold">Stored AI Rationale:</span>
              <p class="text-cyan-300 font-sans leading-relaxed">${escapeHtml(storedRationale)}</p>
            </div>
          </div>
        </div>

        ${safetyAssessment.whyStopped ? `
          <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <div class="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase mb-1">
              <i data-lucide="alert-octagon" style="width:14px; height:14px;"></i>
              <span>WHY DID THE AI STOP?</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(safetyAssessment.whyStopped)}</p>
          </div>
        ` : ''}

        <!-- SAFETY GATE COMPLIANCE CARD -->
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">🛡 Guardrail Safety Matrix</span>
            <button onclick="SmartRecoverCaseInvestigation.inspectSafetyGate('${job.id}')" class="text-[11px] text-emerald-400 font-bold hover:underline cursor-pointer">
              Inspect Gate →
            </button>
          </div>

          <div class="space-y-1.5 text-xs">
            ${safetyAssessment.checks.map(c => `
              <div class="flex items-center justify-between p-2 rounded bg-slate-950 border ${c.pass ? 'border-slate-800' : 'border-rose-500/30'}">
                <span class="text-slate-300 font-semibold text-[11px]">${c.name}</span>
                <span class="font-mono text-[10px] font-bold ${c.pass ? 'text-emerald-400' : 'text-rose-400'}">${c.status}</span>
              </div>
            `).map ? safetyAssessment.checks.map(c => `
              <div class="flex items-center justify-between p-2 rounded bg-slate-950 border ${c.pass ? 'border-slate-800' : 'border-rose-500/30'}">
                <span class="text-slate-300 font-semibold text-[11px]">${c.name}</span>
                <span class="font-mono text-[10px] font-bold ${c.pass ? 'text-emerald-400' : 'text-rose-400'}">${c.status}</span>
              </div>
            `).join('') : ''}
          </div>
        </div>

        <!-- PAYMENT RECOVERY CARD -->
        <div>
          <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">💳 Auto-Dispatched Razorpay Link</span>
          ${job.payment_link ? `
            <div class="link-box-interactive w-full mt-1 justify-between">
              <a href="${job.payment_link}" target="_blank" class="link-short-text font-mono">${escapeHtml(shortLink)}</a>
              <div class="flex items-center gap-2">
                <button class="copy-btn-icon" onclick="SmartRecoverDashboard.copyToClipboard('${job.payment_link}')" title="Copy link">
                  <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                </button>
                <a href="${job.payment_link}" target="_blank" class="copy-btn-icon" title="Open link">
                  <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                </a>
              </div>
            </div>
          ` : `
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 font-mono mt-1">
              Payment link generation bypassed by Human Escalation Safety Gate.
            </div>
          `}
        </div>

        <!-- CHRONOLOGICAL AUDIT TIMELINE -->
        <div class="space-y-2">
          <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Case Audit Timeline</span>
          <div class="space-y-2 text-xs font-mono">
            ${matchingLogs.length > 0 ? matchingLogs.map(l => `
              <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-2">
                <div>
                  <span class="text-cyan-400 font-bold">[${escapeHtml(l.action_taken)}]</span>
                  <p class="text-slate-300 font-sans mt-0.5 text-[11px]">${escapeHtml(l.ai_rationale)}</p>
                </div>
                <span class="text-slate-500 text-[10px] flex-shrink-0">${new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            `).join('') : `
              <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-500">
                Payment failure ingested into autonomous recovery queue.
              </div>
            `}
          </div>
        </div>

        <!-- READ-ONLY ACTION BAR -->
        <div class="pt-4 border-t border-slate-800 flex flex-col gap-2">
          <div class="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-center text-[10px] text-blue-400 font-mono font-bold">
            🔵 READ-ONLY CASE INSPECTION — 0 External Actions Triggered
          </div>

          <button onclick="SmartRecoverCaseInvestigation.inspectSafetyGate('${job.id}')" class="action-btn-secondary justify-center text-emerald-400 border-emerald-500/30">
            <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
            <span>🛡 INSPECT SAFETY GATE</span>
          </button>

          <button onclick="SmartRecoverCaseInvestigation.replayDecision('${job.id}')" class="btn-primary-glow justify-center">
            <i data-lucide="play" style="width: 14px; height: 14px;"></i>
            <span>▶ REPLAY AI DECISION</span>
          </button>
        </div>

      </div>
    `;

    backdrop.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Sync 3D AI Core state
    if (window.SmartRecoverAICore) {
      window.SmartRecoverAICore.setCoreState(isEscalation ? 'ESCALATED' : 'SUCCESS');
    }
  }

  function replayDecision(jobId) {
    if (window.SmartRecoverDashboard) {
      window.SmartRecoverDashboard.closeJobDrawer();
      window.SmartRecoverDashboard.replayJob(jobId);
    }
  }

  function inspectSafetyGate(jobId) {
    if (window.SmartRecoverDashboard) {
      window.SmartRecoverDashboard.closeJobDrawer();
    }
    if (window.SmartRecoverSafetyGate) {
      window.SmartRecoverSafetyGate.openInspector(jobId);
    }
  }

  function maskPhone(phone) {
    if (!phone || phone.length < 10) return phone;
    const clean = String(phone);
    const last4 = clean.slice(-4);
    return `+91 ••••••${last4}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  return {
    renderCaseFile,
    replayDecision,
    inspectSafetyGate
  };
})();
