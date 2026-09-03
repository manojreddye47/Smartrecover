/**
 * SMARTRECOVER - LIVE RECOVERY SIMULATOR & TELEMETRY LAB
 * Interactive merchant sandbox allowing custom payment failure triggers
 * and real-time observability telemetry streaming.
 */

window.SmartRecoverTelemetryLab = (function () {
  let isSubmitting = false;

  function init() {
    setupLabButtonListeners();
  }

  function setupLabButtonListeners() {
    const labLinks = document.querySelectorAll('a[href="#scenariosSection"]');
    labLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openSandboxModal();
      });
    });
  }

  function openSandboxModal() {
    let backdrop = document.getElementById('telemetryLabSandboxModal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'telemetryLabSandboxModal';
      backdrop.className = 'safety-gate-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div class="safety-gate-card text-left max-w-lg w-full p-6 bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl relative" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <i data-lucide="sliders" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <h3 class="font-bold text-white text-base">Custom Simulation Sandbox</h3>
              <p class="text-xs text-slate-400">Configure custom failure parameters & trigger live recovery</p>
            </div>
          </div>
          <button onclick="SmartRecoverTelemetryLab.closeSandboxModal()" class="text-slate-400 hover:text-white cursor-pointer">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>

        <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 mb-4 flex items-center justify-between">
          <div class="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <span class="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span>🔴 LIVE SIMULATION MODE</span>
          </div>
          <span class="text-[10px] text-rose-300/80 font-mono">Invokes Gemini AI, Razorpay & Supabase</span>
        </div>

        <form id="customSimulationForm" onsubmit="SmartRecoverTelemetryLab.handleCustomSubmit(event)" class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-400 font-bold uppercase mb-1">Customer Name</label>
            <input type="text" id="simCustomerName" value="Aditi Verma" required class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-rose-400">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 font-bold uppercase mb-1">Phone Number</label>
              <input type="text" id="simCustomerPhone" value="+919876543210" required class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono outline-none focus:border-rose-400">
            </div>
            <div>
              <label class="block text-slate-400 font-bold uppercase mb-1">Failed Amount (₹)</label>
              <input type="number" id="simAmount" value="4500" min="100" max="100000" required class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-emerald-400 font-bold font-mono outline-none focus:border-rose-400">
            </div>
          </div>

          <div>
            <label class="block text-slate-400 font-bold uppercase mb-1">Gateway Failure Reason</label>
            <select id="simFailureReason" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-rose-400">
              <option value="Bank server gateway timeout during OTP verification">Bank server gateway timeout during OTP verification</option>
              <option value="Insufficient account balance decline">Insufficient account balance decline</option>
              <option value="Card authorization limits exceeded">Card authorization limits exceeded</option>
              <option value="Customer requested to speak with a manager regarding fraud">Customer requested to speak with a manager regarding fraud</option>
            </select>
          </div>

          <div>
            <label class="block text-slate-400 font-bold uppercase mb-1">Customer Sentiment / Notes (Optional)</label>
            <input type="text" id="simUserNotes" placeholder="e.g. 'I want to talk to a manager' or 'retry tomorrow'" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-rose-400">
          </div>

          <div id="simProgressStatusBox" class="hidden p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-400 flex items-center justify-between">
            <span id="simProgressStepText">INITIALIZING BACKEND...</span>
            <span class="status-dot-pulse"></span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button type="button" onclick="SmartRecoverTelemetryLab.closeSandboxModal()" class="action-btn-secondary">
              <span>Cancel</span>
            </button>
            <button type="submit" id="submitCustomSimBtn" class="btn-primary-glow" style="padding:0.5rem 1rem; font-size:0.8rem; background: linear-gradient(135deg, #f43f5e, #be123c);">
              <i data-lucide="zap" style="width:14px; height:14px;"></i>
              <span>🚀 TRIGGER LIVE RECOVERY</span>
            </button>
          </div>
        </form>
      </div>
    `;

    backdrop.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeSandboxModal() {
    const backdrop = document.getElementById('telemetryLabSandboxModal');
    if (backdrop) backdrop.classList.remove('open');
    isSubmitting = false;
  }

  async function handleCustomSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submission
    isSubmitting = true;

    const btn = document.getElementById('submitCustomSimBtn');
    const progressBox = document.getElementById('simProgressStatusBox');
    const stepText = document.getElementById('simProgressStepText');

    if (btn) btn.disabled = true;
    if (progressBox) progressBox.classList.remove('hidden');

    const updateStep = (msg) => {
      if (stepText) stepText.innerText = msg;
    };

    updateStep('1/5 INITIALIZING BACKEND REQUEST...');

    const name = document.getElementById('simCustomerName').value;
    const phone = document.getElementById('simCustomerPhone').value;
    const amount = parseFloat(document.getElementById('simAmount').value) || 3500;
    const reason = document.getElementById('simFailureReason').value;
    const notes = document.getElementById('simUserNotes').value;

    const payload = {
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            amount: amount * 100,
            contact: phone,
            error_description: reason,
            notes: { customer_name: name, user_message: notes }
          }
        }
      }
    };

    if (window.SmartRecoverDashboard) {
      window.SmartRecoverDashboard.showToast(`🔴 Triggering Live Recovery: ${name} (₹${amount.toLocaleString()})`, 'info');
    }

    try {
      updateStep('2/5 GEMINI AI INTENT & RISK ANALYSIS...');
      await new Promise(r => setTimeout(r, 400));

      updateStep('3/5 AI SAFETY GATE & POLICY EVALUATION...');
      await new Promise(r => setTimeout(r, 400));

      updateStep('4/5 RAZORPAY PAYMENT LINK & CHANNEL DISPATCH...');

      const response = await fetch('/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      updateStep('5/5 COMPLETED! UPDATING DASHBOARD...');
      await new Promise(r => setTimeout(r, 300));

      closeSandboxModal();

      if (result.success && window.SmartRecoverDashboard) {
        if (result.status === 'ESCALATED_TO_HUMAN') {
          window.SmartRecoverDashboard.showToast(`⚠️ Safety Gate Triggered: Escalated to Human Support`, 'warning');
        } else {
          window.SmartRecoverDashboard.showToast(`✅ Payment Link Dispatched via ${result.decision?.recommended_tier || 'Tier 2 Voice'}`, 'success');
        }

        // Refresh dashboard data
        const [jobsRes, logsRes] = await Promise.all([
          fetch('/api/jobs').then(r => r.json()),
          fetch('/api/logs').then(r => r.json())
        ]);

        if (jobsRes.data && logsRes.data) {
          window.SmartRecoverDashboard.setInitialData(jobsRes.data, logsRes.data);
          
          if (jobsRes.data.length > 0 && window.SmartRecoverReplay) {
            window.SmartRecoverReplay.loadJobForReplay(jobsRes.data[0], logsRes.data);
          }
        }
      }
    } catch (err) {
      console.error('Custom simulation error:', err);
      if (window.SmartRecoverDashboard) {
        window.SmartRecoverDashboard.showToast('Live simulation error: ' + err.message, 'error');
      }
    } finally {
      isSubmitting = false;
    }
  }

  return {
    init,
    openSandboxModal,
    closeSandboxModal,
    handleCustomSubmit
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  SmartRecoverTelemetryLab.init();
});
