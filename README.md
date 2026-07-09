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

---

## 🎨 Layout Premium & Ajustes de UI/UX (Melhorias de Design)

Para entregar uma experiência de uso profissional e fluida, o design foi totalmente otimizado seguindo referências de ponta do mercado de corretagem (estilo "Mapa dos Imóveis"):

1. **Tema Claro Padrão (Light Mode):**
   * O site agora inicializa por padrão em um tema claro, limpo e profissional, utilizando tons de azul vibrante nos botões principais e painéis com cantos arredondados de sombras suaves. O seletor de tema continua disponível no cabeçalho.
2. **Organização Horizontal de Anúncios (Grid de Repasses):**
   * Os cards de anúncio se organizam de forma elegante lado a lado usando CSS Grid (`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`), se ajustando dinamicamente a celulares, tablets e computadores.
3. **Painel do Corretor com Sidebar Lateral (Navegação Premium):**
   * A navegação superior simples foi substituída por uma **Barra Lateral Esquerda (Sidebar)** no painel `/admin`, com botões maiores e ícones reativos (`lucide-react`).
4. **Foto de Perfil e Nome de Exibição (Avatar):**
   * O cabeçalho exibe no canto superior direito um avatar circular com a foto do corretor logado (ou sua inicial de nome caso esteja sem imagem), garantindo um visual personalizado ao corretor ativo.

---

## 🔒 Segurança e Autenticação

Para proteger as informações do CRM e emissão de minutas, a área administrativa agora exige autenticação:
* **Autenticação Stateless (JWT):** Geração de tokens Web JSON válidos por 7 dias, armazenados no local storage do navegador e injetados nos headers da API.
* **Criptografia de Senhas (bcryptjs):** Hash de senhas unidirecional seguro no banco de dados.
* **Código de Acesso para Cadastros:** O cadastro de novos corretores parceiros exige a chave administrativa de segurança `REPASSES2026`.
* **Edição de Perfil:** Na aba **Meu Perfil**, o corretor pode alterar seu nome, escolher seu nome de exibição, alterar telefone de contato ou atualizar sua senha com upload de fotos de perfil de até 1MB convertidas em Base64.

---

## 🏗️ Gerenciamento de Imóveis (CRUD de Repasses)

Os corretores agora possuem controle total sobre as oportunidades que publicam na plataforma através da aba **Meus Imóveis**:
* **Listagem Consolidada:** Tabela contendo miniatura do imóvel, título, bairro, valor da chave, saldo devedor e status.
* **Filtros Dinâmicos:** Filtro de busca local em tempo real por título ou bairro.
* **Formulário Híbrido:** Criação e edição integradas no mesmo formulário, permitindo inclusive alterar o status do imóvel (*Disponível, Vendido, Indisponível*) para retirá-lo automaticamente do marketplace público.
* **Exclusão Segura:** Botão de remoção definitiva com confirmação preventiva, mantendo a integridade dos leads associados através do mecanismo de chave estrangeira `ON DELETE SET NULL`.

---

## 👥 Gestão de Equipes e Níveis de Acesso (RBAC)

A plataforma agora suporta o modelo corporativo B2B (multitenancy por corretores), isolando com segurança as informações de clientes e captações de cada funcionário de forma 100% resiliente:
*   **Papel Corretor (`corretor`):**
    *   No CRM, enxerga apenas seus próprios leads de captação.
    *   No faturamento, visualiza apenas o VGV e a comissão de suas próprias transações.
    *   Em "Meus Imóveis", visualiza apenas as propriedades que ele captou.
*   **Papel Administrador (`admin`):**
    *   Gerenciamento global de toda a equipe na nova aba **Gestão de Equipe** (cadastro de corretores, alteração de dados, ativação/desativação de contas).
    *   Acesso consolidado ao faturamento e performance de vendas de todo o time de corretores.
    *   Controle irrestrito sobre todos os leads e imóveis cadastrados no sistema.

---

## 📈 Calculadora Financeira e CRM Premium

*   **Calculadora de Fechamento:** Modal interativo acessível em "Meus Imóveis" que exibe em tempo real o cálculo matemático detalhado de cada repasse (VGV Total, Comissão do Corretor, Taxa de Plataforma de 1% e o Saldo Líquido do Vendedor).
*   **CRM Kanban Animado:** Interface moderna com colunas em tons pastel claros, cartões reativos com zoom e elevação 3D ao passar o mouse, molduras com gradiente metálico e brilho sweep para cards vendidos, e **chuva de confetes** instantânea ao fechar vendas no sistema.

