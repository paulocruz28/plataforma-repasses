import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as db from '../database/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'repasses-secreto-secret-key-123';
const INVITATION_CODE = process.env.INVITATION_CODE || 'REPASSES2026';

// Autenticar Corretor
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    res.status(400).send('Por favor, informe e-mail e senha.');
    return;
  }

  try {
    const result = await db.query('SELECT * FROM corretores WHERE email = $1 AND ativo = TRUE', [email.toLowerCase().trim()]);
    
    if (result.rows.length === 0) {
      console.log(`>>> [AUTH] Login falhou: email não encontrado ou inativo: "${email}"`);
      res.status(400).send('E-mail ou senha incorretos.');
      return;
    }

    const corretor = result.rows[0];

    // Verificar se o corretor possui senha_hash
    if (!corretor.senha_hash) {
      console.log(`>>> [AUTH] Login falhou: corretor sem senha_hash: "${email}"`);
      res.status(400).send('Corretor não possui senha configurada. Entre em contato com a administração.');
      return;
    }

    // Comparar senha
    const isMatch = await bcrypt.compare(senha, corretor.senha_hash);
    if (!isMatch) {
      console.log(`>>> [AUTH] Login falhou: senha incorreta para: "${email}". Comprimento recebido: ${senha.length}`);
      res.status(400).send('E-mail ou senha incorretos.');
      return;
    }

    // Gerar Token JWT
    const token = jwt.sign(
      { id: corretor.id, email: corretor.email, nome: corretor.nome, role: corretor.role || 'corretor' },
      JWT_SECRET,
      { expiresIn: '7d' } // Expira em 7 dias
    );

    const permResult = await db.query('SELECT * FROM permissoes_corretor WHERE corretor_id = $1', [corretor.id]);
    const permissoes = permResult.rows.length > 0 ? permResult.rows[0] : {
      acesso_portfolio_geral: true,
      criacao_leads_manuais: true,
      edicao_comissao_captacao: false,
      visualizacao_margem_imobiliaria: false,
      exportacao_dossies: true,
      participacao_roleta: true
    };

    res.json({
      token,
      corretor: {
        id: corretor.id,
        nome: corretor.nome,
        email: corretor.email,
        telefone: corretor.telefone,
        role: corretor.role || 'corretor',
        permissoes
      }
    });

  } catch (err) {
    console.error('>>> [AUTH] Erro no login:', err);
    res.status(500).send('Erro interno do servidor.');
  }
};

// Cadastrar Novo Corretor (Registro)
export const register = async (req: Request, res: Response): Promise<void> => {
  const { nome, email, telefone, senha, codigo_convite } = req.body;

  if (!nome || !email || !senha) {
    res.status(400).send('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  // Validar código de convite
  if (codigo_convite !== INVITATION_CODE) {
    res.status(400).send('Código de convite/acesso incorreto.');
    return;
  }

  try {
    // Verificar e-mail duplicado
    const checkEmail = await db.query('SELECT id FROM corretores WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkEmail.rows.length > 0) {
      res.status(400).send('Este e-mail já está registrado por outro corretor.');
      return;
    }

    // Criptografar Senha
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    // Inserir Corretor no Banco
    const result = await db.query(
      'INSERT INTO corretores (nome, email, telefone, senha_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, telefone, role',
      [nome.trim(), email.toLowerCase().trim(), telefone || null, hash, 'corretor']
    );

    const novoCorretor = result.rows[0];

    // Gerar Token JWT
    const token = jwt.sign(
      { id: novoCorretor.id, email: novoCorretor.email, nome: novoCorretor.nome, role: novoCorretor.role || 'corretor' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      corretor: novoCorretor
    });

  } catch (err) {
    console.error('>>> [AUTH] Erro no cadastro:', err);
    res.status(500).send('Erro interno do servidor.');
  }
};

// Obter dados do usuário logado com as permissões atualizadas
export const me = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).send('Não autorizado.');
    return;
  }

  try {
    const corretorId = authReq.user.id;
    const result = await db.query(
      'SELECT id, nome, email, telefone, role, nome_exibicao, foto_url FROM corretores WHERE id = $1 AND ativo = TRUE',
      [corretorId]
    );

    if (result.rows.length === 0) {
      res.status(404).send('Usuário não encontrado ou inativo.');
      return;
    }

    const corretor = result.rows[0];
    const permResult = await db.query('SELECT * FROM permissoes_corretor WHERE corretor_id = $1', [corretor.id]);
    const permissoes = permResult.rows.length > 0 ? permResult.rows[0] : {
      acesso_portfolio_geral: true,
      criacao_leads_manuais: true,
      edicao_comissao_captacao: false,
      visualizacao_margem_imobiliaria: false,
      exportacao_dossies: true,
      participacao_roleta: true
    };

    res.json({
      corretor: {
        ...corretor,
        permissoes
      }
    });
  } catch (err) {
    console.error('>>> [AUTH] Erro no endpoint me:', err);
    res.status(500).send('Erro interno do servidor.');
  }
};

// Atualizar Perfil do Corretor
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).send('Não autorizado.');
    return;
  }
  const userId = authReq.user.id;
  const { nome, nome_exibicao, telefone, foto_url, senha } = req.body;

  if (!nome) {
    res.status(400).send('Nome completo é obrigatório.');
    return;
  }

  try {
    let queryText = 'UPDATE corretores SET nome = $1, nome_exibicao = $2, telefone = $3, foto_url = $4';
    let queryParams: any[] = [nome.trim(), nome_exibicao ? nome_exibicao.trim() : null, telefone ? telefone.trim() : null, foto_url || null];

    if (senha && senha.trim()) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(senha, salt);
      queryText += ', senha_hash = $5 WHERE id = $6 RETURNING id, nome, email, telefone, nome_exibicao, foto_url, role';
      queryParams.push(hash, userId);
    } else {
      queryText += ' WHERE id = $5 RETURNING id, nome, email, telefone, nome_exibicao, foto_url, role';
      queryParams.push(userId);
    }

    const result = await db.query(queryText, queryParams);
    const updatedCorretor = result.rows[0];

    // Gerar novo Token JWT com os dados atualizados do perfil
    const token = jwt.sign(
      { 
        id: updatedCorretor.id, 
        email: updatedCorretor.email, 
        nome: updatedCorretor.nome,
        nome_exibicao: updatedCorretor.nome_exibicao,
        foto_url: updatedCorretor.foto_url,
        role: updatedCorretor.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      corretor: updatedCorretor
    });
  } catch (err) {
    console.error('>>> [AUTH] Erro ao atualizar perfil:', err);
    res.status(500).send('Erro interno do servidor.');
  }
};
