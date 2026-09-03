/**
 * SMARTRECOVER - VOICE AI SIMULATOR CONTROLLER
 * Full integration with Vapi Web SDK, 3D Voice Orb sync, real-time waveform canvas,
 * call duration timer, and Hinglish conversation stream.
 */

window.SmartRecoverVoiceSimulator = (function () {
  let vapiClient = null;
  let isCallActive = false;
  let isMuted = false;
  let callTimerInterval = null;
  let callDurationSeconds = 0;
  let waveformAnimationId = null;
  let audioContext = null;
  let analyser = null;
  let dataArray = null;

  function init(config) {
    setupVapi(config);
    setupWaveformCanvas();
    setupControls();
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function setupVapi(config) {
    const publicKey = config.publicKey;
    const assistantId = config.assistantId;

    if (!publicKey || !assistantId) {
      console.warn('Vapi configuration missing keys');
      return;
    }

    // Initialize Vapi SDK from global script
    if (window.vapiSDK) {
      try {
        window.vapiSDK.run({
          apiKey: publicKey,
          assistant: assistantId,
          config: {
            position: "bottom-right",
            offset: "24px",
            width: "56px",
            height: "56px",
            idle: {
              icon: "https://unpkg.com/lucide-static@0.321.0/icons/phone.svg",
              color: "rgb(16, 185, 129)"
            },
            loading: { color: "rgb(234, 179, 8)" },
            active: {
              icon: "https://unpkg.com/lucide-static@0.321.0/icons/phone-off.svg",
              color: "rgb(239, 68, 68)"
            }
          }
        });
      } catch (err) {
        console.warn('Vapi SDK auto-run notice:', err);
      }
    }

    // Listen to Vapi window events if emitted
    window.addEventListener('vapi-call-start', () => onCallStarted());
    window.addEventListener('vapi-call-end', () => onCallEnded());
    window.addEventListener('vapi-speech-start', () => onSpeechStarted());
    window.addEventListener('vapi-speech-end', () => onSpeechEnded());
    window.addEventListener('vapi-message', (e) => onMessageReceived(e.detail));
  }

  function setupControls() {
    const startBtn = document.getElementById('startCallBtn');
    const endBtn = document.getElementById('endCallBtn');
    const muteBtn = document.getElementById('muteCallBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        // Trigger the Vapi widget button or custom call start
        const vapiBtn = document.querySelector('.vapi-btn') || document.querySelector('[data-vapi-btn]');
        if (vapiBtn) {
          vapiBtn.click();
        } else {
          // Manual fallback simulated flow
          simulateCallStart();
        }
      });
    }

    if (endBtn) {
      endBtn.addEventListener('click', () => {
        const vapiBtn = document.querySelector('.vapi-btn') || document.querySelector('[data-vapi-btn]');
        if (vapiBtn) {
          vapiBtn.click();
        } else {
          simulateCallEnd();
        }
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.style.color = isMuted ? 'var(--rose-danger)' : 'var(--text-main)';
        muteBtn.style.borderColor = isMuted ? 'var(--rose-danger)' : 'var(--border-medium)';
        appendTranscript('System', isMuted ? 'Microphone muted' : 'Microphone unmuted');
      });
    }
  }

  function simulateCallStart() {
    onCallConnecting();
    setTimeout(() => {
      onCallStarted();
      appendTranscript('AI Voice Agent', 'Namaste Rahul ji! Main SmartRecover se baat kar rahi hoon. Aapka ₹3,500 ka payment bank server issue ki wajah se fail ho gaya tha. Kya main aapko instant discount ke saath secure link send karoon?');
    }, 1200);
  }

  function simulateCallEnd() {
    onCallEnded();
    appendTranscript('AI Voice Agent', 'Dhanyavaad! Maine aapke WhatsApp pe updated payment link share kar diya hai. Have a wonderful day!');
  }

  function onCallConnecting() {
    const statusEl = document.getElementById('voiceCallStatusPill');
    if (statusEl) {
      statusEl.className = 'status-badge';
      statusEl.style.background = 'var(--amber-surface)';
      statusEl.style.color = 'var(--amber-warning)';
      statusEl.style.border = '1px solid var(--amber-border)';
      statusEl.innerHTML = '<span class="status-dot-pulse" style="background: var(--amber-warning);"></span> CONNECTING...';
    }

    if (window.SmartRecoverVoiceOrb) {
      window.SmartRecoverVoiceOrb.setState('CONNECTING');
    }
  }

  function onCallStarted() {
    isCallActive = true;
    callDurationSeconds = 0;

    const startBtn = document.getElementById('startCallBtn');
    const endBtn = document.getElementById('endCallBtn');
    const statusEl = document.getElementById('voiceCallStatusPill');

    if (startBtn) startBtn.style.display = 'none';
    if (endBtn) endBtn.style.display = 'inline-flex';

    if (statusEl) {
      statusEl.className = 'status-badge tier2';
      statusEl.innerHTML = '<span class="status-dot-pulse"></span> LIVE CALL IN PROGRESS';
    }

    if (window.SmartRecoverVoiceOrb) {
      window.SmartRecoverVoiceOrb.setState('CALLING');
    }

    startTimer();
    startWaveformAnimation();
  }

  function onCallEnded() {
    isCallActive = false;
    stopTimer();
    stopWaveformAnimation();

    const startBtn = document.getElementById('startCallBtn');
    const endBtn = document.getElementById('endCallBtn');
    const statusEl = document.getElementById('voiceCallStatusPill');

    if (startBtn) startBtn.style.display = 'inline-flex';
    if (endBtn) endBtn.style.display = 'none';

    if (statusEl) {
      statusEl.className = 'status-badge pending';
      statusEl.innerHTML = '<span>●</span> READY FOR RECOVERY CALL';
    }

    if (window.SmartRecoverVoiceOrb) {
      window.SmartRecoverVoiceOrb.setState('ENDED');
      setTimeout(() => {
        if (!isCallActive) window.SmartRecoverVoiceOrb.setState('READY');
      }, 2500);
    }
  }

  function onSpeechStarted() {
    if (window.SmartRecoverVoiceOrb) {
      window.SmartRecoverVoiceOrb.setAudioLevel(0.85);
    }
  }

  function onSpeechEnded() {
    if (window.SmartRecoverVoiceOrb) {
      window.SmartRecoverVoiceOrb.setAudioLevel(0.15);
    }
  }

  function onMessageReceived(msg) {
    if (!msg) return;
    if (msg.role === 'assistant' && msg.content) {
      appendTranscript('AI Voice Agent', msg.content);
    } else if (msg.role === 'user' && msg.content) {
      appendTranscript('Customer', msg.content);
    }
  }

  function appendTranscript(speaker, text) {
    const stream = document.getElementById('transcriptStream');
    if (!stream) return;

    const isAssistant = speaker.toLowerCase().includes('agent') || speaker.toLowerCase().includes('ai');
    const msgEl = document.createElement('div');
    msgEl.className = `transcript-message ${isAssistant ? 'assistant' : 'user'}`;
    msgEl.innerHTML = `
      <span class="transcript-speaker">${speaker}</span>
      <span class="transcript-text">${text}</span>
    `;

    stream.appendChild(msgEl);
    stream.scrollTop = stream.scrollHeight;
  }

  // Timer Management
  function startTimer() {
    const timerEl = document.getElementById('callDurationTimer');
    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
      callDurationSeconds++;
      const mins = String(Math.floor(callDurationSeconds / 60)).padStart(2, '0');
      const secs = String(callDurationSeconds % 60).padStart(2, '0');
      if (timerEl) timerEl.innerText = `${mins}:${secs}`;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(callTimerInterval);
  }

  // Waveform Canvas Visualizer
  function setupWaveformCanvas() {
    const canvas = document.getElementById('audioWaveformCanvas');
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth || 500;
    canvas.height = 60;
  }

  function startWaveformAnimation() {
    const canvas = document.getElementById('audioWaveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let step = 0;

    function draw() {
      if (!isCallActive) return;
      waveformAnimationId = requestAnimationFrame(draw);
      step += 0.08;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numBars = 48;
      const barWidth = canvas.width / numBars;

      for (let i = 0; i < numBars; i++) {
        const height = Math.abs(Math.sin(step + i * 0.25) * Math.cos(step * 0.5 + i * 0.1)) * 38 + 4;
        const x = i * barWidth + barWidth * 0.15;
        const y = (canvas.height - height) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, '#22D3EE');
        gradient.addColorStop(0.5, '#34D399');
        gradient.addColorStop(1, '#60A5FA');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * 0.7, height);
      }
    }

    draw();
  }

  function stopWaveformAnimation() {
    if (waveformAnimationId) {
      cancelAnimationFrame(waveformAnimationId);
    }
    const canvas = document.getElementById('audioWaveformCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return {
    init,
    onCallStarted,
    onCallEnded
  };
})();
