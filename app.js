(() => {
  const $ = (id) => document.getElementById(id);
  const status = $('gpsStatus'), speedEl = $('speed'), altitudeEl = $('altitude'), headingEl = $('heading');
  const latEl = $('lat'), lonEl = $('lon'), accEl = $('accuracy'), ageEl = $('age'), qualityEl = $('quality');
  const startBtn = $('startBtn'), followBtn = $('followBtn'), locateBtn = $('locateBtn'), clearBtn = $('clearTrailBtn');
  let watchId = null, lastFix = null, follow = true, trail = [], trailLine = null, userMarker = null, circle = null, toastTimer = null;

  const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-15.55, -54.0], 4);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(map);
  // OpenStreetMap standard tiles are online basemap only, not aeronautical charts.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  function notify(message) {
    const toast = $('toast'); toast.textContent = message; toast.style.display = 'block';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.style.display = 'none', 4500);
  }
  function gpsState(text, active) {
    status.innerHTML = `<span class="dot"></span> ${text}`;
    status.style.color = active ? '#67e4a5' : '#f0b65e';
    status.querySelector('.dot').style.background = active ? '#67e4a5' : '#f0b65e';
  }
  function fmtCoord(value, pos, neg) { return `${Math.abs(value).toFixed(5)}° ${value >= 0 ? pos : neg}`; }
  function handleFix(position) {
    const c = position.coords;
    const latlng = [c.latitude, c.longitude];
    lastFix = position;
    latEl.textContent = fmtCoord(c.latitude, 'N', 'S');
    lonEl.textContent = fmtCoord(c.longitude, 'E', 'W');
    accEl.textContent = Number.isFinite(c.accuracy) ? `±${Math.round(c.accuracy)} m` : '--';
    speedEl.textContent = Number.isFinite(c.speed) && c.speed >= 0 ? Math.round(c.speed * 1.943844).toString() : '---';
    altitudeEl.textContent = Number.isFinite(c.altitude) ? Math.round(c.altitude * 3.28084).toString() : '---';
    // Geolocation heading is course over ground (TRK), not magnetic heading.
    headingEl.textContent = Number.isFinite(c.heading) && c.heading >= 0 && c.speed > 1 ? Math.round(c.heading).toString().padStart(3, '0') : '---';
    ageEl.textContent = 'AGORA';
    updateFixQuality(c.accuracy, 0);
    if (!userMarker) {
      userMarker = L.circleMarker(latlng, { radius: 8, color: '#07111c', weight: 3, fillColor: '#39c5ff', fillOpacity: 1 }).addTo(map).bindTooltip('POSIÇÃO GPS');
      circle = L.circle(latlng, { radius: Math.max(Math.min(c.accuracy || 0, 5000), 10), color: '#39c5ff', weight: 1, fillOpacity: 0.08 }).addTo(map);
    } else {
      userMarker.setLatLng(latlng);
      circle.setLatLng(latlng).setRadius(Math.max(Math.min(c.accuracy || 0, 5000), 10));
    }
    // Add track points only after moving at least ~10m, to reduce noise.
    if (!trail.length || map.distance(trail[trail.length - 1], latlng) >= 10) {
      trail.push(L.latLng(latlng));
      if (!trailLine) trailLine = L.polyline(trail, { color: '#e94cff', weight: 4, opacity: 0.85 }).addTo(map);
      else trailLine.setLatLngs(trail);
    }
    if (follow) map.setView(latlng, Math.max(map.getZoom(), 12), { animate: true });
  }
  function updateFixQuality(accuracy, ageSeconds) {
    let label = 'GPS OK', active = true;
    if (!Number.isFinite(accuracy)) label = 'PRECISÃO INDISPONÍVEL';
    else if (accuracy > 50) { label = 'PRECISÃO BAIXA'; active = false; }
    else if (accuracy > 15) label = 'GPS MODERADO';
    if (ageSeconds > 30) { label = 'GPS DESATUALIZADO'; active = false; }
    else if (ageSeconds > 10) { label = 'DADO ANTIGO'; active = false; }
    qualityEl.textContent = label;
    qualityEl.style.color = active ? '#67e4a5' : '#f0b65e';
    gpsState(label, active);
  }
  function handleError(err) {
    let message = 'Não foi possível obter localização.';
    if (err.code === 1) message = 'Permissão de localização negada. Verifique os ajustes do Safari.';
    if (err.code === 2) message = 'GPS/localização indisponível. Tente em local aberto.';
    if (err.code === 3) message = 'Tempo esgotado aguardando localização. Tente novamente.';
    gpsState('GPS SEM FIX', false); qualityEl.textContent = 'SEM FIX'; qualityEl.style.color = '#f0b65e'; notify(message);
  }
  startBtn.addEventListener('click', () => {
    if (!('geolocation' in navigator)) { notify('Este navegador não oferece geolocalização.'); return; }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId); watchId = null;
      startBtn.textContent = 'INICIAR GPS'; gpsState('GPS OFF', false); notify('Atualização GPS pausada.'); return;
    }
    gpsState('BUSCANDO GPS', false); startBtn.textContent = 'PARAR GPS';
    watchId = navigator.geolocation.watchPosition(handleFix, handleError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  });
  followBtn.addEventListener('click', () => {
    follow = !follow; followBtn.classList.toggle('active', follow); followBtn.textContent = follow ? 'SEGUIR' : 'LIVRE';
    if (follow && lastFix) map.setView([lastFix.coords.latitude, lastFix.coords.longitude], Math.max(map.getZoom(), 12));
  });
  locateBtn.addEventListener('click', () => {
    if (lastFix) map.setView([lastFix.coords.latitude, lastFix.coords.longitude], 14);
    else notify('Inicie o GPS para obter sua posição.');
  });
  clearBtn.addEventListener('click', () => {
    trail = []; if (trailLine) { map.removeLayer(trailLine); trailLine = null; }
    notify('Rastro apagado desta sessão.');
  });
  // Age display: shows how old the last fix is, making stale data visible.
  setInterval(() => {
    if (!lastFix) return;
    const seconds = Math.max(0, Math.floor((Date.now() - lastFix.timestamp) / 1000));
    ageEl.textContent = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
    updateFixQuality(lastFix.coords.accuracy, seconds);
  }, 1000);
  window.addEventListener('pagehide', () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('https')) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
