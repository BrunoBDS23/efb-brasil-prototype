# EFB Brasil — protótipo V1 (PWA)

**Escopo desta versão:** mapa base online, geolocalização do navegador, velocidade/altitude reportadas pelo dispositivo, coordenadas, precisão, idade do último fix e rastro de posição.

## Importante / segurança
- Este protótipo **não é um EFB operacional**, não é certificado e não deve ser usado para navegação aérea.
- O fundo de mapa é OpenStreetMap padrão, **não carta aeronáutica**.
- Os dados de GPS do celular podem ser imprecisos, atrasados, indisponíveis ou não representarem sensores de aeronave.
- Cartas, NOTAM, AIP, procedimentos e informações oficiais devem ser consultados no AISWEB/DECEA e nos canais apropriados. Nunca substitua instrumentos, briefing ou fontes oficiais por este protótipo.
- O mapa usa tiles online e o código shell possui cache básico. **Não há mapa offline nesta versão**; tiles, Leaflet CDN e a localização do browser podem depender de conexão/serviços.

## Arquivos
- `index.html`: estrutura e dependências do mapa.
- `style.css`: visual cockpit escuro e responsivo.
- `app.js`: Leaflet, geolocation, instrumentos e rastro.
- `manifest.webmanifest`: instalação PWA.
- `sw.js`: cache básico do shell (não cacheia tiles).

## Como testar pelo iPhone (sem Mac)
1. Publique estes arquivos em um host HTTPS (por exemplo, GitHub Pages).
2. Abra o URL publicado no Safari do iPhone.
3. Toque em **INICIAR GPS** e autorize localização durante o uso.
4. Teste em ambiente aberto e parado; compare a posição com outra fonte apenas para fins experimentais.
5. Safari: Compartilhar → **Adicionar à Tela de Início** para criar um ícone de acesso.

## Próxima etapa sugerida
Adicionar controle de qualidade de GPS (exibir precisão, rejeitar fixes muito antigos e explicar quando velocidade/heading não estão disponíveis), depois planejar waypoints e rota manual. Não integrar cartas oficiais até avaliar formatos, licença, atualização e requisitos de segurança.


## V1.1 — Qualidade e idade do GPS

- Indicador qualitativo de precisão: OK (≤15 m), moderado (15–50 m), baixa (>50 m).
- Indicador de idade do fix: dado antigo (>10 s) e desatualizado (>30 s).
- Campo de direção renomeado para TRK (trajetória sobre o solo); não representa rumo magnético.
- Círculo de precisão visual limitado para evitar uma escala exagerada no mapa.

Esses limites são heurísticos do protótipo, não critérios de segurança/certificação aeronáutica.
