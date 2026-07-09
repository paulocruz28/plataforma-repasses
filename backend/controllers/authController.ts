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
      res.status(400).send('E-mail ou senha incorretos.');
      return;
    }

    const corretor = result.rows[0];

    // Verificar se o corretor possui senha_hash
    if (!corretor.senha_hash) {
      res.status(400).send('Corretor não possui senha configurada. Entre em contato com a administração.');
      return;
    }

    // Comparar senha
    const isMatch = await bcrypt.compare(senha, corretor.senha_hash);
    if (!isMatch) {
      res.status(400).send('E-mail ou senha incorretos.');
      return;
    }

    // Gerar Token JWT
    const token = jwt.sign(
      { id: corretor.id, email: corretor.email, nome: corretor.nome },
      JWT_SECRET,
      { expiresIn: '7d' } // Expira em 7 dias
    );

    res.json({
      token,
      corretor: {
        id: corretor.id,
        nome: corretor.nome,
        email: corretor.email,
        telefone: corretor.telefone
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
      'INSERT INTO corretores (nome, email, telefone, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, telefone',
      [nome.trim(), email.toLowerCase().trim(), telefone || null, hash]
    );

    const novoCorretor = result.rows[0];

    // Gerar Token JWT
    const token = jwt.sign(
      { id: novoCorretor.id, email: novoCorretor.email, nome: novoCorretor.nome },
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

// Obter dados do usuário logado
export const me = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).send('Não autorizado.');
    return;
  }
  res.json({ corretor: authReq.user });
};
