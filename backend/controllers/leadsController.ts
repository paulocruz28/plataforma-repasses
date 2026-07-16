import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as db from '../database/db';

// Cadastrar um lead e distribuir automaticamente via Roleta de Leads ou Atribuição Direta
export const createLead = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nome, telefone, email, repasse_id, corretor_id } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
    }

    // 1. Obter todos os corretores ativos que participam da roleta de leads
    const { rows: corretores } = await db.query(
      `SELECT c.id, c.nome 
       FROM corretores c
       LEFT JOIN permissoes_corretor p ON c.id = p.corretor_id
       WHERE c.ativo = true AND (c.role = 'admin' OR p.participacao_roleta IS NULL OR p.participacao_roleta = true)
       ORDER BY c.id`
    );

    if (corretores.length === 0) {
      return res.status(500).json({ error: 'Nenhum corretor ativo no sistema para receber o lead.' });
    }

    let corretorDestinoId: number | null = null;
    let atribuicaoDireta = false;

    // 2. Verificar se há indicação direta de corretor (no corpo da requisição ou pelo dono do repasse)
    if (corretor_id) {
      const parsedId = parseInt(corretor_id);
      if (corretores.some(c => c.id === parsedId)) {
        corretorDestinoId = parsedId;
        atribuicaoDireta = true;
      }
    }

    if (!corretorDestinoId && repasse_id) {
      const { rows: repasseObj } = await db.query(
        'SELECT corretor_id FROM repasses WHERE id = $1',
        [parseInt(repasse_id)]
      );
      if (repasseObj.length > 0 && repasseObj[0].corretor_id) {
        const repasseCorretorId = repasseObj[0].corretor_id;
        if (corretores.some(c => c.id === repasseCorretorId)) {
          corretorDestinoId = repasseCorretorId;
          atribuicaoDireta = true;
        }
      }
    }

    // 3. Se não houver atribuição direta, executa a Roleta (Round-Robin)
    if (!corretorDestinoId) {
      const { rows: ultimoLead } = await db.query(
        'SELECT corretor_id FROM leads WHERE corretor_id IS NOT NULL ORDER BY id DESC LIMIT 1'
      );

      if (ultimoLead.length === 0) {
        corretorDestinoId = corretores[0].id;
      } else {
        const ultimoCorretorId = ultimoLead[0].corretor_id;
        const indexUltimo = corretores.findIndex(c => c.id === ultimoCorretorId);

        if (indexUltimo === -1) {
          corretorDestinoId = corretores[0].id;
        } else {
          const proximoIndex = (indexUltimo + 1) % corretores.length;
          corretorDestinoId = corretores[proximoIndex].id;
        }
      }
    }

    // 4. Cadastrar o lead no banco de dados com o corretor atribuído
    const queryText = `
      INSERT INTO leads (nome, telefone, email, repasse_id, corretor_id, status)
      VALUES ($1, $2, $3, $4, $5, 'Novo')
      RETURNING *
    `;
    const params = [nome, telefone, email || null, repasse_id ? parseInt(repasse_id) : null, corretorDestinoId];
    const { rows: leadInserido } = await db.query(queryText, params);

    // Obter o nome do corretor para retornar no response
    const corretorNome = corretores.find(c => c.id === corretorDestinoId)!.nome;

    res.status(201).json({
      message: atribuicaoDireta 
        ? 'Lead recebido e atribuído diretamente ao corretor responsável!' 
        : 'Lead recebido e distribuído com sucesso na roleta!',
      lead: {
        ...leadInserido[0],
        corretor_nome: corretorNome
      }
    });

  } catch (err) {
    console.error('Erro ao cadastrar lead:', err);
    res.status(500).json({ error: 'Erro ao cadastrar lead.' });
  }
};

// Obter todos os leads (para o painel de CRM)
export const getLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const isCorretor = authReq.user?.role === 'corretor';
    const corretorId = authReq.user?.id;

    let queryText = `
      SELECT l.*, c.nome as corretor_nome, r.titulo as repasse_titulo, r.bairro as repasse_bairro
      FROM leads l
      LEFT JOIN corretores c ON l.corretor_id = c.id
      LEFT JOIN repasses r ON l.repasse_id = r.id
    `;
    
    const params: any[] = [];
    if (isCorretor) {
      queryText += ` WHERE l.corretor_id = $1 OR l.corretor_id IS NULL `;
      params.push(corretorId);
    }
    
    queryText += ` ORDER BY l.data_criacao DESC `;

    const { rows } = await db.query(queryText, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar leads:', err);
    res.status(500).json({ error: 'Erro ao buscar leads.' });
  }
};

