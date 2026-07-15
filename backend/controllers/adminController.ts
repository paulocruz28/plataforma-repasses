import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as db from '../database/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

// Listar todos os corretores (apenas para Admin)
export const getTeam = async (req: Request, res: Response): Promise<any> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar equipes.' });
    }

    const { rows } = await db.query(
      'SELECT id, nome, email, telefone, ativo, role, nome_exibicao, foto_url, data_criacao FROM corretores ORDER BY nome ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar equipe:', err);
    res.status(500).json({ error: 'Erro ao buscar equipe de corretores.' });
  }
};

// Cadastrar corretor na equipe (apenas para Admin)
export const createTeamMember = async (req: Request, res: Response): Promise<any> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { nome, email, telefone, senha, role } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const checkEmail = await db.query('SELECT id FROM corretores WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    const result = await db.query(
      `INSERT INTO corretores (nome, email, telefone, senha_hash, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nome, email, telefone, role, ativo`,
      [nome.trim(), email.toLowerCase().trim(), telefone || null, hash, role || 'corretor']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao adicionar membro à equipe:', err);
    res.status(500).json({ error: 'Erro ao adicionar corretor.' });
  }
};

// Atualizar corretor na equipe (apenas para Admin)
export const updateTeamMember = async (req: Request, res: Response): Promise<any> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { id } = req.params;
    const { nome, email, telefone, role, ativo, senha } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }

    const checkCorretor = await db.query('SELECT id FROM corretores WHERE id = $1', [id]);
    if (checkCorretor.rows.length === 0) {
      return res.status(404).json({ error: 'Corretor não encontrado.' });
    }

    let queryText = '';
    let params: any[] = [];

    if (senha) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(senha, salt);
      queryText = `
        UPDATE corretores 
        SET nome = $1, email = $2, telefone = $3, role = $4, ativo = $5, senha_hash = $6
        WHERE id = $7
        RETURNING id, nome, email, telefone, role, ativo
      `;
      params = [nome.trim(), email.toLowerCase().trim(), telefone || null, role || 'corretor', ativo !== false, hash, id];
    } else {
      queryText = `
        UPDATE corretores 
        SET nome = $1, email = $2, telefone = $3, role = $4, ativo = $5
        WHERE id = $6
        RETURNING id, nome, email, telefone, role, ativo
      `;
      params = [nome.trim(), email.toLowerCase().trim(), telefone || null, role || 'corretor', ativo !== false, id];
    }

    const result = await db.query(queryText, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar corretor:', err);
    res.status(500).json({ error: 'Erro ao atualizar corretor.' });
  }
};

// Obter configurações globais do sistema
export const getSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    const { rows } = await db.query('SELECT chave, valor FROM configuracoes');
    const settingsObj = rows.reduce((acc: any, row: any) => {
      acc[row.chave] = row.valor;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
};

// Atualizar configurações globais do sistema (apenas Admin)
export const updateSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem alterar as configurações.' });
    }

    const { comissao_corretor_padrao, comissao_gestao_padrao } = req.body;

    if (comissao_corretor_padrao !== undefined) {
      await db.query(
        'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2',
        ['comissao_corretor_padrao', parseFloat(comissao_corretor_padrao).toFixed(2)]
      );
    }

    if (comissao_gestao_padrao !== undefined) {
      await db.query(
        'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2',
        ['comissao_gestao_padrao', parseFloat(comissao_gestao_padrao).toFixed(2)]
      );
    }

    res.json({ message: 'Configurações atualizadas com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar configurações:', err);
    res.status(500).json({ error: 'Erro ao atualizar configurações.' });
  }
};
