import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as db from '../database/db';

// Listar repasses com filtros flexíveis
export const getRepasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bairro, quartos, varanda, valor_chave_max, saldo_devedor_max, busca } = req.query;
    
    // Verificar token JWT opcionalmente para ajustar a visibilidade (RBAC)
    let isCorretor = false;
    let isAdmin = false;
    let loggedCorretorId: number | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        try {
          const JWT_SECRET = process.env.JWT_SECRET || 'repasses-secreto-secret-key-123';
          const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; nome: string; role: string };
          if (decoded.role === 'admin') {
            isAdmin = true;
          } else if (decoded.role === 'corretor') {
            isCorretor = true;
            loggedCorretorId = decoded.id;
          }
        } catch (err) {
          // Token inválido/expirado, trata como consulta pública
        }
      }
    }

    let acessoPortfolioGeral = true;
    if (isCorretor && loggedCorretorId !== null) {
      const permRes = await db.query('SELECT acesso_portfolio_geral FROM permissoes_corretor WHERE corretor_id = $1', [loggedCorretorId]);
      if (permRes.rows.length > 0) {
        acessoPortfolioGeral = permRes.rows[0].acesso_portfolio_geral;
      }
    }

    let queryText = `
      SELECT r.*, c.nome as corretor_nome, c.telefone as corretor_telefone 
      FROM repasses r
      LEFT JOIN corretores c ON r.corretor_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Se for consulta pública (não logado), filtrar apenas os disponíveis
    if (!isAdmin && !isCorretor) {
      queryText += ` AND r.status = 'Disponível' `;
    }

    // Se for corretor e não tiver a permissão de ver tudo, filtra apenas os imóveis dele
    if (isCorretor && loggedCorretorId !== null && !acessoPortfolioGeral) {
      queryText += ` AND r.corretor_id = $${paramIndex} `;
      params.push(loggedCorretorId);
      paramIndex++;
    }

    if (bairro) {
      queryText += ` AND r.bairro ILIKE $${paramIndex}`;
      params.push(`%${bairro}%`);
      paramIndex++;
    }

    if (quartos) {
      queryText += ` AND r.quartos >= $${paramIndex}`;
      params.push(parseInt(quartos as string));
      paramIndex++;
    }

    if (varanda !== undefined && varanda !== '') {
      queryText += ` AND r.varanda = $${paramIndex}`;
      params.push(varanda === 'true');
      paramIndex++;
    }

    if (valor_chave_max) {
      queryText += ` AND r.valor_chave <= $${paramIndex}`;
      params.push(parseFloat(valor_chave_max as string));
      paramIndex++;
    }

    if (saldo_devedor_max) {
      queryText += ` AND r.saldo_devedor <= $${paramIndex}`;
      params.push(parseFloat(saldo_devedor_max as string));
      paramIndex++;
    }

    if (busca) {
      queryText += ` AND (r.titulo ILIKE $${paramIndex} OR r.descricao ILIKE $${paramIndex} OR r.bairro ILIKE $${paramIndex})`;
      params.push(`%${busca}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY r.data_criacao DESC`;

    const { rows } = await db.query(queryText, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar repasses:', err);
    res.status(500).json({ error: 'Erro ao buscar repasses.' });
  }
};

// Obter detalhes de um repasse específico
export const getRepasseById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const queryText = `
      SELECT r.*, c.nome as corretor_nome, c.telefone as corretor_telefone, c.email as corretor_email
      FROM repasses r
      LEFT JOIN corretores c ON r.corretor_id = c.id
      WHERE r.id = $1
    `;
    const { rows } = await db.query(queryText, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Repasse não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao obter repasse:', err);
    res.status(500).json({ error: 'Erro ao obter detalhes do repasse.' });
  }
};

// Obter repasses por corretor (Portfólio do Corretor)
export const getRepassesByCorretor = async (req: Request, res: Response): Promise<any> => {
  try {
    const { corretorId } = req.params;
    
    // Verificar se o corretor existe
    const corretorCheck = await db.query('SELECT * FROM corretores WHERE id = $1', [corretorId]);
    if (corretorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Corretor não encontrado.' });
    }

    const queryText = `
      SELECT r.*, c.nome as corretor_nome, c.telefone as corretor_telefone 
      FROM repasses r
      LEFT JOIN corretores c ON r.corretor_id = c.id
      WHERE r.corretor_id = $1 AND r.status = 'Disponível'
      ORDER BY r.data_criacao DESC
    `;
    const { rows } = await db.query(queryText, [corretorId]);
    res.json({
      corretor: corretorCheck.rows[0],
      repasses: rows
    });
  } catch (err) {
    console.error('Erro ao buscar portfólio:', err);
    res.status(500).json({ error: 'Erro ao buscar portfólio do corretor.' });
  }
};

// Cadastrar novo repasse
export const createRepasse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { titulo, bairro, valor_chave, saldo_devedor, parcela, quartos, varanda, area, imagem_url, descricao, comissao_pct, corretor_id } = req.body;
    
    if (!titulo || !bairro || !valor_chave || !saldo_devedor || !corretor_id) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const queryText = `
      INSERT INTO repasses (titulo, bairro, valor_chave, saldo_devedor, parcela, quartos, varanda, area, imagem_url, descricao, comissao_pct, corretor_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const params = [
      titulo,
      bairro,
      parseFloat(valor_chave),
      parseFloat(saldo_devedor),
      parcela ? parseFloat(parcela) : null,
      quartos ? parseInt(quartos) : 1,
      varanda === true || varanda === 'true',
      area ? parseInt(area) : null,
      imagem_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=60',
      descricao || '',
      comissao_pct ? parseFloat(comissao_pct) : 5.00,
      parseInt(corretor_id)
    ];

    const { rows } = await db.query(queryText, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao cadastrar repasse:', err);
    res.status(500).json({ error: 'Erro ao cadastrar repasse.' });
  }
};

