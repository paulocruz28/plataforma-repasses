import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'repasses-secreto-secret-key-123';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    nome: string;
    role: string;
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send('Acesso negado. Token de autorização ausente.');
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).send('Erro de autorização. Formato de token inválido.');
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; nome: string; role: string };
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err) {
    res.status(401).send('Acesso não autorizado. Token inválido ou expirado.');
  }
};
