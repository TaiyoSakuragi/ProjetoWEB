# Frontend - ProjetoWEB

Interface web com fluxo de autenticacao e painel de monitoramento.

## Estrutura

- index.html: entrada estatica
- screens/login: tela de login
- screens/dashboard: dashboard principal

## Tecnologias

- HTML5
- CSS3
- JavaScript (ES Modules)
- Chart.js
- Leaflet + MarkerCluster

## Como executar

Execute um servidor estatico na raiz do monorepo:

```bash
cd /home/taiyo/documents/ProjetoWEB
python3 -m http.server 5500
```

Acesse:

- Login: http://127.0.0.1:5500/frontend/screens/login/index.html
- Dashboard: http://127.0.0.1:5500/frontend/screens/dashboard/index.html

## Integracao com backend

- API base atual: http://127.0.0.1:5000
- Configuracao em screens/dashboard/js/modules/config.js

## Funcionalidades

- Login com JWT
- Serie historica por estacao e variavel
- Resumo estatistico com unidades dinamicas
- Mapa interativo com estacoes numeradas
- Gestao de cadastros (estacao, localizacao, usuario)
