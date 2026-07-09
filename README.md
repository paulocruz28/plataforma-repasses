# 🏠 Plataforma de Repasses Imobiliários

Uma plataforma web completa, automatizada e fluida para o cadastro, busca, compartilhamento e fechamento de repasses imobiliários (ágios). O projeto elimina a desorganização de grupos de WhatsApp, centraliza leads, automatiza a emissão de minutas contratuais (Cessão de Direitos) e realiza a verificação eletrônica de certidões.

---

## 🛠️ Stack Tecnológica (Moderna e Standalone)

Este projeto foi construído do zero utilizando as tecnologias mais recomendadas e utilizadas na atualidade:

*   **Frontend (Interface do Usuário):** **React** + **TypeScript** + **Vite**
    *   Design system moderno com **glassmorphism**, transições suaves, Dark/Light Mode e responsividade total.
    *   Gerenciador de rotas via `react-router-dom` e ícones reativos com `lucide-react`.
    *   Controle de alertas via `ToastProvider` customizado.
*   **Backend (Servidor e APIs):** **Node.js** + **Express** + **TypeScript**
    *   Tipagem estática em toda a lógica de negócio de repasses, leads e contratos.
    *   Mapeamento dinâmico de caminhos para servir os arquivos estáticos de produção.
*   **Banco de Dados:** **PostgreSQL**
    *   Criação de tabelas e injeção automática de dados iniciais (seeding) de corretores e repasses configurada diretamente no boot do driver.
*   **Orquestração e Deploy:** **Docker** + **Docker Compose**
    *   Dockerfile *multi-stage* otimizado para compilar o React, compilar o Express em TS e unificar o container de execução com Node 20 Alpine.

---

## 📁 Estrutura do Projeto

```
projeto-repasses/
├── backend/                  # API Server (Node.js + Express + TS)
│   ├── controllers/          # Lógica das rotas (Repasses, Leads, Contratos)
│   ├── database/             # Driver de conexão pg e seeding automático
│   ├── package.json          # Script de dev (ts-node-dev) e dependências
│   ├── server.ts             # Inicialização e roteamento de arquivos estáticos
│   └── tsconfig.json         # Configuração de compilação do TypeScript
├── frontend/                 # Client App (React + TS + Vite)
│   ├── src/
│   │   ├── components/       # Componentes reusáveis (Header, Card, Toast)
│   │   ├── pages/            # Telas (Marketplace e Painel do Corretor)
│   │   ├── services/         # Cliente de API e Interfaces de Dados
│   │   ├── App.tsx           # Configuração de Rotas e Providers
│   │   └── main.tsx          # Ponto de entrada do React
│   ├── index.html            # Template HTML5 centralizado
│   └── vite.config.ts        # Proxy automático para `/api` em desenvolvimento
├── Dockerfile                # Dockerfile multi-stage unificado de produção
├── docker-compose.yml        # Orquestrador local (Postgres 15 + Web App)
└── README.md                 # Documentação principal
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
*   **Docker Desktop** instalado e em execução.

### Executando com um único comando:
1.  Na pasta raiz do projeto, execute:
    ```bash
    docker-compose up -d --build
    ```
2.  Aguarde a compilação do frontend e inicialização do banco.
3.  Acesse nos navegadores:
    *   **Portal Público:** [http://localhost:4000](http://localhost:4000)
    *   **Painel Administrativo/CRM:** [http://localhost:4000/admin](http://localhost:4000/admin)

*Nota: O banco Postgres local roda exposto na porta **5433** do seu computador para não conflitar com outros contêineres ativos.*

---

## 💼 Funcionalidades Implementadas

1.  **Marketplace de Repasses:**
    *   Filtros avançados combinados (quartos, varanda, bairro, valor da chave, saldo devedor e termos de busca).
    *   Geração automática de portfólios exclusivos para corretores através de parâmetros de URL (ex: `/?corretor=1`).
    *   Compartilhamento de repasse direto no WhatsApp do cliente com um clique, enviando o texto estruturado no formato tradicional de corretores.
2.  **CRM & Roleta de Leads:**
    *   Distribuição automática de novos leads na roleta via algoritmo **Round-Robin** (paloma, mariana, gabriel).
    *   Painel Kanban interativo para alteração de status (Novo, Não respondeu, Em negociação, Vendido).
    *   Cálculo automático de VGV total do corretor, comissão de 5% sobre chaves e taxa de administração de 1% (Paulo).
3.  **Automação Jurídica:**
    *   Validação mockada eletrônica de certidões municipais (SEFIN) e federais/cartórios (ONR) com resiliência contra timeout.
    *   Geração instantânea da minuta particular de Cessão de Direitos preenchida com os dados do comprador e do imóvel.
    *   Área preparada para impressão e salvamento em formato PDF.

---

## ☁️ Guia de Deploy no Render (Passo a Passo Detalhado)

Para colocar a plataforma online e disponível para uso real usando os serviços gratuitos do **Render.com**:

### Passo 1: Criar o Banco de Dados PostgreSQL no Render
1.  Acesse a sua conta no [Render](https://render.com) e clique em **New** > **PostgreSQL**.
2.  Preencha as informações:
    *   **Name:** `repasses-db`
    *   **Database:** `repasses_db`
    *   **Username:** `postgres`
    *   **Region:** Selecione a mais próxima (ex: `Oregon` ou `Ohio`).
3.  Clique em **Create Database**.
4.  Após a inicialização do banco, copie o valor do campo **Internal Database URL** (será usado para conectar a aplicação backend).

### Passo 2: Criar o Web Service no Render
1.  No painel do Render, clique em **New** > **Web Service**.
2.  Conecte a sua conta do GitHub e selecione o repositório `paulocruz28/plataforma-repasses`.
3.  Defina as configurações do serviço:
    *   **Name:** `plataforma-repasses`
    *   **Region:** A mesma do banco de dados.
    *   **Branch:** `main`
    *   **Root Directory:** Deixe em branco (o Render lerá a raiz do repositório).
    *   **Runtime:** Selecione **Docker** (o Render detectará e usará o nosso `Dockerfile` multi-stage automaticamente).
4.  Role até a seção de **Environment Variables** (Variáveis de Ambiente) e clique em **Add Environment Variable** para adicionar:
    *   `DATABASE_URL` = (Cole aqui a **Internal Database URL** copiada no Passo 1).
    *   `NODE_ENV` = `production`
    *   `PORT` = `3000` (A porta interna do container).
5.  Clique em **Create Web Service**.

O Render irá disparar o build do container Docker, baixando a imagem do Node 20, compilando o React, o TypeScript do Express e inicializando o serviço na nuvem de forma 100% automatizada!
