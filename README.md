# EFB Brasil — protótipo V1.3

Protótipo educacional para desenvolvimento de interface, mapa, GPS, waypoints e estrutura de cadastro aeronáutico. Não é certificado, aprovado nem destinado a conduzir voo.

## Publicação no GitHub Pages (Windows 11)
1. Faça backup do repositório.
2. Extraia este pacote e substitua os arquivos do site pelos arquivos desta pasta.
3. Envie também `aerodromes.js` e `aerodromos-modelo.csv`.
4. Faça commit na branch publicada pelo GitHub Pages e aguarde o deploy.
5. No iPhone, abra o endereço no Safari e recarregue. Se a PWA mantiver a versão anterior, feche-a e abra primeiro o endereço no Safari.

## Cadastro local de aeródromos
A V1.3 não inclui uma base aeronáutica inventada nem consulta uma API automaticamente. A API AISWEB exige credenciais solicitadas ao DECEA. Para começar, use o GeoAISWEB/AISWEB para obter os dados e confirmar o formato, o ciclo e as condições de utilização. Prepare um CSV com as colunas abaixo (a ordem pode variar):

`icao,name,latitude,longitude,elevation_ft,runways,frequencies,source,valid_from`

- `icao`: identificador de quatro caracteres.
- `name`: nome oficial do aeródromo.
- `latitude` e `longitude`: graus decimais WGS84; sul e oeste normalmente negativos no Brasil.
- `elevation_ft`: elevação em pés (opcional; deixe vazio se não confirmada).
- `runways` e `frequencies`: texto descritivo opcional, sem substituir a consulta à publicação vigente.
- `source`: identificação da publicação/conjunto oficial e, se possível, edição/ciclo.
- `valid_from`: data de início de validade no formato AAAA-MM-DD ou identificação clara do ciclo AIRAC.

O botão “IMPORTAR CSV” substitui o conjunto local inteiro após validação. Faça backup do arquivo de origem; armazenamento do navegador pode ser apagado. Não misture ciclos diferentes. O app exibe fonte e validade, mas não consegue confirmar sozinho se o dado continua vigente.

## Fontes oficiais para obtenção e conferência
- AISWEB: https://aisweb.decea.mil.br/
- GEOAISWEB: https://geoaisweb.decea.mil.br/
- Solicitação de acesso à API AISWEB: https://aisweb.decea.mil.br/?i=publicacoes&p=api

O DECEA informa que a API pode disponibilizar cartas, AIP, ROTAER, NOTAM, meteorologia e outros serviços; o acesso requer solicitação de chave. O GEOAISWEB informa disponibilização de dados vetoriais em formatos como KML/SHP e geosserviços. Não se deve presumir que o arquivo baixado tenha diretamente o cabeçalho CSV deste protótipo: a conversão deve preservar significado, unidades, datum, fonte e ciclo.

## Limitações de segurança
- O mapa de fundo é OpenStreetMap e não é carta aeronáutica.
- O cadastro importado é uma ferramenta local de consulta experimental, sem garantia de completude, integridade ou atualização automática.
- Não usar este protótipo para navegação operacional, separação, seleção de pista ou decisão de segurança.
- Consultar sempre AIP, ROTAER, cartas vigentes, NOTAM, METAR/TAF e briefing oficiais aplicáveis, além dos instrumentos aprovados e procedimentos do operador.
- Nenhuma certificação ou conformidade regulatória é alegada.
