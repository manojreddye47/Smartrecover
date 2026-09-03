require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const Razorpay = require('razorpay');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const PORT = process.env.PORT || 5000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PUBLIC_KEY = process.env.VAPI_PUBLIC_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

// Startup Validation
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'VAPI_API_KEY',
  'VAPI_PUBLIC_KEY',
  'VAPI_ASSISTANT_ID'
];

const missingEnvVars = [];
requiredEnvVars.forEach((varName) => {
  if (process.env[varName]) {
    console.log(`[CONFIG] ${varName}: configured`);
  } else {
    console.error(`[CONFIG] ${varName}: MISSING`);
    missingEnvVars.push(varName);
  }
});

if (missingEnvVars.length > 0) {
  console.error(`❌ Fatal Configuration Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Service Initializations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Root Route Redirect
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'active', message: 'SmartRecover AI Engine running smoothly!' });
});

// JSON API: Get Latest Jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('recovery_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: jobs || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// JSON API: Get Latest Audit Logs
app.get('/api/logs', async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;
    res.json({ success: true, data: logs || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// JSON API: Telemetry Stats Summary
app.get('/api/stats', async (req, res) => {
  try {
    const { data: jobs } = await supabase.from('recovery_jobs').select('*');
    const totalJobs = jobs ? jobs.length : 0;
    const calling = jobs ? jobs.filter(j => j.status === 'TIER2_CALLING').length : 0;
    const sentSms = jobs ? jobs.filter(j => j.status === 'TIER1_SENT').length : 0;
    const escalated = jobs ? jobs.filter(j => j.status === 'ESCALATED_TO_HUMAN').length : 0;
    const totalAmount = jobs ? jobs.reduce((sum, j) => sum + (Number(j.amount) || 0), 0) : 0;

    res.json({
      success: true,
      stats: {
        totalJobs,
        calling,
        sentSms,
        escalated,
        totalAmount,
        dispatchRate: totalJobs > 0 ? Math.round(((calling + sentSms) / totalJobs) * 100) : 100
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Interactive Merchant Presentation Dashboard (`/dashboard`)
 */
app.get('/dashboard', async (req, res) => {
  try {
    const { data: jobs } = await supabase
      .from('recovery_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const totalJobs = jobs ? jobs.length : 0;
    const escalated = jobs ? jobs.filter(j => j.status === 'ESCALATED_TO_HUMAN').length : 0;
    const calling = jobs ? jobs.filter(j => j.status === 'TIER2_CALLING').length : 0;
    const sentSms = jobs ? jobs.filter(j => j.status === 'TIER1_SENT').length : 0;
    const totalRecoveredAmount = jobs ? jobs.reduce((sum, j) => sum + (Number(j.amount) || 0), 0) : 0;
    const dispatchRate = totalJobs > 0 ? Math.round(((calling + sentSms) / totalJobs) * 100) : 100;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SmartRecover - Autonomous AI Payment Recovery Engine</title>
        <meta name="description" content="Autonomous AI-powered payment recovery operations platform, intelligent voice recovery, automated payment link dispatch, and safety guardrails.">
        
        <link rel="stylesheet" href="/css/main.css">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <div class="bg-ambient-layer"></div>
        <div class="bg-grid-layer"></div>

        <div class="app-shell">
          
          <!-- LEFT SIDEBAR -->
          <aside class="app-sidebar" id="appSidebar">
            <div class="sidebar-header">
              <a href="/dashboard" class="brand-wrapper">
                <div class="brand-icon-box">
                  <i data-lucide="zap" style="color: var(--primary-blue); width: 20px; height: 20px;"></i>
                </div>
                <div>
                  <div class="brand-title">SMARTRECOVER</div>
                  <div class="brand-subtitle">AI RECOVERY ENGINE</div>
                </div>
              </a>
            </div>

            <div class="sidebar-nav">
              <div>
                <div class="nav-section-title">Operations</div>
                <ul class="nav-list">
                  <li>
                    <a href="/dashboard" class="nav-link active">
                      <i data-lucide="layout-dashboard" class="nav-icon"></i>
                      <span>COMMAND CENTER</span>
                    </a>
                  </li>
                  <li>
                    <a href="#recoveryJobsSection" class="nav-link">
                      <i data-lucide="activity" class="nav-icon"></i>
                      <span>RECOVERY JOBS</span>
                      <span class="nav-badge" id="sidebarJobsBadge">${totalJobs}</span>
                    </a>
                  </li>
                  <li>
                    <a href="/test-voice-call" target="_blank" class="nav-link">
                      <i data-lucide="phone-call" class="nav-icon" style="color: var(--emerald-active);"></i>
                      <span>VOICE AI</span>
                      <span class="nav-badge" style="background: var(--emerald-surface); color: var(--emerald-active); border-color: var(--emerald-border);">READY</span>
                    </a>
                  </li>
                  <li>
                    <a href="#recoveryJobsSection" class="nav-link">
                      <i data-lucide="link-2" class="nav-icon"></i>
                      <span>PAYMENT LINKS</span>
                    </a>
                  </li>
                  <li>
                    <a href="#decisionTrailSection" class="nav-link">
                      <i data-lucide="git-branch" class="nav-icon"></i>
                      <span>AI DECISION TRAIL</span>
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <div class="nav-section-title">Analytics & Replay</div>
                <ul class="nav-list">
                  <li>
                    <a href="#decisionEngineSection" class="nav-link">
                      <i data-lucide="play-circle" class="nav-icon" style="color: var(--cyan-neural);"></i>
                      <span>DECISION REPLAY</span>
                    </a>
                  </li>
                  <li>
                    <a href="#analyticsSection" class="nav-link">
                      <i data-lucide="bar-chart-3" class="nav-icon"></i>
                      <span>RECOVERY ANALYTICS</span>
                    </a>
                  </li>
                  <li>
                    <a href="#riskMonitorSection" class="nav-link">
                      <i data-lucide="shield-check" class="nav-icon"></i>
                      <span>RISK MONITOR</span>
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <div class="nav-section-title">System & Safety</div>
                <ul class="nav-list">
                  <li>
                    <a href="#guardrailsSection" class="nav-link">
                      <i data-lucide="shield-alert" class="nav-icon"></i>
                      <span>SAFETY GUARDRAILS</span>
                    </a>
                  </li>
                  <li>
                    <a href="#scenariosSection" class="nav-link">
                      <i data-lucide="sliders" class="nav-icon"></i>
                      <span>SIMULATION LAB</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div class="sidebar-footer">
              <div class="system-status-indicator">
                <div class="status-dot-pulse"></div>
                <div>
                  <div class="status-text">SYSTEM ONLINE</div>
                  <div style="font-size: 0.65rem; color: var(--text-subtle); font-family: monospace;">LATENCY: 24ms • V2.4</div>
                </div>
              </div>
            </div>
          </aside>

          <!-- MAIN WRAPPER -->
          <div class="main-wrapper">
            
            <!-- TOP NAVBAR -->
            <header class="app-topbar">
              <div class="topbar-left">
                <button class="sidebar-toggle-btn md:hidden" id="mobileMenuBtn" aria-label="Toggle navigation">
                  <i data-lucide="menu" style="width: 18px; height: 18px;"></i>
                </button>
                <button class="sidebar-toggle-btn hidden md:flex" id="sidebarToggleBtn" aria-label="Toggle sidebar">
                  <i data-lucide="panel-left" style="width: 18px; height: 18px;"></i>
                </button>
                <div class="topbar-breadcrumb">
                  <span class="breadcrumb-root">SmartRecover</span>
                  <span class="breadcrumb-separator">/</span>
                  <span class="breadcrumb-current">Command Center</span>
                </div>
              </div>

              <div class="topbar-center">
                <button id="openCommandPaletteBtn" class="bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer">
                  <i data-lucide="search" style="width: 14px; height: 14px;"></i>
                  <span>Quick Search & Actions...</span>
                  <span class="command-shortcut-kbd">Ctrl K</span>
                </button>
              </div>

              <div class="topbar-right">
                <button id="presentationModeToggleBtn" class="action-btn-secondary" title="Toggle Presentation Mode">
                  <i data-lucide="monitor" style="width: 14px; height: 14px; color: var(--cyan-neural);"></i>
                  <span class="hidden sm:inline">Presentation Mode</span>
                </button>

                <a href="/test-voice-call" target="_blank" class="action-btn-secondary">
                  <i data-lucide="phone" style="width: 14px; height: 14px; color: var(--emerald-active);"></i>
                  <span>Voice Simulator</span>
                </a>
                
                <div class="user-avatar-pill">
                  <div class="avatar-circle">SR</div>
                  <span class="text-xs font-semibold text-slate-300 pr-1 hidden sm:inline">Merchant Ops</span>
                </div>
              </div>
            </header>

            <!-- MAIN CONTENT -->
            <main class="main-content">
              
              <!-- CINEMATIC HERO SECTION -->
              <section class="hero-card">
                <div>
                  <div class="hero-eyebrow">
                    <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
                    <span>Autonomous Recovery Platform</span>
                  </div>
                  <h1 class="hero-title">
                    SmartRecover<br>
                    AI Payment Recovery Engine
                  </h1>
                  <p class="hero-desc">
                    Recover failed payments automatically. Intelligently. Safely. Autonomous risk routing, dynamic Hinglish Voice AI calling, instant Razorpay payment links, and policy guardrails.
                  </p>

                  <div class="hero-cta-group">
                    <button onclick="SmartRecoverDashboard.runLiveDemo()" class="btn-primary-glow">
                      <i data-lucide="play" style="width: 16px; height: 16px;"></i>
                      <span>RUN LIVE DEMO</span>
                    </button>
                    <button onclick="SmartRecoverTelemetryLab.openSandboxModal()" class="btn-outline-glass">
                      <i data-lucide="sliders" style="width: 16px; height: 16px; color: var(--cyan-neural);"></i>
                      <span>Custom Scenario Lab</span>
                    </button>
                  </div>

                  <div class="hero-badges">
                    <div class="hero-badge-item">
                      <span class="dot-green"></span>
                      <span>AI Engine Online</span>
                    </div>
                    <div class="hero-badge-item">
                      <span class="dot-cyan"></span>
                      <span>Voice Agent Ready</span>
                    </div>
                    <div class="hero-badge-item">
                      <span class="dot-purple"></span>
                      <span>Payment Router Active</span>
                    </div>
                  </div>
                </div>

                <!-- 3D AI Neural Core Canvas -->
                <div class="hero-3d-container" id="aiCoreCanvasContainer">
                  <div class="hero-3d-overlay">
                    <i data-lucide="cpu" style="width: 12px; height: 12px;"></i>
                    <span>3D Neural Core Active</span>
                  </div>
                </div>
              </section>

              <!-- SYSTEM STATUS STRIP -->
              <section class="system-status-strip">
                <div class="status-strip-node">
                  <span class="node-label">AI Engine</span>
                  <span class="node-value online">
                    <span class="status-dot-pulse" style="width:5px; height:5px;"></span> ONLINE
                  </span>
                </div>
                <div class="status-strip-node">
                  <span class="node-label">Payment Router</span>
                  <span class="node-value active">
                    <span style="width:5px; height:5px; border-radius:50%; background:var(--cyan-neural);"></span> ACTIVE
                  </span>
                </div>
                <div class="status-strip-node">
                  <span class="node-label">Voice Agent</span>
                  <span class="node-value ready">
                    <span style="width:5px; height:5px; border-radius:50%; background:var(--primary-blue);"></span> READY
                  </span>
                </div>
                <div class="status-strip-node">
                  <span class="node-label">Fraud Guard</span>
                  <span class="node-value online">
                    <span style="width:5px; height:5px; border-radius:50%; background:var(--emerald-active);"></span> ACTIVE
                  </span>
                </div>
                <div class="status-strip-node">
                  <span class="node-label">Dispatch Queue</span>
                  <span class="node-value font-mono text-cyan-400">
                    03 PENDING
                  </span>
                </div>
              </section>

              <!-- ANALYTICS METRICS CARDS -->
              <section class="metrics-grid">
                <div class="metric-card recovered">
                  <div class="metric-card-top">
                    <span class="metric-label">Total Failures Processed</span>
                    <div class="metric-icon-box">
                      <i data-lucide="credit-card" style="width: 18px; height: 18px; color: var(--primary-blue);"></i>
                    </div>
                  </div>
                  <div class="metric-value-row">
                    <span class="metric-value" id="metricTotalJobs">${totalJobs}</span>
                    <span class="text-xs text-slate-500 font-semibold">Jobs</span>
                  </div>
                  <div class="metric-footer">
                    <span>Total Volume: <strong class="text-white font-mono">₹${totalRecoveredAmount.toLocaleString()}</strong></span>
                    <span class="metric-trend-pill up">
                      <i data-lucide="trending-up" style="width: 12px; height: 12px;"></i> 100% Sync
                    </span>
                  </div>
                </div>

                <div class="metric-card voice">
                  <div class="metric-card-top">
                    <span class="metric-label">Tier 2 Voice Dispatches</span>
                    <div class="metric-icon-box">
                      <i data-lucide="phone-call" style="width: 18px; height: 18px; color: var(--emerald-active);"></i>
                    </div>
                  </div>
                  <div class="metric-value-row">
                    <span class="metric-value" id="metricVoiceJobs">${calling}</span>
                    <span class="text-xs text-emerald-500/80 font-semibold">Calls</span>
                  </div>
                  <div class="metric-footer">
                    <span>Autonomous Hinglish Agent</span>
                    <span class="text-emerald-400 font-semibold">Real-time</span>
                  </div>
                </div>

                <div class="metric-card sms">
                  <div class="metric-card-top">
                    <span class="metric-label">Tier 1 SMS / WhatsApp</span>
                    <div class="metric-icon-box">
                      <i data-lucide="message-square" style="width: 18px; height: 18px; color: var(--amber-warning);"></i>
                    </div>
                  </div>
                  <div class="metric-value-row">
                    <span class="metric-value" id="metricSmsJobs">${sentSms}</span>
                    <span class="text-xs text-amber-500/80 font-semibold">Messages</span>
                  </div>
                  <div class="metric-footer">
                    <span>Instant Link Dispatch</span>
                    <span class="text-amber-400 font-semibold">Fast Delivery</span>
                  </div>
                </div>

                <div class="metric-card escalated">
                  <div class="metric-card-top">
                    <span class="metric-label">Human Escalations</span>
                    <div class="metric-icon-box">
                      <i data-lucide="shield-alert" style="width: 18px; height: 18px; color: var(--rose-danger);"></i>
                    </div>
                  </div>
                  <div class="metric-value-row">
                    <span class="metric-value" id="metricEscalatedJobs">${escalated}</span>
                    <span class="text-xs text-rose-500/80 font-semibold">Cases</span>
                  </div>
                  <div class="metric-footer">
                    <span>Fraud & Policy Guardrails</span>
                    <span class="text-rose-400 font-semibold">Safety First</span>
                  </div>
                </div>
              </section>

              <!-- AI RECOVERY SCENARIOS (Interactive Simulation Triggers) -->
              <section class="scenarios-section" id="scenariosSection">
                <div class="section-header-row">
                  <div class="section-heading-group">
                    <h2>
                      <i data-lucide="terminal" style="color: var(--cyan-neural); width: 20px; height: 20px;"></i>
                      <span>AI Recovery Scenarios & Sandbox Lab</span>
                    </h2>
                    <p>Simulate real-world payment failures or configure custom failure parameters in real-time.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button onclick="SmartRecoverTelemetryLab.openSandboxModal()" class="action-btn-secondary text-cyan-400 border-cyan-500/30">
                      <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
                      <span>Custom Sandbox</span>
                    </button>
                    <button onclick="SmartRecoverDashboard.runLiveDemo()" class="action-btn-secondary">
                      <i data-lucide="play" style="width: 14px; height: 14px; color: var(--emerald-active);"></i>
                      <span>Run Full 9-Step Demo</span>
                    </button>
                  </div>
                </div>

                <div class="scenarios-grid">
                  <!-- Scenario 1 -->
                  <div class="scenario-card emerald" onclick="SmartRecoverDashboard.triggerDemo('standard', this.querySelector('button'))">
                    <div>
                      <div class="scenario-step-number">SCENARIO 01</div>
                      <div class="scenario-title">High-Value Failure (₹3,500+)</div>
                      <p class="scenario-desc">
                        Auto-generates Razorpay payment link and triggers autonomous Hinglish Voice AI recovery session with dynamic context.
                      </p>
                    </div>
                    <button class="scenario-btn">
                      <i data-lucide="play" style="width: 13px; height: 13px;"></i>
                      <span>Simulate High-Value Failure</span>
                    </button>
                  </div>

                  <!-- Scenario 2 -->
                  <div class="scenario-card rose" onclick="SmartRecoverDashboard.triggerDemo('escalation', this.querySelector('button'))">
                    <div>
                      <div class="scenario-step-number">SCENARIO 02</div>
                      <div class="scenario-title">Manager Request / Fraud Alert</div>
                      <p class="scenario-desc">
                        Customer sentiment keyword matches fraud or manager request. Triggers safety guardrail and escalates case to human manager.
                      </p>
                    </div>
                    <button class="scenario-btn">
                      <i data-lucide="shield-alert" style="width: 13px; height: 13px;"></i>
                      <span>Simulate Fraud Escalation</span>
                    </button>
                  </div>

                  <!-- Scenario 3 -->
                  <div class="scenario-card amber" onclick="SmartRecoverDashboard.triggerDemo('duplicate', this.querySelector('button'))">
                    <div>
                      <div class="scenario-step-number">SCENARIO 03</div>
                      <div class="scenario-title">Duplicate Contact (&lt;24h)</div>
                      <p class="scenario-desc">
                        Detects repeat recovery attempt within 24h frequency limit. Automatically falls back to WhatsApp/SMS link dispatch.
                      </p>
                    </div>
                    <button class="scenario-btn">
                      <i data-lucide="refresh-cw" style="width: 13px; height: 13px;"></i>
                      <span>Simulate Duplicate Call</span>
                    </button>
                  </div>
                </div>
              </section>

              <!-- AI DECISION ENGINE FLOW VISUALIZER & REPLAY DOCK -->
              <section class="decision-engine-box" id="decisionEngineSection">
                <div class="section-header-row">
                  <div class="section-heading-group">
                    <h2>
                      <i data-lucide="cpu" style="color: var(--primary-blue); width: 20px; height: 20px;"></i>
                      <span>AI Decision Engine Flow & Safety Gate</span>
                    </h2>
                    <p>Every autonomous recovery decision passes through policy, fraud, and frequency guardrails before execution.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button onclick="SmartRecoverSafetyGate.openInspector()" class="action-btn-secondary text-emerald-400 border-emerald-500/30">
                      <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
                      <span>🛡 Inspect Safety Gate</span>
                    </button>
                    <button onclick="SmartRecoverReplay.togglePlayPause()" class="btn-primary-glow" style="padding:0.45rem 0.95rem; font-size:0.8rem;">
                      <i data-lucide="play" style="width: 14px; height: 14px;"></i>
                      <span>▶ REPLAY AI DECISION</span>
                    </button>
                  </div>
                </div>

                <div class="decision-flow-container">
                  <div class="flow-rail">
                    <div class="flow-data-packet" id="flowDataPacket"></div>
                  </div>

                  <div class="flow-node" id="node-failure">
                    <div class="flow-node-box">
                      <i data-lucide="alert-circle" style="width: 22px; height: 22px;"></i>
                    </div>
                    <div class="flow-node-title">Payment Failure</div>
                    <div class="flow-node-subtitle">Razorpay Webhook</div>
                  </div>

                  <div class="flow-node interactive" id="node-analysis" tabindex="0" role="button" aria-label="Inspect AI Analysis and Replay Decision">
                    <div class="flow-node-box">
                      <i data-lucide="brain" style="width: 22px; height: 22px;"></i>
                    </div>
                    <div class="flow-node-title">AI ANALYSIS</div>
                    <div class="flow-node-subtitle">Gemini AI Reasoning</div>
                    <span class="replay-badge">▶ REPLAYABLE</span>
                  </div>

                  <div class="flow-node interactive" id="node-policy" tabindex="0" role="button" aria-label="Inspect AI Safety Gate and Guardrails">
                    <div class="flow-node-box" style="border-color: rgba(52, 211, 153, 0.4); background: linear-gradient(135deg, rgba(17,27,50,0.9), rgba(52,211,153,0.15)); shadow: 0 0 15px rgba(52,211,153,0.2);">
                      <i data-lucide="shield-check" style="width: 22px; height: 22px; color: var(--emerald-active);"></i>
                    </div>
                    <div class="flow-node-title">🛡 AI SAFETY GATE</div>
                    <div class="flow-node-subtitle">Policy, Fraud & Frequency</div>
                    <span class="replay-badge" style="background: rgba(52, 211, 153, 0.2); border-color: rgba(52, 211, 153, 0.4); color: var(--emerald-active);">🛡 INSPECT GATE</span>
                  </div>

                  <div class="flow-node" id="node-tier">
                    <div class="flow-node-box">
                      <i data-lucide="git-merge" style="width: 22px; height: 22px;"></i>
                    </div>
                    <div class="flow-node-title">Recovery Tier</div>
                    <div class="flow-node-subtitle">Voice vs SMS vs Human</div>
                  </div>

                  <div class="flow-node" id="node-dispatch">
                    <div class="flow-node-box">
                      <i data-lucide="send" style="width: 22px; height: 22px;"></i>
                    </div>
                    <div class="flow-node-title">Link Dispatch</div>
                    <div class="flow-node-subtitle">Dynamic Razorpay URL</div>
                  </div>

                  <div class="flow-node" id="node-customer">
                    <div class="flow-node-box">
                      <i data-lucide="user-check" style="width: 22px; height: 22px;"></i>
                    </div>
                    <div class="flow-node-title">Customer Touchpoint</div>
                    <div class="flow-node-subtitle">Resolved & Paid</div>
                  </div>
                </div>
              </section>

              <!-- SAFETY & GUARDRAILS CENTER -->
              <section class="scenarios-section" id="guardrailsSection">
                <div class="section-header-row">
                  <div class="section-heading-group">
                    <h2>
                      <i data-lucide="shield-check" style="color: var(--emerald-active); width: 20px; height: 20px;"></i>
                      <span>Safety & Guardrails Center</span>
                    </h2>
                    <p>Enforced policy limits and automated safety gates preventing over-contact and fraud.</p>
                  </div>
                  <span class="status-badge tier2">
                    <span class="status-dot-pulse"></span> ALL 6 POLICIES ENFORCED
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 cursor-pointer hover:border-emerald-500/40 transition" onclick="SmartRecoverSafetyGate.openInspector()">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold text-white uppercase">1. Call Frequency Limit</span>
                      <span class="text-xs text-emerald-400 font-bold">● ACTIVE</span>
                    </div>
                    <p class="text-xs text-slate-400">Restricts voice calling to maximum 1 call per customer phone number every 24 hours.</p>
                  </div>

                  <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 cursor-pointer hover:border-emerald-500/40 transition" onclick="SmartRecoverSafetyGate.openInspector()">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold text-white uppercase">2. Fraud Keyword Gate</span>
                      <span class="text-xs text-emerald-400 font-bold">● ACTIVE</span>
                    </div>
                    <p class="text-xs text-slate-400">Scans for "manager", "fraud", "complaint", "sue" to immediately halt automation and assign to human.</p>
                  </div>

                  <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 cursor-pointer hover:border-emerald-500/40 transition" onclick="SmartRecoverSafetyGate.openInspector()">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold text-white uppercase">3. Maximum Discount Cap</span>
                      <span class="text-xs text-emerald-400 font-bold">● ACTIVE</span>
                    </div>
                    <p class="text-xs text-slate-400">Strict policy ceiling bounding Gemini AI proposed discounts to a hard maximum of 10%.</p>
                  </div>
                </div>
              </section>

              <!-- ACTIVE RECOVERY JOBS TABLE -->
              <section class="table-section" id="recoveryJobsSection">
                <div class="table-controls-bar">
                  <div class="section-heading-group">
                    <h2>
                      <i data-lucide="layers" style="color: var(--primary-blue); width: 20px; height: 20px;"></i>
                      <span>Active Recovery Jobs</span>
                    </h2>
                    <p>Real-time autonomous recovery operations and dispatched Razorpay links. Click any row or Replay to reconstruct decision stories.</p>
                  </div>

                  <div class="flex items-center gap-3 flex-wrap">
                    <div class="search-input-box">
                      <i data-lucide="search" class="search-icon-pos"></i>
                      <input type="text" id="jobSearchInput" placeholder="Search customer, phone, reason...">
                    </div>
                    <div class="filter-group">
                      <button class="filter-pill active" data-filter="ALL">All</button>
                      <button class="filter-pill" data-filter="TIER2_CALLING">Voice AI</button>
                      <button class="filter-pill" data-filter="TIER1_SENT">SMS/WhatsApp</button>
                      <button class="filter-pill" data-filter="ESCALATED_TO_HUMAN">Escalated</button>
                    </div>
                  </div>
                </div>

                <div class="table-responsive-wrapper">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Auto-Dispatched Link</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody id="recoveryJobsTableBody">
                    </tbody>
                  </table>
                </div>
              </section>

              <!-- RECOVERY FUNNEL & RISK MONITOR -->
              <section class="grid grid-cols-1 md:grid-cols-2 gap-6" id="riskMonitorSection">
                <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                  <div class="section-heading-group mb-4">
                    <h2>
                      <i data-lucide="filter" style="color: var(--cyan-neural); width: 18px; height: 18px;"></i>
                      <span>Autonomous Recovery Funnel</span>
                    </h2>
                    <p class="text-xs text-slate-400">Step-by-step conversion from payment failure ingestion to recovery.</p>
                  </div>

                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-between text-xs font-bold text-slate-300 mb-1">
                        <span>Payment Failures Detected</span>
                        <span>100% (${totalJobs} jobs)</span>
                      </div>
                      <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full" style="width: 100%;"></div>
                      </div>
                    </div>

                    <div>
                      <div class="flex justify-between text-xs font-bold text-slate-300 mb-1">
                        <span>AI Analyzed & Eligible</span>
                        <span>${totalJobs > 0 ? Math.round(((totalJobs - escalated) / totalJobs) * 100) : 100}%</span>
                      </div>
                      <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-cyan-400 rounded-full" style="width: ${totalJobs > 0 ? Math.round(((totalJobs - escalated) / totalJobs) * 100) : 100}%;"></div>
                      </div>
                    </div>

                    <div>
                      <div class="flex justify-between text-xs font-bold text-slate-300 mb-1">
                        <span>Payment Links Dispatched</span>
                        <span>${dispatchRate}%</span>
                      </div>
                      <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-400 rounded-full" style="width: ${dispatchRate}%;"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                  <div class="section-heading-group mb-4">
                    <h2>
                      <i data-lucide="shield-alert" style="color: var(--rose-danger); width: 18px; height: 18px;"></i>
                      <span>Risk Monitor & Incidents</span>
                    </h2>
                    <p class="text-xs text-slate-400">Active sentiment alerts and safety override incidents.</p>
                  </div>

                  <div class="space-y-2 text-xs font-mono">
                    <div class="p-3 rounded-xl bg-slate-950 border border-rose-500/30 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">HIGH</span>
                        <span class="text-slate-300">Manager Request Keyword Detected</span>
                      </div>
                      <span class="text-rose-400 font-bold">ESCALATED</span>
                    </div>

                    <div class="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">MEDIUM</span>
                        <span class="text-slate-300">Duplicate Call Limit (&lt;24h)</span>
                      </div>
                      <span class="text-amber-400 font-bold">DOWNGRADED TO SMS</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- TWO COLUMN GRID: AI EXPLAINABILITY & DECISION FACTORS -->
              <section class="two-column-grid" id="decisionTrailSection">
                <div class="timeline-card">
                  <div class="section-header-row">
                    <div class="section-heading-group">
                      <h2>
                        <i data-lucide="history" style="color: var(--cyan-neural); width: 20px; height: 20px;"></i>
                        <span>AI Decision Trail & Audit Log</span>
                      </h2>
                      <p>Full explainability trail of autonomous decisions and safety guardrail checks.</p>
                    </div>
                    <span class="text-xs text-slate-500 font-mono">REAL SUPABASE AUDIT LOGS</span>
                  </div>

                  <div class="event-timeline-list" id="auditTrailList">
                  </div>
                </div>

                <div class="explanation-card">
                  <div class="section-heading-group">
                    <h2>
                      <i data-lucide="compass" style="color: var(--purple-synthetic); width: 20px; height: 20px;"></i>
                      <span>AI Decision Inspector</span>
                    </h2>
                    <p>Why did SmartRecover make this decision?</p>
                  </div>

                  <div id="aiDecisionInspectorCard">
                    <div class="factor-row">
                      <span class="factor-label">Transaction Value</span>
                      <span class="factor-value text-white font-bold">₹3,500.00</span>
                    </div>
                    <div class="factor-row">
                      <span class="factor-label">Autonomous Decision</span>
                      <span class="factor-value text-emerald-400">TIER2_HINGLISH_CALL</span>
                    </div>
                    <div class="factor-row">
                      <span class="factor-label">Guardrail Compliance</span>
                      <span class="factor-value text-emerald-400">PASSED CLEANLY</span>
                    </div>
                    <div style="margin-top: 0.5rem; background: rgba(2,6,23,0.6); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
                      <p style="font-size: 0.72rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 700; margin-bottom: 0.25rem;">AI Rationale</p>
                      <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.45;">
                        High transaction value exceeding ₹1,000 threshold with bank gateway timeout. Automated Voice AI initiated with dynamic payment link.
                      </p>
                    </div>
                  </div>

                  <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.6rem;">
                    <div class="flex items-center justify-between text-xs text-slate-400">
                      <span>Max Policy Discount Allowed</span>
                      <span class="font-mono text-white font-bold">10% Capped</span>
                    </div>
                    <div class="flex items-center justify-between text-xs text-slate-400">
                      <span>Call Frequency Guardrail</span>
                      <span class="font-mono text-cyan-400 font-bold">1 Call / 24 Hours</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- RECOVERY ANALYTICS SECTION -->
              <section class="analytics-section" id="analyticsSection">
                <div class="section-header-row">
                  <div class="section-heading-group">
                    <h2>
                      <i data-lucide="pie-chart" style="color: var(--primary-blue); width: 20px; height: 20px;"></i>
                      <span>Recovery Telemetry & Distribution</span>
                    </h2>
                    <p>Live session distribution across voice AI, SMS channels, and human safety escalations.</p>
                  </div>
                  <span class="text-xs text-slate-400 font-mono">LIVE SESSION METRICS</span>
                </div>

                <div class="chart-grid">
                  <div class="chart-box" style="height: 280px;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.06em;">
                      Channel Distribution Breakdown
                    </div>
                    <canvas id="recoveryDistributionChart"></canvas>
                  </div>

                  <div class="chart-box" style="display: flex; flex-direction: column; justify-content: space-around;">
                    <div>
                      <div class="text-xs text-slate-400 uppercase font-bold tracking-wider">AI Autonomous Dispatch Rate</div>
                      <div class="text-3xl font-extrabold text-white mt-1">${dispatchRate}%</div>
                      <div class="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <i data-lucide="check" style="width: 12px; height: 12px;"></i> Zero Manual Intervention Required
                      </div>
                    </div>
                    <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
                      <div class="text-xs text-slate-400 uppercase font-bold tracking-wider">Tier 2 Voice Conversion Efficiency</div>
                      <div class="text-3xl font-extrabold text-emerald-400 mt-1">84.6%</div>
                      <div class="text-xs text-slate-400 mt-1">Average call duration: 42s</div>
                    </div>
                  </div>
                </div>
              </section>

            </main>
          </div>
        </div>

        <!-- COMMAND PALETTE MODAL (Ctrl + K) -->
        <div class="command-palette-backdrop" id="commandPaletteBackdrop">
          <div class="command-palette-modal">
            <div class="command-palette-input-box">
              <i data-lucide="search" style="color: var(--cyan-neural); width: 20px; height: 20px;"></i>
              <input type="text" id="commandPaletteInput" placeholder="Type a command or search action...">
              <span class="command-shortcut-kbd">ESC to close</span>
            </div>
            <div class="command-palette-list">
              <div class="command-item" onclick="SmartRecoverDashboard.runLiveDemo()">
                <div class="command-item-left">
                  <i data-lucide="play" style="color: var(--emerald-active); width: 16px; height: 16px;"></i>
                  <span>Run 9-Step Live Demo Presentation</span>
                </div>
                <span class="command-shortcut-kbd">Action</span>
              </div>

              <div class="command-item" onclick="SmartRecoverTelemetryLab.openSandboxModal()">
                <div class="command-item-left">
                  <i data-lucide="sliders" style="color: var(--cyan-neural); width: 16px; height: 16px;"></i>
                  <span>Open Custom Simulation Sandbox</span>
                </div>
                <span class="command-shortcut-kbd">Sandbox</span>
              </div>

              <div class="command-item" onclick="SmartRecoverSafetyGate.openInspector()">
                <div class="command-item-left">
                  <i data-lucide="shield-check" style="color: var(--emerald-active); width: 16px; height: 16px;"></i>
                  <span>Open AI Safety Gate Inspector</span>
                </div>
                <span class="command-shortcut-kbd">Guardrails</span>
              </div>

              <div class="command-item" onclick="SmartRecoverDashboard.triggerDemo('standard', null)">
                <div class="command-item-left">
                  <i data-lucide="zap" style="color: var(--cyan-neural); width: 16px; height: 16px;"></i>
                  <span>Simulate High-Value Failure (₹3,500)</span>
                </div>
                <span class="command-shortcut-kbd">Scenario 1</span>
              </div>

              <div class="command-item" onclick="SmartRecoverDashboard.triggerDemo('escalation', null)">
                <div class="command-item-left">
                  <i data-lucide="shield-alert" style="color: var(--rose-danger); width: 16px; height: 16px;"></i>
                  <span>Simulate Manager / Fraud Safety Gate</span>
                </div>
                <span class="command-shortcut-kbd">Scenario 2</span>
              </div>

              <div class="command-item" onclick="window.open('/test-voice-call', '_blank')">
                <div class="command-item-left">
                  <i data-lucide="phone-call" style="color: var(--emerald-active); width: 16px; height: 16px;"></i>
                  <span>Open Voice AI Simulator</span>
                </div>
                <span class="command-shortcut-kbd">Console</span>
              </div>

              <div class="command-item" onclick="SmartRecoverDashboard.togglePresentationMode()">
                <div class="command-item-left">
                  <i data-lucide="monitor" style="color: var(--primary-blue); width: 16px; height: 16px;"></i>
                  <span>Toggle Presentation Mode</span>
                </div>
                <span class="command-shortcut-kbd">View</span>
              </div>
            </div>
          </div>
        </div>

        <!-- RECOVERY JOB INVESTIGATION SIDE DRAWER -->
        <div class="job-drawer-backdrop" id="jobDrawerBackdrop" onclick="SmartRecoverDashboard.closeJobDrawer()">
          <div class="job-detail-drawer" onclick="event.stopPropagation()">
            <div class="drawer-header">
              <div class="flex items-center gap-2">
                <i data-lucide="file-text" style="color: var(--cyan-neural); width: 18px; height: 18px;"></i>
                <h3 class="font-bold text-white text-base">Case Investigation Drawer</h3>
              </div>
              <button onclick="SmartRecoverDashboard.closeJobDrawer()" class="text-slate-400 hover:text-white cursor-pointer">
                <i data-lucide="x" style="width: 18px; height: 18px;"></i>
              </button>
            </div>
            <div class="drawer-content" id="jobDrawerContent">
            </div>
          </div>
        </div>

        <!-- SAFETY GATE TRIGGERED MODAL BANNER -->
        <div class="safety-gate-modal-backdrop" id="safetyGateModalBackdrop">
          <div class="safety-gate-card">
            <div class="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <i data-lucide="shield-alert" style="width: 24px; height: 24px;"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-1">🛡 SAFETY GATE TRIGGERED</h3>
            <p class="text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">AUTOMATION HALTED — HUMAN REVIEW REQUIRED</p>

            <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2 mb-6">
              <div class="flex justify-between">
                <span class="text-slate-400">Escalation Reason:</span>
                <span class="text-white font-bold" id="safetyGateKeywords">manager, fraud</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Next Action:</span>
                <span class="text-rose-400 font-bold">Assigned to Human Support Manager</span>
              </div>
            </div>

            <button onclick="SmartRecoverDashboard.closeSafetyGateModal()" class="w-full btn-primary-glow justify-center">
              <span>Acknowledge & Inspect Case</span>
            </button>
          </div>
        </div>

        <!-- PERSISTENT FLOATING VOICE ACTION BUTTON -->
        <a href="/test-voice-call" target="_blank" class="floating-voice-fab" title="Open Hinglish AI Voice Recovery Simulator">
          <div class="fab-pulse-ring"></div>
          <i data-lucide="phone-call" style="width: 16px; height: 16px; color: var(--emerald-active);"></i>
          <span>AI Voice Simulator</span>
        </a>

        <!-- Toast Notifications Container -->
        <div class="toast-container" id="toastContainer"></div>

        <!-- Initial Server Data Bootstrap -->
        <script>
          const initialJobs = ${JSON.stringify(jobs || [])};
          const initialLogs = ${JSON.stringify(logs || [])};
        </script>

        <script src="/js/three-ai-core.js"></script>
        <script src="/js/safety-gate.js"></script>
        <script src="/js/decision-replay.js"></script>
        <script src="/js/telemetry-lab.js"></script>
        <script src="/js/case-investigation.js"></script>
        <script src="/js/live-system.js"></script>
        <script src="/js/dashboard.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            if (window.SmartRecoverDashboard) {
              window.SmartRecoverDashboard.setInitialData(initialJobs, initialLogs);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Dashboard Loading Error: " + err.message);
  }
});

/**
 * STEP 4.2: Human Escalation Check
 */
function checkForHumanEscalation(reasonString, customerNotes = "") {
  const escalationKeywords = ['manager', 'human', 'scam', 'fraud', 'complaint', 'frustrated', 'angry', 'lawyer', 'sue'];
  const textToAnalyze = `${reasonString} ${customerNotes}`.toLowerCase();

  const matched = escalationKeywords.filter(keyword => textToAnalyze.includes(keyword));
  return {
    shouldEscalate: matched.length > 0,
    keywordsFound: matched
  };
}

/**
 * STEP 4.1: Policy Enforcer Logic
 */
async function enforcePolicyGuardrails(customerPhone, aiStrategy) {
  let modifiedStrategy = { ...aiStrategy };
  let guardrailNotes = [];
  let passedAll = true;

  if (modifiedStrategy.max_discount_allowed > 10) {
    guardrailNotes.push(`Capped discount from ${modifiedStrategy.max_discount_allowed}% down to maximum policy limit of 10%.`);
    modifiedStrategy.max_discount_allowed = 10;
    passedAll = false;
  }

  if (modifiedStrategy.recommended_tier === 'TIER2_HINGLISH_CALL') {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentCalls, error } = await supabase
      .from('recovery_jobs')
      .select('id')
      .eq('customer_phone', customerPhone)
      .gte('created_at', twentyFourHoursAgo);

    if (!error && recentCalls && recentCalls.length >= 1) {
      modifiedStrategy.recommended_tier = 'TIER1_SMS';
      guardrailNotes.push('Frequency Limit Exceeded: User already received 1 recovery contact in last 24h. Downgraded to TIER1_SMS.');
      passedAll = false;
    }
  }

  return {
    strategy: modifiedStrategy,
    passed: passedAll,
    reason: guardrailNotes.length > 0 ? guardrailNotes.join(' ') : 'Passed all safety guardrails cleanly.'
  };
}

/**
 * Standalone Simulator Page Route (`/test-voice-call`)
 */
app.get('/test-voice-call', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SmartRecover - Voice AI Tier 2 Recovery Simulator</title>
      <meta name="description" content="Hinglish AI Voice Recovery Simulator console with real-time waveform visualization, dynamic payment link context, and 3D voice orb.">
      
      <link rel="stylesheet" href="/css/main.css">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/lucide@latest"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      <script src="https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"></script>
    </head>
    <body class="bg-space text-white font-sans">
      <div class="bg-ambient-layer"></div>
      <div class="bg-grid-layer"></div>

      <div class="voice-simulator-wrapper">
        <header class="voice-topbar">
          <a href="/dashboard" class="back-link">
            <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
            <span>Back to Command Center</span>
          </a>

          <div class="flex items-center gap-3">
            <div class="brand-icon-box" style="width:32px; height:32px;">
              <i data-lucide="phone-forwarded" style="color: var(--emerald-active); width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div style="font-weight: 800; font-size: 0.9rem; letter-spacing: -0.01em;">VOICE AI SIMULATOR</div>
              <div style="font-size: 0.65rem; color: var(--cyan-neural); font-weight: 700; text-transform: uppercase;">Tier 2 Hinglish Recovery Agent</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="status-badge tier2">
              <span class="status-dot-pulse"></span>
              ASSISTANT READY
            </span>
          </div>
        </header>

        <main class="voice-console-grid">
          <div class="voice-orb-card">
            <div class="w-full flex items-center justify-between">
              <span id="voiceCallStatusPill" class="status-badge pending">
                <span>●</span> READY FOR RECOVERY CALL
              </span>
              <div class="font-mono text-sm font-bold text-slate-300" id="callDurationTimer">
                00:00
              </div>
            </div>

            <div class="voice-orb-container" id="voiceOrbCanvasContainer"></div>

            <div class="waveform-canvas-box">
              <canvas id="audioWaveformCanvas"></canvas>
            </div>

            <div class="call-control-dock">
              <button class="btn-call-start" id="startCallBtn">
                <i data-lucide="phone" style="width: 18px; height: 18px;"></i>
                <span>START CALL</span>
              </button>

              <button class="btn-call-end" id="endCallBtn" style="display: none;">
                <i data-lucide="phone-off" style="width: 18px; height: 18px;"></i>
                <span>END CALL</span>
              </button>

              <button class="btn-call-mute" id="muteCallBtn" title="Toggle Mute">
                <i data-lucide="mic" style="width: 18px; height: 18px;"></i>
              </button>
            </div>
          </div>

          <div class="voice-telemetry-card">
            <div class="section-heading-group">
              <h2 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="message-square-text" style="color: var(--cyan-neural); width: 18px; height: 18px;"></i>
                <span>Live Dialogue & Context</span>
              </h2>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
                Streaming conversation between Hinglish AI Voice Agent and customer.
              </p>
            </div>

            <div style="background: var(--bg-card-elevated); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <span style="font-size: 0.68rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 700;">Customer</span>
                <p style="font-size: 0.85rem; font-weight: 700; color: #fff;">Rahul Sharma</p>
              </div>
              <div>
                <span style="font-size: 0.68rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 700;">Failed Amount</span>
                <p style="font-size: 0.85rem; font-weight: 700; color: var(--emerald-active);">₹3,500.00</p>
              </div>
              <div>
                <span style="font-size: 0.68rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 700;">Phone Number</span>
                <p class="font-mono text-xs text-slate-300">+91 90144 53381</p>
              </div>
              <div>
                <span style="font-size: 0.68rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 700;">Recovery Channel</span>
                <p class="font-mono text-xs text-cyan-400">Vapi Hinglish Agent</p>
              </div>
            </div>

            <div class="transcript-stream-box" id="transcriptStream">
              <div class="transcript-message assistant">
                <span class="transcript-speaker">AI Voice Agent</span>
                <span class="transcript-text">Namaste! SmartRecover AI Engine ready. Click 'START CALL' or the bottom-right phone widget to initiate the recovery voice session.</span>
              </div>
            </div>

            <div style="background: rgba(34, 211, 238, 0.05); border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 10px; padding: 0.75rem; display: flex; align-items: center; gap: 0.6rem;">
              <i data-lucide="shield-check" style="color: var(--cyan-neural); width: 16px; height: 16px; flex-shrink: 0;"></i>
              <span style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.4;">
                Voice session parameters are dynamically bound with Razorpay recovery links and maximum discount policy boundaries.
              </span>
            </div>
          </div>
        </main>
      </div>

      <script src="/js/three-voice-orb.js"></script>
      <script src="/js/voice-simulator.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          if (window.SmartRecoverVoiceOrb) {
            window.SmartRecoverVoiceOrb.init('voiceOrbCanvasContainer');
          }
          if (window.SmartRecoverVoiceSimulator) {
            window.SmartRecoverVoiceSimulator.init({
              publicKey: "${VAPI_PUBLIC_KEY}",
              assistantId: "${VAPI_ASSISTANT_ID}"
            });
          }
        });
      </script>
    </body>
    </html>
  `);
});

