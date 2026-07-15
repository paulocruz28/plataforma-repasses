import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Inicialização do banco de dados
export const initDb = async (): Promise<void> => {
  const client: PoolClient = await pool.connect();
  try {
    console.log('>>> [DB] Inicializando tabelas do banco de dados...');
    
    // 1. Tabela de Corretores
    await client.query(`
      CREATE TABLE IF NOT EXISTS corretores (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        telefone VARCHAR(20),
        ativo BOOLEAN DEFAULT TRUE,
        senha_hash VARCHAR(255),
        nome_exibicao VARCHAR(100),
        foto_url TEXT,
        role VARCHAR(20) DEFAULT 'corretor',
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migração automática e resiliente para adicionar senha_hash, nome_exibicao, foto_url e role se a tabela já existir
    await client.query(`
      ALTER TABLE corretores ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);
      ALTER TABLE corretores ADD COLUMN IF NOT EXISTS nome_exibicao VARCHAR(100);
      ALTER TABLE corretores ADD COLUMN IF NOT EXISTS foto_url TEXT;
      ALTER TABLE corretores ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'corretor';
    `);

    // 2. Tabela de Repasses
    await client.query(`
      CREATE TABLE IF NOT EXISTS repasses (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        bairro VARCHAR(100) NOT NULL,
        valor_chave NUMERIC(12, 2) NOT NULL,
        saldo_devedor NUMERIC(12, 2) NOT NULL,
        parcela NUMERIC(10, 2),
        quartos INTEGER DEFAULT 1,
        varanda BOOLEAN DEFAULT FALSE,
        area INTEGER,
        imagem_url VARCHAR(500),
        descricao TEXT,
        corretor_id INTEGER REFERENCES corretores(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'Disponível',
        comissao_pct NUMERIC(4, 2) DEFAULT 5.00,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migração automática e resiliente para adicionar comissao_pct se a tabela já existir
    await client.query(`
      ALTER TABLE repasses ADD COLUMN IF NOT EXISTS comissao_pct NUMERIC(4, 2) DEFAULT 5.00;
    `);

    // 3. Tabela de Leads
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        repasse_id INTEGER REFERENCES repasses(id) ON DELETE SET NULL,
        corretor_id INTEGER REFERENCES corretores(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'Novo',
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('>>> [DB] Tabelas verificadas/criadas com sucesso.');

    // 4. Semeadura de Dados Fictícios (Seed)
    const defaultPassword = 'Teste@4321@';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPassword, salt);

    // Garantir que todos os corretores existentes tenham uma senha criptografada se a coluna estiver nula
    await client.query(`
      UPDATE corretores SET senha_hash = $1 WHERE senha_hash IS NULL;
    `, [hash]);

    const corretoresCount = await client.query('SELECT COUNT(*) FROM corretores');
    if (parseInt(corretoresCount.rows[0].count) === 0) {
      console.log('>>> [DB] Inserindo corretores padrão...');
      await client.query(`
        INSERT INTO corretores (nome, email, telefone, senha_hash, role) VALUES 
        ('Gabriel Souza', 'gabriel@repasses.com', '(85) 99999-1111', $1, 'admin'),
        ('Paloma Ribeiro', 'paloma@repasses.com', '(85) 99999-2222', $1, 'corretor'),
        ('Mariana Costa', 'mariana@repasses.com', '(85) 99999-3333', $1, 'corretor');
      `, [hash]);
    }

    const repassesCount = await client.query('SELECT COUNT(*) FROM repasses');
    if (parseInt(repassesCount.rows[0].count) === 0) {
      console.log('>>> [DB] Inserindo repasses de exemplo...');
      const corretoresRes = await client.query('SELECT id FROM corretores ORDER BY id');
      const c1 = corretoresRes.rows[0].id;
      const c2 = corretoresRes.rows[1].id;
      const c3 = corretoresRes.rows[2].id;

      await client.query(`
        INSERT INTO repasses (titulo, bairro, valor_chave, saldo_devedor, parcela, quartos, varanda, area, imagem_url, descricao, corretor_id) VALUES 
        ('Apartamento Vista Mar Aldeota', 'Aldeota', 180000.00, 320000.00, 2400.00, 3, true, 85, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&auto=format&fit=crop&q=60', 'Lindo apartamento na Aldeota com varanda gourmet integrada e vista definitiva para o mar. Localizado em andar alto, o imóvel conta com piso em porcelanato polido de alto padrão, teto rebaixado com projeto luminotécnico em LED e armários planejados em todos os cômodos.\n\nO condomínio oferece área de lazer completa equipada com piscina de raia climatizada, academia completa, salão de jogos, brinquedoteca e guarita blindada com monitoramento 24h.\n\nRepasse de ágio muito abaixo da tabela de mercado.', $1),
        ('Casa Duplex Alphaville', 'Eusébio', 350000.00, 650000.00, 4200.00, 4, true, 280, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60', 'Maravilhosa residência duplex situada em um dos condomínios mais prestigiados do Eusébio, o Alphaville Ceará. Apresenta arquitetura contemporânea marcante, pé-direito duplo na sala de estar e amplas esquadrias integradas.\n\nSão 4 amplas suítes climatizadas, piso em porcelanato rústico, deck gourmet privativo com churrasqueira a carvão integrada, jacuzzi aquecida e paisagismo impecável no quintal.\n\nCondomínio com clube completo de lazer e quadras de tênis de saibro.', $2),
        ('Apartamento Familiar Cocó', 'Cocó', 220000.00, 450000.00, 3100.00, 3, true, 110, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&auto=format&fit=crop&q=60', 'Excelente oportunidade de repasse ao lado do Parque do Cocó. Planta original de 3 quartos redesenhada para oferecer ampla sala de estar e jantar integrada à varanda gourmet.\n\nImóvel com ventilação natural constante, projeto moderno de gesso e cozinha totalmente planejada com cooktop e coifa inclusos. Ideal para famílias com filhos que buscam qualidade de vida ao ar livre.\n\nCondomínio de torre única com salão de festas decorado e playground de madeira de lei.', $3),
        ('Casa de Praia Cumbuco', 'Cumbuco', 150000.00, 300000.00, 1800.00, 3, true, 150, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&auto=format&fit=crop&q=60', 'Charmosa casa de veraneio a apenas 100 metros da beira do mar no Cumbuco, polo mundial do Kitesurf. Imóvel totalmente mobiliado (porteira fechada), com varanda ao redor, churrasqueira de tijolos vermelhos no quintal e piscina ensolarada.\n\nExcelente potencial de retorno financeiro alugando por plataformas de temporada para turistas internacionais durante o ano inteiro.\n\nDocumentação do repasse de ágio regularizada direto com a construtora local.', $1),
        ('Casa em Condomínio Passaré', 'Passaré', 130000.00, 250000.00, 1600.00, 3, false, 120, 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=500&auto=format&fit=crop&q=60', 'Excelente casa duplex em condomínio fechado no Passaré. Excelente vizinhança, portaria virtual 24h e taxa condominial acessível.\n\nO imóvel dispõe de sala de estar aconchegante, 3 quartos sendo 1 suíte reversível, cozinha americana funcional e quintal privativo gramado.\n\nPróximo à sede do Banco do Nordeste, padarias, supermercados e vias expressas de fácil acesso.', $2),
        ('Compacto Moderno Meireles', 'Meireles', 120000.00, 190000.00, 1350.00, 1, false, 42, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&auto=format&fit=crop&q=60', 'Apartamento studio de conceito aberto totalmente decorado a 2 quadras da Beira Mar no Meireles. Perfeito para investidores focados no Airbnb ou profissionais liberais que buscam moradia prática em localização nobre.\n\nEquipado com fechadura eletrônica por aproximação, ar condicionado inverter, móveis modulares inteligentes e bancada de quartzo na cozinha.\n\nCondomínio oferece recepção 24h, lavanderia compartilhada OMO e piscina panorâmica no rooftop.', $3),
        ('Repasse Apartamento Fátima', 'Fátima', 95000.00, 210000.00, 1500.00, 2, true, 68, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=500&auto=format&fit=crop&q=60', 'Apartamento ventilado e muito bem conservado no coração do bairro de Fátima. Composto por 2 quartos acolhedores, sala ampla de dois ambientes, cozinha tradicional e varanda privativa.\n\nPróximo à Igreja de Fátima, hospitais, farmácias e as melhores escolas da região central.\n\nVaga de garagem coberta de fácil manobra e portão elétrico de segurança.', $1),
        ('Aluguel Comercial Aldeota', 'Aldeota', 60000.00, 150000.00, 2200.00, 0, false, 180, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60', 'Excelente ponto comercial de 180m² ideal para instalação de clínicas de estética, consultórios médicos ou escritórios de advocacia corporativa.\n\nFachada moderna em pele de vidro refletivo, salas internas divididas com divisórias acústicas drywall de alta densidade, banheiros acessíveis e recepção decorada.\n\nEstacionamento rotativo frontal e fácil identificação de marca na avenida.', $2);
      `, [c1, c2, c3]);
    }

    const leadsCount = await client.query('SELECT COUNT(*) FROM leads');
    if (parseInt(leadsCount.rows[0].count) === 0) {
      console.log('>>> [DB] Inserindo leads de exemplo...');
      const corretoresRes = await client.query('SELECT id FROM corretores ORDER BY id');
      const c1 = corretoresRes.rows[0].id;
      const c2 = corretoresRes.rows[1].id;
      const c3 = corretoresRes.rows[2].id;

      const repassesRes = await client.query('SELECT id FROM repasses ORDER BY id');
      const r1 = repassesRes.rows[0].id;
      const r2 = repassesRes.rows[1].id;
      const r3 = repassesRes.rows[2].id;

      await client.query(`
        INSERT INTO leads (nome, telefone, email, repasse_id, corretor_id, status) VALUES 
        ('Ana Silva', '(85) 9 9999-1234', 'ana@email.com', $1, $4, 'Novo'),
        ('Carlos Santos', '(85) 9 8888-5678', 'carlos@email.com', $2, $4, 'Em negociação'),
        ('Mariana Costa', '(85) 9 7777-9012', 'mariana.c@email.com', $3, $4, 'Vendido'),
        ('Julia Lima', '(85) 9 6666-3456', 'julia@email.com', $1, $5, 'Novo'),
        ('Pedro Rocha', '(85) 9 5555-7890', 'pedro@email.com', $2, $6, 'Em negociação');
      `, [r1, r2, r3, c1, c2, c3]);
    }

  } catch (err) {
    console.error('>>> [DB] Erro durante a inicialização do banco:', err);
    throw err;
  } finally {
    client.release();
  }
};

export const query = (text: string, params?: any[]) => pool.query(text, params);
export { pool };
