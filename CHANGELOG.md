# EFB Brasil — histórico de versões

## V1.3 — Cadastro local de aeródromos (estrutura de importação)
- Nova seção de busca de aeródromos por identificador ICAO ou nome.
- Importação local de CSV com validação de cabeçalho, identificador, coordenadas e duplicidade.
- Cada registro exige fonte e data de validade (`valid_from`); esses metadados aparecem na lista e no popup do mapa.
- Marcadores de aeródromos importados podem ser selecionados para centralizar o mapa.
- Modelo CSV vazio para preparar dados conferidos em fonte oficial.
- Nenhuma coordenada ou característica de aeródromo foi inventada ou pré-carregada.

## V1.2 — Waypoint / Direct To (protótipo)
- Cadastro de waypoints por latitude/longitude em graus decimais.
- Persistência local dos pontos no navegador/dispositivo.
- Seleção e ativação de pontos previamente salvos.
- Linha magenta de grande círculo aproximado entre a última posição GPS e o destino.
- Cálculo de distância aproximada em milhas náuticas e BRG TRUE inicial.
- Ocultação dos valores de rota quando o último fix ultrapassa 10 segundos.
- Avisos explícitos de que os cálculos não consideram declinação, vento, obstáculos, espaço aéreo ou procedimentos.

## V1.1 — Qualidade do GPS
- Indicador heurístico de precisão e idade do último fix.
- Identificação de dado antigo/desatualizado.
- Campo TRK separado de rumo magnético.

## V1.0 — Primeiro protótipo publicado pelo usuário
- Mapa-base online, localização do navegador, painel GPS e rastro de posição.
- Testado pelo usuário em seu iPhone.

## Próximo marco
- Testar a importação com um arquivo derivado de conjunto oficial do DECEA, depois de confirmar formato, ciclo AIRAC, campos e condições de uso.
- Em seguida, planejar atualização/expiração da base e camadas de pistas e auxílios, sem apresentar dados desatualizados como vigentes.