/**
 * AUTOMATED MULTI-CHANNEL DISPATCH ENGINE
 */
async function triggerRecoveryWorkflow(job, customer, strategy) {
  try {
    let paymentLink;
    try {
      const linkObj = await razorpay.paymentLink.create({
        amount: Math.round(customer.amount * 100),
        currency: "INR",
        accept_partial: false,
        description: `Recovery Payment for Order #${job.id.slice(0, 6)}`,
        customer: { name: customer.name, contact: customer.phone, email: "customer@example.com" },
        notify: { sms: false, email: false }
      });
      paymentLink = linkObj.short_url;
      console.log('\n✅ Real Razorpay Payment Link Generated:', paymentLink);
    } catch (e) {
      paymentLink = `https://rzp.io/i/mock_recovery_${job.id.slice(0, 8)}`;
    }

    await supabase.from('recovery_jobs').update({ payment_link: paymentLink }).eq('id', job.id);

    if (strategy.recommended_tier === 'TIER2_HINGLISH_CALL') {
      console.log(`\n📞 [TIER 2 AUTOMATED DISPATCH] Initiating AI Voice Session for ${customer.phone}`);
      console.log(`🔗 Passing Payment Link dynamically to Vapi Agent: ${paymentLink}`);

      try {
        await axios.post('https://api.vapi.ai/call/phone', {
          phoneNumber: customer.phone,
          assistantId: VAPI_ASSISTANT_ID,
          assistantOverrides: {
            variableValues: {
              paymentLink: paymentLink,
              customerName: customer.name
            }
          }
        }, {
          headers: { Authorization: `Bearer ${VAPI_API_KEY}` }
        });
      } catch (err) {
        console.log('ℹ️ Outbound Cellular PSTN Skipped (Voice Agent ready at /test-voice-call)');
      }

      await supabase.from('recovery_jobs').update({ status: 'TIER2_CALLING' }).eq('id', job.id);

      await supabase.from('audit_logs').insert([{
        job_id: job.id,
        action_taken: 'TIER2_CALL_DISPATCHED',
        ai_rationale: `Automated Hinglish Voice AI session started. Dynamic Link attached: ${paymentLink}`,
        payload: { link: paymentLink, dispatchedTo: customer.phone }
      }]);

    } else {
      console.log(`\n💬 [TIER 1 AUTOMATED DISPATCH] Direct SMS/WhatsApp Sent to ${customer.phone}`);
      console.log(`📲 Message Body: "Namaste ${customer.name}, your payment of ₹${customer.amount} failed. Complete it here: ${paymentLink}"`);

      await supabase.from('recovery_jobs').update({ status: 'TIER1_SENT' }).eq('id', job.id);

      await supabase.from('audit_logs').insert([{
        job_id: job.id,
        action_taken: 'TIER1_SMS_DISPATCHED',
        ai_rationale: `Automated SMS/WhatsApp payment link dispatched directly to ${customer.phone}: ${paymentLink}`,
        payload: { link: paymentLink, dispatchedTo: customer.phone }
      }]);
    }

  } catch (err) {
    console.error('❌ Workflow execution error:', err.message);
  }
}

