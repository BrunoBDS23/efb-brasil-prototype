(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const status = $('gpsStatus');
  const speedEl = $('speed'), altitudeEl = $('altitude'), headingEl = $('heading');
  const latEl = $('lat'), lonEl = $('lon'), accEl = $('accuracy'), ageEl = $('age'), qualityEl = $('quality');
  const startBtn = $('startBtn'), followBtn = $('followBtn'), locateBtn = $('locateBtn'), clearBtn = $('clearTrailBtn');
  const waypointForm = $('waypointForm'), waypointNameInput = $('waypointName');
  const waypointLatInput = $('waypointLat'), waypointLonInput = $('waypointLon');
  const savedWaypointSelect = $('savedWaypoint'), activateSavedBtn = $('activateSavedBtn'), cancelRouteBtn = $('cancelRouteBtn');
  const routeStatus = $('routeStatus'), activeWaypointName = $('activeWaypointName');
  const routeDistance = $('routeDistance'), routeBearing = $('routeBearing');

  let watchId = null, lastFix = null, follow = true, trail = [], trailLine = null;
  let userMarker = null, accuracyCircle = null, destinationMarker = null, directLine = null;
  let activeWaypoint = null, toastTimer = null;
  const STORAGE_KEY = 'efb-brasil-waypoints-v1';

  const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-15.55, -54.0], 4);
  window.efbMap = map;
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(map);
  // OpenStreetMap standard tiles are an online reference basemap, not aeronautical charts.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  function notify(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4500);
  }

  function gpsState(text, active) {
    status.textContent = text;
    const dot = document.createElement('span');
    dot.className = 'dot';
    status.prepend(dot);
    status.style.color = active ? '#67e4a5' : '#f0b65e';
    dot.style.background = active ? '#67e4a5' : '#f0b65e';
  }

  function fmtCoord(value, pos, neg) {
    return `${Math.abs(value).toFixed(5)}° ${value >= 0 ? pos : neg}`;
  }

  function updateFixQuality(accuracy, ageSeconds) {
    let label = 'GPS OK', active = true;
    if (!Number.isFinite(accuracy) || accuracy < 0) label = 'PRECISÃO INDISPONÍVEL';
    else if (accuracy > 50) { label = 'PRECISÃO BAIXA'; active = false; }
    else if (accuracy > 15) label = 'GPS MODERADO';
    if (ageSeconds > 30) { label = 'GPS DESATUALIZADO'; active = false; }
    else if (ageSeconds > 10) { label = 'DADO ANTIGO'; active = false; }
    qualityEl.textContent = label;
    qualityEl.style.color = active ? '#67e4a5' : '#f0b65e';
    gpsState(label, active);
  }

  function loadWaypoints() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((point) => point && typeof point.id === 'string' &&
        typeof point.name === 'string' && Number.isFinite(point.lat) &&
        Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180);
    } catch (error) {
      console.warn('Não foi possível ler os waypoints salvos.', error);
      return [];
    }
  }

  let waypoints = loadWaypoints();

  function persistWaypoints() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(waypoints));
      return true;
    } catch (error) {
      notify('Não foi possível salvar neste dispositivo. Verifique o armazenamento do navegador.');
      console.warn(error);
      return false;
    }
  }

  function renderWaypoints() {
    savedWaypointSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = waypoints.length ? 'Selecione um waypoint' : 'Nenhum ponto salvo';
    savedWaypointSelect.append(placeholder);
    for (const point of waypoints) {
      const option = document.createElement('option');
      option.value = point.id;
      option.textContent = `${point.name} (${point.lat.toFixed(4)}, ${point.lon.toFixed(4)})`;
      savedWaypointSelect.append(option);
    }
    activateSavedBtn.disabled = waypoints.length === 0;
  }

  function parseCoordinate(value) {
    // Aceita graus decimais com ponto ou vírgula; não interpreta DMS nem hemisférios.
    const normalized = String(value).trim().replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
    return Number(normalized);
  }

  function haversineNm(from, to) {
    const rad = Math.PI / 180;
    const lat1 = from.lat * rad, lat2 = to.lat * rad;
    const dLat = (to.lat - from.lat) * rad;
    const dLon = (to.lon - from.lon) * rad;
    const rawA = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const a = Math.max(0, Math.min(1, rawA));
    const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusNm = 3440.065;
    return earthRadiusNm * centralAngle;
  }

  function initialTrueBearing(from, to) {
    const rad = Math.PI / 180;
    const lat1 = from.lat * rad, lat2 = to.lat * rad;
    const dLon = (to.lon - from.lon) * rad;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function greatCirclePoints(from, to, steps = 48) {
    const rad = Math.PI / 180;
    const lat1 = from.lat * rad, lon1 = from.lon * rad;
    const lat2 = to.lat * rad, lon2 = to.lon * rad;
    const vector1 = [Math.cos(lat1) * Math.cos(lon1), Math.cos(lat1) * Math.sin(lon1), Math.sin(lat1)];
    const vector2 = [Math.cos(lat2) * Math.cos(lon2), Math.cos(lat2) * Math.sin(lon2), Math.sin(lat2)];
    const dot = Math.max(-1, Math.min(1, vector1[0] * vector2[0] + vector1[1] * vector2[1] + vector1[2] * vector2[2]));
    const omega = Math.acos(dot);
    if (omega < 1e-9) return [[from.lat, from.lon], [to.lat, to.lon]];
    const sinOmega = Math.sin(omega);
    if (Math.abs(sinOmega) < 1e-8) return [[from.lat, from.lon], [to.lat, to.lon]];
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const a = Math.sin((1 - f) * omega) / sinOmega;
      const b = Math.sin(f * omega) / sinOmega;
      const x = a * vector1[0] + b * vector2[0];
      const y = a * vector1[1] + b * vector2[1];
      const z = a * vector1[2] + b * vector2[2];
      points.push([Math.atan2(z, Math.hypot(x, y)) / rad, Math.atan2(y, x) / rad]);
    }
    return points;
  }

  function showDestinationMarker() {
    if (!activeWaypoint) return;
    const latlng = [activeWaypoint.lat, activeWaypoint.lon];
    if (!destinationMarker) {
      destinationMarker = L.circleMarker(latlng, {
        radius: 9, color: '#ffffff', weight: 2, fillColor: '#e94cff', fillOpacity: 1
      }).addTo(map);
    } else {
      destinationMarker.setLatLng(latlng);
    }
    destinationMarker.bindTooltip(`DESTINO: ${activeWaypoint.name}`);
  }

  function updateRouteReadouts() {
    if (!activeWaypoint) {
      routeStatus.textContent = 'SEM DESTINO';
      activeWaypointName.textContent = '---';
      routeDistance.textContent = '---';
      routeBearing.textContent = '---';
      return;
    }

    activeWaypointName.textContent = activeWaypoint.name;
    showDestinationMarker();

    if (!lastFix) {
      routeStatus.textContent = 'AGUARDANDO GPS';
      routeDistance.textContent = '---';
      routeBearing.textContent = '---';
      return;
    }

    const ageSeconds = Math.max(0, (Date.now() - lastFix.timestamp) / 1000);
    if (ageSeconds > 10) {
      routeStatus.textContent = ageSeconds > 30 ? 'GPS DESATUALIZADO' : 'DADO ANTIGO';
      routeDistance.textContent = '---';
      routeBearing.textContent = '---';
      return;
    }

    const from = { lat: lastFix.coords.latitude, lon: lastFix.coords.longitude };
    const to = { lat: activeWaypoint.lat, lon: activeWaypoint.lon };
    routeDistance.textContent = haversineNm(from, to).toFixed(1);
    routeBearing.textContent = String(Math.round(initialTrueBearing(from, to))).padStart(3, '0');
    routeStatus.textContent = 'DIRECT TO ATIVO';

    const path = greatCirclePoints(from, to);
    if (!directLine) {
      directLine = L.polyline(path, { color: '#e94cff', weight: 3, opacity: 0.95, dashArray: '10 7' }).addTo(map);
    } else {
      directLine.setLatLngs(path);
    }
  }

  function activateWaypoint(point, fitRoute = true) {
    activeWaypoint = point;
    follow = false;
    followBtn.classList.remove('active');
    followBtn.textContent = 'LIVRE';
    if (directLine) { map.removeLayer(directLine); directLine = null; }
    showDestinationMarker();
    updateRouteReadouts();

    if (fitRoute) {
      if (lastFix) {
        const bounds = L.latLngBounds(
          [lastFix.coords.latitude, lastFix.coords.longitude],
          [point.lat, point.lon]
        );
        map.fitBounds(bounds, { padding: [42, 42], maxZoom: 11 });
      } else {
        map.setView([point.lat, point.lon], 9);
      }
    }
  }

  function handleFix(position) {
    const c = position.coords;
    const latlng = [c.latitude, c.longitude];
    lastFix = position;
    latEl.textContent = fmtCoord(c.latitude, 'N', 'S');
    lonEl.textContent = fmtCoord(c.longitude, 'E', 'W');
    accEl.textContent = Number.isFinite(c.accuracy) ? `±${Math.round(c.accuracy)} m` : '--';
    speedEl.textContent = Number.isFinite(c.speed) && c.speed >= 0 ? Math.round(c.speed * 1.943844).toString() : '---';
    altitudeEl.textContent = Number.isFinite(c.altitude) ? Math.round(c.altitude * 3.28084).toString() : '---';
    // Browser geolocation heading is course over ground (TRK), not magnetic heading.
    headingEl.textContent = Number.isFinite(c.heading) && c.heading >= 0 && Number.isFinite(c.speed) && c.speed > 1
      ? Math.round(c.heading).toString().padStart(3, '0') : '---';
    ageEl.textContent = 'AGORA';
    updateFixQuality(c.accuracy, 0);

    if (!userMarker) {
      userMarker = L.circleMarker(latlng, { radius: 8, color: '#07111c', weight: 3, fillColor: '#39c5ff', fillOpacity: 1 }).addTo(map).bindTooltip('POSIÇÃO GPS');
      accuracyCircle = L.circle(latlng, { radius: Math.max(Math.min(c.accuracy || 0, 5000), 10), color: '#39c5ff', weight: 1, fillOpacity: 0.08 }).addTo(map);
    } else {
      userMarker.setLatLng(latlng);
      accuracyCircle.setLatLng(latlng).setRadius(Math.max(Math.min(c.accuracy || 0, 5000), 10));
    }

    if (!trail.length || map.distance(trail[trail.length - 1], latlng) >= 10) {
      trail.push(L.latLng(latlng));
      if (!trailLine) trailLine = L.polyline(trail, { color: '#e94cff', weight: 4, opacity: 0.85 }).addTo(map);
      else trailLine.setLatLngs(trail);
    }
    if (follow) map.setView(latlng, Math.max(map.getZoom(), 12), { animate: true });
    updateRouteReadouts();
  }

  function handleError(err) {
    let message = 'Não foi possível obter localização.';
    if (err.code === 1) message = 'Permissão de localização negada. Verifique os ajustes do Safari.';
    if (err.code === 2) message = 'GPS/localização indisponível. Tente em local aberto.';
    if (err.code === 3) message = 'Tempo esgotado aguardando localização. Tente novamente.';
    qualityEl.textContent = 'SEM FIX';
    qualityEl.style.color = '#f0b65e';
    gpsState('GPS SEM FIX', false);
    updateRouteReadouts();
    notify(message);
  }

  waypointForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = waypointNameInput.value.trim();
    const lat = parseCoordinate(waypointLatInput.value);
    const lon = parseCoordinate(waypointLonInput.value);
    if (!name) { notify('Informe uma identificação para o waypoint.'); return; }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) { notify('Latitude inválida. Use graus decimais entre -90 e 90.'); return; }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) { notify('Longitude inválida. Use graus decimais entre -180 e 180.'); return; }

    const point = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, lat, lon };
    waypoints.push(point);
    const saved = persistWaypoints();
    if (!saved) waypoints.pop();
    renderWaypoints();
    if (saved) savedWaypointSelect.value = point.id;
    activateWaypoint(point);
    notify(saved
      ? `Waypoint ${name} salvo e selecionado.`
      : `Waypoint ${name} ativado nesta sessão, mas não foi salvo no dispositivo.`);
  });

  activateSavedBtn.addEventListener('click', () => {
    const point = waypoints.find((item) => item.id === savedWaypointSelect.value);
    if (!point) { notify('Selecione um waypoint salvo.'); return; }
    activateWaypoint(point);
  });

  cancelRouteBtn.addEventListener('click', () => {
    activeWaypoint = null;
    if (directLine) { map.removeLayer(directLine); directLine = null; }
    if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }
    updateRouteReadouts();
    notify('Destino ativo cancelado. Waypoints salvos foram mantidos.');
  });

  startBtn.addEventListener('click', () => {
    if (!('geolocation' in navigator)) { notify('Este navegador não oferece geolocalização.'); return; }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      startBtn.textContent = 'INICIAR GPS';
      gpsState('GPS PAUSADO', false);
      notify('Atualização GPS pausada.');
      return;
    }
    gpsState('BUSCANDO GPS', false);
    startBtn.textContent = 'PARAR GPS';
    watchId = navigator.geolocation.watchPosition(handleFix, handleError, {
      enableHighAccuracy: true, maximumAge: 1000, timeout: 20000
    });
  });

  followBtn.addEventListener('click', () => {
    follow = !follow;
    followBtn.classList.toggle('active', follow);
    followBtn.textContent = follow ? 'SEGUIR' : 'LIVRE';
    if (follow && lastFix) map.setView([lastFix.coords.latitude, lastFix.coords.longitude], Math.max(map.getZoom(), 12));
  });

  locateBtn.addEventListener('click', () => {
    if (lastFix) map.setView([lastFix.coords.latitude, lastFix.coords.longitude], 14);
    else notify('Inicie o GPS para obter sua posição.');
  });

  clearBtn.addEventListener('click', () => {
    trail = [];
    if (trailLine) { map.removeLayer(trailLine); trailLine = null; }
    notify('Rastro apagado desta sessão.');
  });

  // Refresh age and suppress route numbers when the last fix becomes stale.
  setInterval(() => {
    if (!lastFix) return;
    const seconds = Math.max(0, Math.floor((Date.now() - lastFix.timestamp) / 1000));
    ageEl.textContent = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
    updateFixQuality(lastFix.coords.accuracy, seconds);
    updateRouteReadouts();
  }, 1000);

  renderWaypoints();
  window.addEventListener('pagehide', () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('https')) {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker indisponível:', error));
  }
})();
