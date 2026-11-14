// ==========================================================
// ANTONYMAT PWA - Física MRU (1ro BGU)
// Colegio Vicente Rocafuerte | Autor: José Pulla
// ==========================================================

(function () {
  'use strict';

  // 1. REGISTRO OFFLINE SERVICE WORKER (Compatible con Web y APK/WebView)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Silencioso en entornos file:// o WebView empaquetado
    });
  }

  // Botón de instalación PWA
  let deferredPrompt = null;
  const btnInstall = document.getElementById('btn-install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.classList.remove('hidden');
  });

  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.classList.add('hidden');
  });

  // 2. NAVEGACIÓN POR PESTAÑAS
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // 3. SIMULADOR INTERACTIVO MRU (HTML5 CANVAS)
  const simCanvas = document.getElementById('sim-canvas');
  const ctx = simCanvas.getContext('2d');
  const xtCanvas = document.getElementById('graph-xt');
  const xtCtx = xtCanvas.getContext('2d');
  const vtCanvas = document.getElementById('graph-vt');
  const vtCtx = vtCanvas.getContext('2d');

  const inputX0 = document.getElementById('input-x0');
  const inputV = document.getElementById('input-v');
  const lblX0 = document.getElementById('lbl-x0');
  const lblV = document.getElementById('lbl-v');
  const vehicleSelect = document.getElementById('vehicle-select');
  const chkStrobo = document.getElementById('chk-stroboscope');

  const valT = document.getElementById('val-t');
  const valX = document.getElementById('val-x');
  const valDx = document.getElementById('val-dx');
  const valV = document.getElementById('val-v');
  const liveEq = document.getElementById('live-equation');

  let state = {
    x0: 0,
    v: 10,
    t: 0,
    running: false,
    lastFrame: null,
    history: [{ t: 0, x: 0, v: 10 }],
    marks: [{ t: 0, x: 0 }]
  };

  const TRACK_MIN = -20;
  const TRACK_MAX = 120;

  function posToCanvasX(meters) {
    const pad = 45;
    const usable = simCanvas.width - pad * 2;
    return pad + ((meters - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * usable;
  }

  function updateEquationBanner() {
    const sign = state.v >= 0 ? '+' : '-';
    liveEq.innerHTML = `Ecuación horaria: <strong>x(t) = ${state.x0} m ${sign} (${Math.abs(state.v)} m/s) · t</strong>`;
  }

  function resetSimulation() {
    state.running = false;
    state.t = 0;
    state.lastFrame = null;
    state.x0 = parseFloat(inputX0.value);
    state.v = parseFloat(inputV.value);
    state.history = [{ t: 0, x: state.x0, v: state.v }];
    state.marks = [{ t: 0, x: state.x0 }];
    lblX0.textContent = `${state.x0} m`;
    lblV.textContent = `${state.v} m/s`;
    updateEquationBanner();
    renderAll();
  }

  inputX0.addEventListener('input', resetSimulation);
  inputV.addEventListener('input', resetSimulation);
  vehicleSelect.addEventListener('change', renderAll);
  chkStrobo.addEventListener('change', renderAll);

  document.getElementById('btn-play').addEventListener('click', () => {
    if (!state.running) {
      state.running = true;
      state.lastFrame = performance.now();
      requestAnimationFrame(loop);
    }
  });

  document.getElementById('btn-pause').addEventListener('click', () => {
    state.running = false;
    state.lastFrame = null;
  });

  document.getElementById('btn-reset').addEventListener('click', resetSimulation);

  function loop(now) {
    if (!state.running) return;
    const dt = Math.min((now - state.lastFrame) / 1000, 0.05);
    state.lastFrame = now;
    state.t += dt;

    const currentX = state.x0 + state.v * state.t;
    state.history.push({ t: state.t, x: currentX, v: state.v });

    const wholeSec = Math.floor(state.t);
    if (wholeSec > state.marks.length - 1) {
      state.marks.push({ t: wholeSec, x: state.x0 + state.v * wholeSec });
    }

    if (currentX >= TRACK_MAX || currentX <= TRACK_MIN || state.t >= 15) {
      state.running = false;
    }

    renderAll();
    if (state.running) requestAnimationFrame(loop);
  }

  function drawTrack() {
    const w = simCanvas.width;
    const h = simCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Cielo e institución
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, w, 145);
    ctx.fillStyle = '#0a2540';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('PISTA DE EXPERIMENTACIÓN MRU — COLEGIO VICENTE ROCAFUERTE', 18, 24);

    // Carretera
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 145, w, 55);
    ctx.strokeStyle = '#f5b700';
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 172);
    ctx.lineTo(w, 172);
    ctx.stroke();
    ctx.setLineDash([]);

    // Regla graduada
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 200, w, 30);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';

    for (let m = TRACK_MIN; m <= TRACK_MAX; m += 10) {
      const px = posToCanvasX(m);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, 200);
      ctx.lineTo(px, 208);
      ctx.stroke();
      ctx.fillText(`${m}m`, px, 222);
    }
    ctx.textAlign = 'left';

    // Marcas cada segundo
    if (chkStrobo.checked) {
      state.marks.forEach((mk) => {
        const mx = posToCanvasX(mk.x);
        ctx.fillStyle = 'rgba(245, 183, 0, 0.85)';
        ctx.beginPath();
        ctx.arc(mx, 140, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a2540';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${mk.t}s`, mx - 7, 130);
      });
    }

    // Móvil
    const currentX = state.x0 + state.v * state.t;
    const vx = posToCanvasX(currentX);
    const icons = { car: '🚗', metro: '🚌', runner: '🏃' };
    ctx.font = '38px serif';
    ctx.textAlign = 'center';
    ctx.fillText(icons[vehicleSelect.value] || '🚗', vx, 165);
    ctx.textAlign = 'left';

    // Telemetría
    valT.textContent = `${state.t.toFixed(2)} s`;
    valX.textContent = `${currentX.toFixed(2)} m`;
    valDx.textContent = `${(currentX - state.x0).toFixed(2)} m`;
    valV.textContent = `${state.v.toFixed(1)} m/s`;
  }

  function drawGraph(canvas, gCtx, yKey, minY, maxY, color, unitLabel) {
    const w = canvas.width;
    const h = canvas.height;
    const pad = 36;
    gCtx.clearRect(0, 0, w, h);

    // Ejes
    gCtx.strokeStyle = '#64748b';
    gCtx.lineWidth = 1.5;
    gCtx.beginPath();
    gCtx.moveTo(pad, 15);
    gCtx.lineTo(pad, h - pad);
    gCtx.lineTo(w - 15, h - pad);
    gCtx.stroke();

    gCtx.fillStyle = '#475569';
    gCtx.font = '11px sans-serif';
    gCtx.fillText(unitLabel, 6, 18);
    gCtx.fillText('t (s)', w - 35, h - 10);

    if (state.history.length < 2) return;

    gCtx.strokeStyle = color;
    gCtx.lineWidth = 2.5;
    gCtx.beginPath();
    state.history.forEach((pt, idx) => {
      const px = pad + (pt.t / 15) * (w - pad - 20);
      const normY = (pt[yKey] - minY) / (maxY - minY);
      const py = h - pad - normY * (h - pad - 20);
      if (idx === 0) gCtx.moveTo(px, py);
      else gCtx.lineTo(px, py);
    });
    gCtx.stroke();
  }

  function renderAll() {
    drawTrack();
    drawGraph(xtCanvas, xtCtx, 'x', -30, 130, '#144272', 'x (m)');
    drawGraph(vtCanvas, vtCtx, 'v', -25, 35, '#d97706', 'v (m/s)');
  }

  // 4. TEORÍA Y CONVERSOR
  const triInfo = {
    d: '<strong>d = v · t</strong> — Multiplica la velocidad constante por el tiempo transcurrido.',
    v: '<strong>v = d / t</strong> — Divide la distancia recorrida entre el tiempo empleado.',
    t: '<strong>t = d / v</strong> — Divide la distancia recorrida entre la velocidad del móvil.'
  };

  document.querySelectorAll('.tri-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tri-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('triangle-output').innerHTML = triInfo[btn.dataset.var];
    });
  });

  const convKmh = document.getElementById('conv-kmh');
  const convMs = document.getElementById('conv-ms');

  convKmh.addEventListener('input', () => {
    const val = parseFloat(convKmh.value);
    convMs.value = isNaN(val) ? '' : (val / 3.6).toFixed(2);
  });

  convMs.addEventListener('input', () => {
    const val = parseFloat(convMs.value);
    convKmh.value = isNaN(val) ? '' : (val * 3.6).toFixed(2);
  });

  // 5. CALCULADORA PASO A PASO
  const calcTarget = document.getElementById('calc-target');
  const calcInputs = document.getElementById('calc-inputs');
  const calcSolution = document.getElementById('calc-solution');

  function renderCalcFields() {
    const target = calcTarget.value;
    if (target === 'd') {
      calcInputs.innerHTML = `
        <div class="field">
          <label>Velocidad (v)</label>
          <input type="number" id="c-v" value="20" step="any" />
        </div>
        <div class="field">
          <label>Unidad de velocidad</label>
          <select id="c-v-unit"><option value="ms">m/s</option><option value="kmh">km/h</option></select>
        </div>
        <div class="field">
          <label>Tiempo (t)</label>
          <input type="number" id="c-t" value="15" step="any" />
        </div>
        <div class="field">
          <label>Unidad de tiempo</label>
          <select id="c-t-unit"><option value="s">segundos (s)</option><option value="min">minutos (min)</option><option value="h">horas (h)</option></select>
        </div>`;
    } else if (target === 'v') {
      calcInputs.innerHTML = `
        <div class="field">
          <label>Distancia (d)</label>
          <input type="number" id="c-d" value="300" step="any" />
        </div>
        <div class="field">
          <label>Unidad de distancia</label>
          <select id="c-d-unit"><option value="m">metros (m)</option><option value="km">kilómetros (km)</option></select>
        </div>
        <div class="field">
          <label>Tiempo (t)</label>
          <input type="number" id="c-t" value="15" step="any" />
        </div>
        <div class="field">
          <label>Unidad de tiempo</label>
          <select id="c-t-unit"><option value="s">segundos (s)</option><option value="min">minutos (min)</option><option value="h">horas (h)</option></select>
        </div>`;
    } else {
      calcInputs.innerHTML = `
        <div class="field">
          <label>Distancia (d)</label>
          <input type="number" id="c-d" value="400" step="any" />
        </div>
        <div class="field">
          <label>Unidad de distancia</label>
          <select id="c-d-unit"><option value="m">metros (m)</option><option value="km">kilómetros (km)</option></select>
        </div>
        <div class="field">
          <label>Velocidad (v)</label>
          <input type="number" id="c-v" value="20" step="any" />
        </div>
        <div class="field">
          <label>Unidad de velocidad</label>
          <select id="c-v-unit"><option value="ms">m/s</option><option value="kmh">km/h</option></select>
        </div>`;
    }
  }

  calcTarget.addEventListener('change', renderCalcFields);
  renderCalcFields();

  document.getElementById('btn-solve').addEventListener('click', () => {
    const target = calcTarget.value;
    const toMeters = (val, u) => (u === 'km' ? val * 1000 : val);
    const toMs = (val, u) => (u === 'kmh' ? val / 3.6 : val);
    const toSec = (val, u) => (u === 'min' ? val * 60 : u === 'h' ? val * 3600 : val);

    if (target === 'd') {
      const vRaw = parseFloat(document.getElementById('c-v').value);
      const vUnit = document.getElementById('c-v-unit').value;
      const tRaw = parseFloat(document.getElementById('c-t').value);
      const tUnit = document.getElementById('c-t-unit').value;
      const v = toMs(vRaw, vUnit);
      const t = toSec(tRaw, tUnit);
      const d = v * t;
      calcSolution.innerHTML = `
        <strong>Paso 1 (Conversión al SI):</strong> v = ${v.toFixed(2)} m/s, t = ${t.toFixed(2)} s<br>
        <strong>Paso 2 (Fórmula):</strong> d = v · t<br>
        <strong>Paso 3 (Sustitución):</strong> d = (${v.toFixed(2)} m/s) · (${t.toFixed(2)} s)<br>
        <strong>Paso 4 (Resultado):</strong> <code>d = ${d.toFixed(2)} m</code> (${(d / 1000).toFixed(3)} km)`;
    } else if (target === 'v') {
      const dRaw = parseFloat(document.getElementById('c-d').value);
      const dUnit = document.getElementById('c-d-unit').value;
      const tRaw = parseFloat(document.getElementById('c-t').value);
      const tUnit = document.getElementById('c-t-unit').value;
      const d = toMeters(dRaw, dUnit);
      const t = toSec(tRaw, tUnit);
      if (t <= 0) return (calcSolution.innerHTML = 'El tiempo debe ser mayor que cero.');
      const v = d / t;
      calcSolution.innerHTML = `
        <strong>Paso 1 (Conversión al SI):</strong> d = ${d.toFixed(2)} m, t = ${t.toFixed(2)} s<br>
        <strong>Paso 2 (Fórmula):</strong> v = d / t<br>
        <strong>Paso 3 (Sustitución):</strong> v = ${d.toFixed(2)} m / ${t.toFixed(2)} s<br>
        <strong>Paso 4 (Resultado):</strong> <code>v = ${v.toFixed(2)} m/s</code> (${(v * 3.6).toFixed(2)} km/h)`;
    } else {
      const dRaw = parseFloat(document.getElementById('c-d').value);
      const dUnit = document.getElementById('c-d-unit').value;
      const vRaw = parseFloat(document.getElementById('c-v').value);
      const vUnit = document.getElementById('c-v-unit').value;
      const d = toMeters(dRaw, dUnit);
      const v = toMs(vRaw, vUnit);
      if (v <= 0) return (calcSolution.innerHTML = 'La velocidad debe ser mayor que cero.');
      const t = d / v;
      calcSolution.innerHTML = `
        <strong>Paso 1 (Conversión al SI):</strong> d = ${d.toFixed(2)} m, v = ${v.toFixed(2)} m/s<br>
        <strong>Paso 2 (Fórmula):</strong> t = d / v<br>
        <strong>Paso 3 (Sustitución):</strong> t = ${d.toFixed(2)} m / ${v.toFixed(2)} m/s<br>
        <strong>Paso 4 (Resultado):</strong> <code>t = ${t.toFixed(2)} s</code> (${(t / 60).toFixed(2)} min)`;
    }
  });

  // 6. GENERADOR DE EJERCICIOS Y CERTIFICADO (PERSISTENCIA LOCALSTORAGE)
  const STORAGE_KEY = 'antonymat_vr_mru_v1';
  let progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"correct":0,"total":0,"streak":0,"name":""}');
  let currentProblem = null;
  let answeredCurrent = false;

  const studentInput = document.getElementById('student-name');
  studentInput.value = progress.name || '';
  studentInput.addEventListener('input', () => {
    progress.name = studentInput.value;
    saveProgress();
  });

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    document.getElementById('score-correct').textContent = progress.correct;
    document.getElementById('score-total').textContent = progress.total;
    document.getElementById('score-streak').textContent = progress.streak;
  }

  function generateProblem() {
    answeredCurrent = false;
    document.getElementById('quiz-answer').value = '';
    const fb = document.getElementById('quiz-feedback');
    fb.classList.add('hidden');

    const type = Math.floor(Math.random() * 4);
    const v = Math.floor(Math.random() * 20) + 5; // 5..24 m/s
    const t = Math.floor(Math.random() * 25) + 4; // 4..28 s
    const d = v * t;

    if (type === 0) {
      currentProblem = {
        q: `Una unidad de la Metrovía circula por la Av. Quito con velocidad constante de ${v} m/s durante ${t} s. ¿Qué distancia recorre?`,
        ans: d,
        unit: 'm',
        exp: `d = v · t = ${v} m/s · ${t} s = ${d} m`
      };
    } else if (type === 1) {
      currentProblem = {
        q: `Un atleta del Colegio Vicente Rocafuerte recorre ${d} m en línea recta empleando ${t} s. Calcula su velocidad media en m/s.`,
        ans: v,
        unit: 'm/s',
        exp: `v = d / t = ${d} m / ${t} s = ${v} m/s`
      };
    } else if (type === 2) {
      currentProblem = {
        q: `Un ciclista mantiene una velocidad constante de ${v} m/s. ¿Cuánto tiempo tarda en recorrer ${d} m?`,
        ans: t,
        unit: 's',
        exp: `t = d / v = ${d} m / ${v} m/s = ${t} s`
      };
    } else {
      const kmh = v * 3.6;
      currentProblem = {
        q: `Un automóvil viaja a ${kmh.toFixed(1)} km/h con MRU durante ${t} s. ¿Qué distancia en metros recorre?`,
        ans: d,
        unit: 'm',
        exp: `Primero v = ${kmh.toFixed(1)} / 3.6 = ${v} m/s. Luego d = ${v} · ${t} = ${d} m`
      };
    }

    document.getElementById('quiz-tag').textContent = `Ejercicio #${progress.total + 1}`;
    document.getElementById('quiz-question').textContent = currentProblem.q;
    document.getElementById('quiz-unit').textContent = currentProblem.unit;
  }

  document.getElementById('btn-check-quiz').addEventListener('click', () => {
    if (answeredCurrent) return;
    const userVal = parseFloat(document.getElementById('quiz-answer').value);
    if (isNaN(userVal)) return;

    answeredCurrent = true;
    progress.total += 1;
    const fb = document.getElementById('quiz-feedback');
    fb.classList.remove('hidden', 'ok', 'err');

    if (Math.abs(userVal - currentProblem.ans) <= 0.15) {
      progress.correct += 1;
      progress.streak += 1;
      fb.classList.add('ok');
      fb.innerHTML = `✅ ¡Excelente! Respuesta correcta: ${currentProblem.exp}`;
    } else {
      progress.streak = 0;
      fb.classList.add('err');
      fb.innerHTML = `❌ Incorrecto. Desarrollo: ${currentProblem.exp}`;
    }
    saveProgress();
  });

  document.getElementById('btn-next-quiz').addEventListener('click', generateProblem);

  document.getElementById('btn-print-cert').addEventListener('click', () => {
    const cert = document.getElementById('certificate-preview');
    const name = (studentInput.value || 'ESTUDIANTE DE 1RO BGU').trim();
    const pct = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
    document.getElementById('cert-student-name').textContent = name;
    document.getElementById('cert-stats').textContent = `Ejercicios resueltos: ${progress.correct} de ${progress.total} (${pct}% de efectividad)`;
    document.getElementById('cert-date').textContent = `Fecha: ${new Date().toLocaleDateString('es-EC')}`;
    cert.classList.remove('hidden');
    window.print();
  });

  document.getElementById('btn-reset-progress').addEventListener('click', () => {
    progress = { correct: 0, total: 0, streak: 0, name: studentInput.value };
    saveProgress();
    generateProblem();
  });

  // Inicialización
  saveProgress();
  resetSimulation();
  generateProblem();
})();
