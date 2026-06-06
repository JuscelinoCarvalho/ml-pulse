# ML Pulse

Sistema de análise de dados do Mercado Livre, similar ao Joom Pulse.
Hospedado em servidor Linux próprio, acesso gratuito via autenticação por e-mail (OTP).

## Stack
- Backend: Python 3.12 + FastAPI (porta 8000)
- Frontend: React + TypeScript + Vite + Tailwind CSS (porta 3000)
- Banco: PostgreSQL 16
- Cache: Redis 7
- Deploy: Docker Compose

## Módulos implementados (v1)
- Auth por e-mail (OTP de 6 dígitos, JWT access+refresh)
- OAuth Mercado Livre (tokens criptografados com Fernet)
- Pesquisa e análise de produtos (preço, concorrência, opportunity score)
- Dashboard de vendas (faturamento, pedidos, top produtos, reputação seller)

## Roadmap v2
- Análise de concorrentes (monitorar vendedores específicos)
- Alertas por e-mail (mudança de preço, novo concorrente)
- Gestão de anúncios e sugestões de otimização
- Multi-conta ML
- Exportação CSV/Excel

## Subir o ambiente
docker compose up -d

## URLs locais
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs
- Mailpit: http://localhost:8025