// Fila global em memória para registrar eventos de vendas (confetes em equipe)
export const saleEvents: any[] = [];

// Obter eventos de vendas recentes
export const getSaleEvents = async (req: Request, res: Response): Promise<void> => {
  res.json(saleEvents);
};

// Atualizar o status do lead (Kanban e Vendas)
export const updateLeadStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Novo', 'Não respondeu', 'Em negociação', 'Aprovado', 'Vendido'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status de lead inválido.' });
    }

    // 1. Atualiza o status do lead
    const queryText = `
      UPDATE leads 
      SET status = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const { rows: leadRows } = await db.query(queryText, [status, id]);

    if (leadRows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    const lead = leadRows[0];

    // 2. Se o lead foi marcado como 'Vendido' e está associado a um repasse, marca o repasse como 'Vendido' também
    if (status === 'Vendido' && lead.repasse_id) {
      await db.query(
        "UPDATE repasses SET status = 'Vendido' WHERE id = $1",
        [lead.repasse_id]
      );

      // Disparar evento de venda para toda a equipe
      try {
        const details = await db.query(
          `SELECT c.nome as corretor_nome, r.titulo as repasse_titulo 
           FROM corretores c
           CROSS JOIN repasses r
           WHERE c.id = $1 AND r.id = $2`,
          [lead.corretor_id, lead.repasse_id]
        );
        
        if (details.rows.length > 0) {
          const brokerName = details.rows[0].corretor_nome || 'Um corretor';
          const propertyTitle = details.rows[0].repasse_titulo || 'um imóvel';
          
          saleEvents.push({
            id: `sale-${id}-${Date.now()}`,
            brokerName,
            propertyTitle,
            timestamp: Date.now()
          });

          // Limitar o array de eventos para os últimos 20
          if (saleEvents.length > 20) {
            saleEvents.shift();
          }
        }
      } catch (err) {
        console.error('Erro ao registrar evento de venda:', err);
      }
    } else if (status !== 'Vendido' && lead.repasse_id) {
      await db.query(
        "UPDATE repasses SET status = 'Disponível' WHERE id = $1 AND status = 'Vendido'",
        [lead.repasse_id]
      );
    }

    res.json(lead);
  } catch (err) {
    console.error('Erro ao atualizar status do lead:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do lead.' });
  }
};

// Obter estatísticas do painel (Dashboard de VGV e Conversões)
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const isCorretor = authReq.user?.role === 'corretor';
    const corretorId = authReq.user?.id;

    // 1. Obter taxas padrão de comissão das configurações do banco
    const configRes = await db.query('SELECT chave, valor FROM configuracoes');
    const configs = configRes.rows.reduce((acc: any, row: any) => {
      acc[row.chave] = parseFloat(row.valor);
      return acc;
    }, { comissao_corretor_padrao: 5.00, comissao_gestao_padrao: 1.00 });

    const pctCorretorPadrao = configs.comissao_corretor_padrao;
    const pctGestao = configs.comissao_gestao_padrao;

    // 2. Leads por status
    let statusQuery = `
      SELECT status, COUNT(*) as quantidade 
      FROM leads 
    `;
    let statusParams: any[] = [];
    if (isCorretor) {
      statusQuery += ` WHERE corretor_id = $1 `;
      statusParams.push(corretorId);
    }
    statusQuery += ` GROUP BY status `;
    const statusStats = await db.query(statusQuery, statusParams);

    // 3. Cálculo do VGV
    let vgvQuery = `
      SELECT 
        COALESCE(SUM(r.valor_chave), 0) as total_chaves,
        COALESCE(SUM(r.saldo_devedor), 0) as total_saldo_devedor,
        COALESCE(SUM(r.valor_chave + r.saldo_devedor), 0) as total_vgv,
        COALESCE(SUM(r.valor_chave * (COALESCE(r.comissao_pct, $1) / 100.0)), 0) as total_comissao_corretor
      FROM repasses r
      WHERE r.status = 'Vendido'
    `;
    let vgvParams: any[] = [pctCorretorPadrao];
    if (isCorretor) {
      vgvQuery += ` AND r.corretor_id = $2 `;
      vgvParams.push(corretorId);
    }
    const vgvStats = await db.query(vgvQuery, vgvParams);

    const totalVgv = parseFloat(vgvStats.rows[0].total_vgv);
    const totalChaves = parseFloat(vgvStats.rows[0].total_chaves);
    const comissaoCorretor = parseFloat(vgvStats.rows[0].total_comissao_corretor);
    const comissaoGestor = totalVgv * (pctGestao / 100.0);

    // 4. Conversões e leads por corretor
    let perfQuery = `
      SELECT 
        c.id as corretor_id,
        c.nome as corretor_name,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'Vendido' THEN 1 END) as vendas,
        ROUND(COALESCE(COUNT(CASE WHEN l.status = 'Vendido' THEN 1 END)::numeric / NULLIF(COUNT(l.id), 0), 0) * 100, 1) as taxa_conversao
      FROM corretores c
      LEFT JOIN leads l ON l.corretor_id = c.id
      WHERE c.ativo = true
    `;
    let perfParams: any[] = [];
    if (isCorretor) {
      perfQuery += ` AND c.id = $1 `;
      perfParams.push(corretorId);
    }
    perfQuery += `
      GROUP BY c.id, c.nome
      ORDER BY vendas DESC, total_leads DESC
    `;
    const corretoresPerformance = await db.query(perfQuery, perfParams);

    // 5. Histórico detalhado de vendas de repasses (Livro Caixa)
    let queryVendas = `
      SELECT 
        r.id as repasse_id,
        r.titulo,
        r.bairro,
        r.valor_chave,
        r.saldo_devedor,
        COALESCE(r.comissao_pct, $1) as comissao_pct,
        c.nome as corretor_nome,
        c.id as corretor_id,
        l.data_criacao as data_venda
      FROM repasses r
      LEFT JOIN corretores c ON r.corretor_id = c.id
      LEFT JOIN leads l ON l.repasse_id = r.id AND l.status = 'Vendido'
      WHERE r.status = 'Vendido'
    `;
    let paramVendas: any[] = [pctCorretorPadrao];
    if (isCorretor) {
      queryVendas += ` AND r.corretor_id = $2 `;
      paramVendas.push(corretorId);
    }
    queryVendas += ` ORDER BY l.data_criacao DESC NULLS LAST `;
    const salesRes = await db.query(queryVendas, paramVendas);
    
    const vendasDetalhadas = salesRes.rows.map(row => {
      const valorChave = parseFloat(row.valor_chave);
      const saldoDevedor = parseFloat(row.saldo_devedor);
      const vgv = valorChave + saldoDevedor;
      const comissaoPct = parseFloat(row.comissao_pct);
      const valorComissao = valorChave * (comissaoPct / 100.0);
      const valorGestao = vgv * (pctGestao / 100.0);
      return {
        repasse_id: row.repasse_id,
        titulo: row.titulo,
        bairro: row.bairro,
        corretor_nome: row.corretor_nome || 'N/A',
        corretor_id: row.corretor_id,
        data_venda: row.data_venda,
        valor_chave: valorChave,
        saldo_devedor: saldoDevedor,
        vgv,
        comissao_pct: comissaoPct,
        valor_comissao: valorComissao,
        valor_gestao: valorGestao
      };
    });

    // 6. Métricas Adicionais Consolidadas (Captações, Aprovações, Vendas, Pendências)
    let additionalStats = {
      captacoes: 0,
      aprovacoes: 0,
      vendas: 0,
      pendencias: 0,
      comissaoRecebida: comissaoCorretor,
      comissaoPendente: 0
    };

    if (isCorretor) {
      // Captações ativas do corretor
      const captacoesRes = await db.query(
        "SELECT COUNT(*), COALESCE(SUM(valor_chave * (COALESCE(comissao_pct, $1) / 100.0)), 0) as comissao_pendente FROM repasses WHERE corretor_id = $2 AND status = 'Disponível'",
        [pctCorretorPadrao, corretorId]
      );
      additionalStats.captacoes = parseInt(captacoesRes.rows[0].count);
      additionalStats.comissaoPendente = parseFloat(captacoesRes.rows[0].comissao_pendente);

      // Aprovações (Leads Aprovados) do corretor
      const aprovacoesRes = await db.query(
        "SELECT COUNT(*) FROM leads WHERE corretor_id = $1 AND status = 'Aprovado'",
        [corretorId]
      );
      additionalStats.aprovacoes = parseInt(aprovacoesRes.rows[0].count);

      // Vendas do corretor
      const vendasRes = await db.query(
        "SELECT COUNT(*) FROM leads WHERE corretor_id = $1 AND status = 'Vendido'",
        [corretorId]
      );
      additionalStats.vendas = parseInt(vendasRes.rows[0].count);

      // Pendências do corretor
      const pendenciasRes = await db.query(
        "SELECT COUNT(*) FROM leads WHERE corretor_id = $1 AND status IN ('Novo', 'Não respondeu', 'Em negociação')",
        [corretorId]
      );
      additionalStats.pendencias = parseInt(pendenciasRes.rows[0].count);
    } else {
      // Captações ativas globais
      const captacoesRes = await db.query(
        "SELECT COUNT(*), COALESCE(SUM(valor_chave * (COALESCE(comissao_pct, $1) / 100.0)), 0) as comissao_pendente FROM repasses WHERE status = 'Disponível'",
        [pctCorretorPadrao]
      );
      additionalStats.captacoes = parseInt(captacoesRes.rows[0].count);
      additionalStats.comissaoPendente = parseFloat(captacoesRes.rows[0].comissao_pendente);

      // Aprovações globais
      const aprovacoesRes = await db.query(
        "SELECT COUNT(*) FROM leads WHERE status = 'Aprovado'"
      );
      additionalStats.aprovacoes = parseInt(aprovacoesRes.rows[0].count);

      // Vendas globais
      const vendasRes = await db.query(
        "SELECT COUNT(*) FROM leads WHERE status = 'Vendido'"
      );
      additionalStats.vendas = parseInt(vendasRes.rows[0].count);

      // Pendências globais
      const pendenciasRes = await db.query(
        "SELECT COUNT(*) FROM leads WHERE status IN ('Novo', 'Não respondeu', 'Em negociação')"
      );
      additionalStats.pendencias = parseInt(pendenciasRes.rows[0].count);
    }

    res.json({
      leadsPorStatus: statusStats.rows,
      financeiro: {
        totalVgv,
        totalChaves,
        comissaoCorretor,
        comissaoGestor,
        pctCorretorPadrao,
        pctGestao
      },
      performanceCorretores: corretoresPerformance.rows,
      vendasDetalhadas,
      additionalStats
    });
  } catch (err) {
    console.error('Erro ao calcular estatísticas do dashboard:', err);
    res.status(500).json({ error: 'Erro ao processar métricas do dashboard.' });
  }
};

// Atualizar informações completas do lead (Administração e Direcionamento)
export const updateLead = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, repasse_id, corretor_id, status, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e Telefone são obrigatórios.' });
    }

    const leadCheck = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    const queryText = `
      UPDATE leads 
      SET nome = $1, telefone = $2, email = $3, repasse_id = $4, corretor_id = $5, status = $6, observacoes = $7
      WHERE id = $8
      RETURNING *
    `;
    const params = [
      nome,
      telefone,
      email || null,
      repasse_id ? parseInt(repasse_id) : null,
      corretor_id ? parseInt(corretor_id) : null,
      status || 'Novo',
      observacoes || null,
      id
    ];

    const { rows } = await db.query(queryText, params);
    
    // Se o lead foi marcado como 'Vendido' e está associado a um repasse, marca o repasse como 'Vendido' também
    if (status === 'Vendido' && repasse_id) {
      await db.query(
        "UPDATE repasses SET status = 'Vendido' WHERE id = $1",
        [repasse_id]
      );
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar lead:', err);
    res.status(500).json({ error: 'Erro ao atualizar lead.' });
  }
};
