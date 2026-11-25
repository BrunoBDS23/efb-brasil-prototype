/* EFB Brasil V1.3 — importação local de cadastro de aeródromos.
   Não contém dados aeronáuticos pré-carregados. O usuário deve obter e conferir dados oficiais. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'efb-brasil-aerodromes-v1';
  const required = ['icao','name','latitude','longitude','source','valid_from'];
  let records = [];
  let layer = null;
  const mapRef = window.efbMap;
  const fileInput = $('aerodromeFile');
  const searchInput = $('aerodromeSearch');
  const list = $('aerodromeList');
  const status = $('aerodromeStatus');

  function setStatus(message, error = false) {
    status.textContent = message;
    status.style.color = error ? '#ffb36b' : '#67e4a5';
  }
  function parseCSV(text) {
    const rows = []; let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (quoted) throw new Error('CSV contém aspas sem fechamento.');
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ''));
  }
  function normalizeRows(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('O arquivo precisa ter cabeçalho e pelo menos um registro.');
    const headers = rows.shift().map(h => h.trim().toLowerCase());
    const missing = required.filter(h => !headers.includes(h));
    if (missing.length) throw new Error(`Colunas obrigatórias ausentes: ${missing.join(', ')}`);
    if (rows.length > 10000) throw new Error('Limite de 10.000 registros por importação.');
    const seen = new Set();
    return rows.map((values, index) => {
      const raw = Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]));
      const latitude = Number(raw.latitude), longitude = Number(raw.longitude);
      if (!raw.icao || !raw.name || !raw.source || !raw.valid_from) throw new Error(`Linha ${index + 2}: ICAO, nome, fonte e valid_from são obrigatórios.`);
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error(`Linha ${index + 2}: coordenadas inválidas.`);
      const icao = raw.icao.toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(icao)) throw new Error(`Linha ${index + 2}: identificador deve ter 4 caracteres.`);
      if (seen.has(icao)) throw new Error(`Identificador duplicado no arquivo: ${icao}.`);
      seen.add(icao);
      return { icao, name: raw.name, latitude, longitude,
        elevation_ft: raw.elevation_ft ? Number(raw.elevation_ft) : null,
        runways: raw.runways || '', frequencies: raw.frequencies || '',
        source: raw.source, valid_from: raw.valid_from };
    });
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); return true; }
    catch { setStatus('Falha ao salvar. Armazenamento local indisponível.', true); return false; }
  }
  function render() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const filtered = records.filter(r => `${r.icao} ${r.name}`.toLowerCase().includes(q));
    list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('p'); empty.className = 'airport-empty';
      empty.textContent = records.length ? 'Nenhum aeródromo corresponde à busca.' : 'Nenhum dado importado. Use um arquivo preparado a partir de fonte oficial.';
      list.append(empty);
    }
    filtered.slice(0, 100).forEach(r => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'airport-item';
      const title = document.createElement('strong'); title.textContent = `${r.icao} · ${r.name}`;
      const detail = document.createElement('small'); detail.textContent = `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)} · fonte: ${r.source} · válido desde: ${r.valid_from}`;
      button.append(title, detail);
      button.addEventListener('click', () => {
        if (!mapRef) return;
        mapRef.setView([r.latitude, r.longitude], 11);
        if (layer) layer.eachLayer(marker => {
          if (marker.options.icao === r.icao) marker.openPopup();
        });
      });
      list.append(button);
    });
    $('aerodromeCount').textContent = `${records.length} REGISTROS`;
    if (layer && mapRef) mapRef.removeLayer(layer);
    if (mapRef) {
      layer = L.layerGroup();
      records.forEach(r => {
        const marker = L.circleMarker([r.latitude, r.longitude], { radius: 5, color: '#9fe7ff', weight: 2, fillColor: '#11648b', fillOpacity: .9 });
        marker.options.icao = r.icao;
        const popup = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = `${r.icao} · ${r.name}`;
        const meta = document.createElement('div'); meta.textContent = `Elevação: ${r.elevation_ft ?? 'não informada'} ft | Fonte: ${r.source} | Validade: ${r.valid_from}`;
        popup.append(name, meta); marker.bindPopup(popup); marker.addTo(layer);
      });
      layer.addTo(mapRef);
    }
  }
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0]; if (!file) return;
    try {
      const imported = normalizeRows(await file.text());
      const previous = records; records = imported;
      if (!save()) { records = previous; return; }
      render(); setStatus(`${records.length} aeródromos importados. Confira fonte e ciclo antes de qualquer uso.`);
    } catch (error) { setStatus(error.message || 'Erro ao importar CSV.', true); }
    fileInput.value = '';
  });
  searchInput.addEventListener('input', render);
  $('downloadAirportTemplate').addEventListener('click', () => {
    const csv = 'icao,name,latitude,longitude,elevation_ft,runways,frequencies,source,valid_from\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'efb-aerodromos-modelo.csv'; a.click(); URL.revokeObjectURL(url);
  });
  $('clearAerodromes').addEventListener('click', () => {
    if (!confirm('Apagar todos os aeródromos importados deste dispositivo?')) return;
    records = []; save(); render(); setStatus('Cadastro local apagado.');
  });
  records = load(); render();
  if (records.length) setStatus(`${records.length} registros locais carregados; validade deve ser conferida.`);
  else setStatus('Aguardando importação de dados oficiais.');
})();
