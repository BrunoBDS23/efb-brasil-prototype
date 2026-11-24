# EFB Brasil — protótipo V1.2 (PWA)

**Novidade V1.2:** cadastro local de waypoints em graus decimais, seleção de ponto salvo e função experimental DIRECT TO com linha geodésica de referência, distância em NM e bearing inicial verdadeiro (BRG TRUE).

## Como atualizar no GitHub Pages
1. Faça backup do repositório atual.
2. Extraia o conteúdo deste pacote.
3. Substitua no repositório os arquivos `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest` e `README.md`.
4. Faça commit na branch publicada pelo GitHub Pages.
5. No iPhone, abra o endereço no Safari. Aguarde a atualização do site; se continuar vendo a versão anterior, feche a PWA, abra o endereço no Safari e recarregue. A chave de cache foi alterada para `v1.2`.

## Como usar o waypoint
1. Inicie o GPS e aguarde um fix recente.
2. Em WAYPOINT / DIRECT TO, informe uma identificação e latitude/longitude em **graus decimais**. Exemplo de formato: `-15.55000` e `-54.00000`. O campo aceita vírgula decimal, mas não graus/minutos/segundos nem letras N/S/E/W.
3. Toque em **SALVAR E ATIVAR DIRECT TO**. O ponto fica salvo no armazenamento local deste navegador/dispositivo.
4. A linha magenta é uma representação geométrica de referência. DISTÂNCIA usa fórmula de Haversine com raio médio da Terra; BRG TRUE é o azimute inicial verdadeiro calculado a partir do último fix.
5. Para ativar outro ponto salvo, selecione-o e toque em ATIVAR. CANCELAR DESTINO remove a rota ativa, mas mantém os pontos salvos.

## Limitações importantes
- Este é um protótipo educacional e **não é um EFB operacional, certificado ou aprovado para navegação aérea**.
- O fundo é OpenStreetMap padrão, não carta aeronáutica.
- BRG TRUE não é proa magnética. Não há correção de declinação magnética, vento, deriva, performance, obstáculos, terreno, espaços aéreos, NOTAM, procedimentos ou restrições.
- A distância é grande-círculo aproximada entre coordenadas; não é distância de rota operacional nem previsão de tempo.
- Coordenadas dependem do GPS/browser e podem estar imprecisas, atrasadas ou indisponíveis. Se o fix tiver mais de 10 segundos, os valores de rota são ocultados.
- Waypoints ficam em `localStorage` do navegador e podem ser apagados pelo sistema ou pelo usuário; não há sincronização nem backup nesta versão.
- O shell básico é armazenado em cache, mas os tiles do mapa e as bibliotecas Leaflet via CDN não são baixados para uso offline. Esta versão **não tem mapa offline**.
- Para operação real, consultar sempre fontes oficiais e vigentes do DECEA/AISWEB, cartas/publicações aplicáveis, briefing, NOTAM e instrumentos aprovados. Este protótipo não os substitui.

## Arquivos
- `index.html`: interface.
- `style.css`: estilo cockpit responsivo.
- `app.js`: GPS, rastro, persistência local, cálculo e exibição de waypoint.
- `manifest.webmanifest`: metadados PWA.
- `sw.js`: cache básico do shell; não armazena tiles nem CDN.

## Próxima etapa sugerida
Adicionar edição/exclusão de pontos, validação reforçada e testes de cálculo com casos conhecidos; depois avaliar importação de dados oficiais de aeródromos brasileiros, respeitando formato, licença, ciclo de atualização e integridade dos dados.