// Obter lista de corretores ativos
export const getCorretores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query('SELECT id, nome, email, telefone, ativo FROM corretores WHERE ativo = true ORDER BY nome');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar corretores:', err);
    res.status(500).json({ error: 'Erro ao buscar corretores.' });
  }
};

// Atualizar repasse existente
export const updateRepasse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { titulo, bairro, valor_chave, saldo_devedor, parcela, quartos, varanda, area, imagem_url, descricao, status, comissao_pct, corretor_id } = req.body;

    if (!titulo || !bairro || !valor_chave || !saldo_devedor || !corretor_id) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const repasseCheck = await db.query('SELECT * FROM repasses WHERE id = $1', [id]);
    if (repasseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repasse não encontrado.' });
    }

    const queryText = `
      UPDATE repasses 
      SET titulo = $1, bairro = $2, valor_chave = $3, saldo_devedor = $4, parcela = $5, 
          quartos = $6, varanda = $7, area = $8, imagem_url = $9, descricao = $10, status = $11, comissao_pct = $12, corretor_id = $13
      WHERE id = $14
      RETURNING *
    `;
    const params = [
      titulo,
      bairro,
      parseFloat(valor_chave),
      parseFloat(saldo_devedor),
      parcela ? parseFloat(parcela) : null,
      quartos ? parseInt(quartos) : 1,
      varanda === true || varanda === 'true',
      area ? parseInt(area) : null,
      imagem_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=60',
      descricao || '',
      status || 'Disponível',
      comissao_pct ? parseFloat(comissao_pct) : 5.00,
      parseInt(corretor_id),
      id
    ];

    const { rows } = await db.query(queryText, params);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar repasse:', err);
    res.status(500).json({ error: 'Erro ao atualizar repasse.' });
  }
};

// Excluir repasse existente
export const deleteRepasse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const repasseCheck = await db.query('SELECT * FROM repasses WHERE id = $1', [id]);
    if (repasseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repasse não encontrado.' });
    }

    await db.query('DELETE FROM repasses WHERE id = $1', [id]);
    res.json({ message: 'Repasse excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir repasse:', err);
    res.status(500).json({ error: 'Erro ao excluir repasse.' });
  }
};
