# ProjetoWEB

Monorepo com backend em Flask e frontend web para monitoramento de estacoes meteorologicas.

## Estrutura

- backend: API REST, regras de negocio e acesso ao banco
- frontend: telas de login e dashboard (HTML, CSS, JS)

## Requisitos

- Python 3.11+
- PostgreSQL com extensao PostGIS

## Como rodar (local)

1. Suba o backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask run --host=0.0.0.0 --port=5000
```

2. Suba o frontend estatico (em outro terminal)

```bash
cd /home/taiyo/documents/ProjetoWEB
python3 -m http.server 5500
```

3. Abra no navegador

- Login: http://127.0.0.1:5500/frontend/screens/login/index.html
- Dashboard: http://127.0.0.1:5500/frontend/screens/dashboard/index.html

## Observacoes

- O frontend usa API base em http://127.0.0.1:5000.
- Para detalhes do backend, veja backend/README.md.
- Para detalhes da interface, veja frontend/README.md.
