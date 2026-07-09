import { Request, Response } from 'express';
import * as db from '../database/db';

// Cadastrar um lead e distribuir automaticamente via Roleta de Leads (Round-Robin)
export const createLead = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nome, telefone, email, repasse_id } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
    }

    // 1. Obter todos os corretores ativos
    const { rows: corretores } = await db.query(
      'SELECT id, nome FROM corretores WHERE ativo = true ORDER BY id'
    );

    if (corretores.length === 0) {
      return res.status(500).json({ error: 'Nenhum corretor ativo no sistema para receber o lead.' });
    }

    let corretorDestinoId: number | null = null;

    // 2. Obter o corretor do último lead cadastrado para fazer a roleta
    const { rows: ultimoLead } = await db.query(
      'SELECT corretor_id FROM leads WHERE corretor_id IS NOT NULL ORDER BY id DESC LIMIT 1'
    );

    if (ultimoLead.length === 0) {
      // Nenhum lead cadastrado ainda, atribui ao primeiro corretor
      corretorDestinoId = corretores[0].id;
    } else {
      const ultimoCorretorId = ultimoLead[0].corretor_id;
      // Localizar o índice do último corretor na lista de ativos
      const indexUltimo = corretores.findIndex(c => c.id === ultimoCorretorId);

      if (indexUltimo === -1) {
        // Se o último corretor não estiver mais ativo, reinicia do primeiro
        corretorDestinoId = corretores[0].id;
      } else {
        // Avança um corretor na fila (retornando a zero se for o final)
        const proximoIndex = (indexUltimo + 1) % corretores.length;
        corretorDestinoId = corretores[proximoIndex].id;
      }
    }

    // 3. Cadastrar o lead no banco de dados com o corretor atribuído
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
      message: 'Lead recebido e distribuído com sucesso na roleta!',
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
    const queryText = `
      SELECT l.*, c.nome as corretor_nome, r.titulo as repasse_titulo, r.bairro as repasse_bairro
      FROM leads l
      LEFT JOIN corretores c ON l.corretor_id = c.id
      LEFT JOIN repasses r ON l.repasse_id = r.id
      ORDER BY l.data_criacao DESC
    `;
    const { rows } = await db.query(queryText);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar leads:', err);
    res.status(500).json({ error: 'Erro ao buscar leads.' });
  }
};

// Atualizar o status do lead (Kanban e Vendas)
export const updateLeadStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Novo', 'Não respondeu', 'Em negociação', 'Vendido'];
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
    // 1. Leads por status
    const statusStats = await db.query(`
      SELECT status, COUNT(*) as quantidade 
      FROM leads 
      GROUP BY status
    `);

    // 2. Cálculo do VGV
    const vgvStats = await db.query(`
      SELECT 
        COALESCE(SUM(r.valor_chave), 0) as total_chaves,
        COALESCE(SUM(r.saldo_devedor), 0) as total_saldo_devedor,
        COALESCE(SUM(r.valor_chave + r.saldo_devedor), 0) as total_vgv
      FROM repasses r
      WHERE r.status = 'Vendido'
    `);

    const totalVgv = parseFloat(vgvStats.rows[0].total_vgv);
    const totalChaves = parseFloat(vgvStats.rows[0].total_chaves);
    
    const comissaoCorretor = totalChaves * 0.05;
    const comissaoGestor = totalVgv * 0.01;

    // 3. Conversões e leads por corretor
    const corretoresPerformance = await db.query(`
      SELECT 
        c.id as corretor_id,
        c.nome as corretor_name,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'Vendido' THEN 1 END) as vendas,
        ROUND(COALESCE(COUNT(CASE WHEN l.status = 'Vendido' THEN 1 END)::numeric / NULLIF(COUNT(l.id), 0), 0) * 100, 1) as taxa_conversao
      FROM corretores c
      LEFT JOIN leads l ON l.corretor_id = c.id
      WHERE c.ativo = true
      GROUP BY c.id, c.nome
      ORDER BY vendas DESC, total_leads DESC
    `);

    res.json({
      leadsPorStatus: statusStats.rows,
      financeiro: {
        totalVgv,
        totalChaves,
        comissaoCorretor,
        comissaoGestor
      },
      performanceCorretores: corretoresPerformance.rows
    });
  } catch (err) {
    console.error('Erro ao calcular estatísticas do dashboard:', err);
    res.status(500).json({ error: 'Erro ao processar métricas do dashboard.' });
  }
};
