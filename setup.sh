#!/bin/bash
set -e

echo "=== ML Pulse - Setup ==="

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "ATENÇÃO: Arquivo .env criado. Edite-o antes de continuar:"
  echo "  - SECRET_KEY e FERNET_KEY (gere com os comandos comentados no arquivo)"
  echo "  - ML_CLIENT_ID e ML_CLIENT_SECRET (do portal de devs do ML)"
  echo "  - Configurações de SMTP para e-mail"
  echo ""
  read -p "Pressione ENTER após configurar o .env..."
fi

echo "Iniciando containers..."
docker compose up -d --build

echo ""
echo "=== ML Pulse rodando! ==="
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API docs:  http://localhost:8000/docs"
echo "  Mailpit:   http://localhost:8025 (e-mails de desenvolvimento)"