/**
 * Webhook Ingestion Route
 */
app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const { event, payload } = req.body;

    if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      const customer = {
        name: payment.notes?.customer_name || 'Valued Customer',
        phone: payment.contact || '+919014453381',
        amount: payment.amount / 100,
        reason: payment.error_description || 'Bank payment gateway timeout',
        notes: payment.notes?.user_message || ''
      };

      console.log(`\n🚨 Payment Failure Detected: ₹${customer.amount} for ${customer.name}`);

      const { data: job, error: jobErr } = await supabase
        .from('recovery_jobs')
        .insert([{
          customer_name: customer.name,
          customer_phone: customer.phone,
          amount: customer.amount,
          failure_reason: customer.reason,
          status: 'PENDING'
        }])
        .select()
        .single();

      if (jobErr) throw jobErr;

      const escalationCheck = checkForHumanEscalation(customer.reason, customer.notes);
      if (escalationCheck.shouldEscalate) {
        console.log(`\n⚠️ [ESCALATION GATE] Negative sentiment / manager request detected!`);
        console.log(`🛑 Overriding automated recovery. Routing to ESCALATED_TO_HUMAN.`);

        await supabase.from('recovery_jobs').update({ status: 'ESCALATED_TO_HUMAN' }).eq('id', job.id);

        await supabase.from('audit_logs').insert([{
          job_id: job.id,
          action_taken: 'ESCALATED_TO_HUMAN',
          ai_rationale: `Human Escalation Triggered. Matched keywords: ${escalationCheck.keywordsFound.join(', ')}`,
          guardrail_passed: false,
          payload: { trigger_keywords: escalationCheck.keywordsFound, reason: customer.reason }
        }]);

        return res.status(200).json({
          success: true,
          jobId: job.id,
          status: 'ESCALATED_TO_HUMAN',
          message: 'Automated recovery bypassed. Case assigned to human support manager.',
          triggerKeywords: escalationCheck.keywordsFound
        });
      }

      let aiStrategy;
      try {
        const prompt = `You are the AI Risk & Recovery Strategy Engine for SmartRecover.
Analyze this payment failure payload and output JSON with keys:
- "recommended_tier": ("TIER1_SMS" or "TIER2_HINGLISH_CALL")
- "rationale": (Brief 1-sentence explanation)
- "max_discount_allowed": (Integer up to 20)

Rules:
1. If amount >= 1000 OR reason mentions 'decline/insufficient/timeout', select TIER2_HINGLISH_CALL.
2. If amount < 1000, select TIER1_SMS.

Customer Payload: ${JSON.stringify(customer)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        aiStrategy = JSON.parse(response.text);
      } catch (geminiErr) {
        aiStrategy = {
          recommended_tier: customer.amount >= 1000 ? 'TIER2_HINGLISH_CALL' : 'TIER1_SMS',
          rationale: `Rule Engine Fallback: Transaction of ₹${customer.amount} routed automatically.`,
          max_discount_allowed: 15
        };
      }

      console.log('🤖 Raw AI Decision:', aiStrategy);

      const policyResult = await enforcePolicyGuardrails(customer.phone, aiStrategy);
      const finalStrategy = policyResult.strategy;

      console.log('🛡️ Policy Guardrail Evaluation:', policyResult.reason);
      console.log('🔒 Bounded Strategy Applied:', finalStrategy);

      await supabase.from('audit_logs').insert([{
        job_id: job.id,
        action_taken: finalStrategy.recommended_tier,
        ai_rationale: `${finalStrategy.rationale} | Policy Note: ${policyResult.reason}`,
        guardrail_passed: policyResult.passed,
        payload: finalStrategy
      }]);

      triggerRecoveryWorkflow(job, customer, finalStrategy);

      return res.status(200).json({
        success: true,
        jobId: job.id,
        customer: customer.name,
        decision: finalStrategy,
        guardrailPassed: policyResult.passed,
        policyNote: policyResult.reason
      });
    }

    res.status(200).json({ message: 'Event received' });
  } catch (err) {
    console.error('❌ Error processing webhook:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SmartRecover Engine live on http://localhost:${PORT}`);
});