# Knowledge Base

Esta pasta contém os diretórios de cada sistema criado na plataforma.

## Estrutura

Cada sistema tem seu próprio diretório nomeado com o slug do sistema:
- `sistema-exemplo/` - Diretório para o sistema "Sistema Exemplo"
- `servidor-web/` - Diretório para o sistema "Servidor Web"

## Uso

Os diretórios são criados automaticamente quando um sistema é adicionado.
Aqui serão armazenados ficheiros relacionados a cada sistema específico.

## Como funciona

1. **Criação automática**: Quando um sistema é criado, um slug único é gerado a partir do nome
2. **Slug único**: O slug é garantido como único na base de dados
3. **Diretório correspondente**: Um diretório com o nome do slug é criado automaticamente
4. **Gestão automática**: O diretório é renomeado se o sistema for renomeado, e removido se o sistema for apagado

## Formato do Slug

- Apenas letras minúsculas, números e hífens
- Não pode começar ou terminar com hífen
- Máximo 50 caracteres
- Gerado automaticamente a partir do nome do sistema

Exemplos:
- "Servidor Web Principal" → `servidor-web-principal`
- "DB MySQL Produção" → `db-mysql-producao`
- "API Gateway" → `api-gateway`

---
*Pasta criada automaticamente pelo sistema*