"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBrokerPermissions = exports.getBrokerPermissions = exports.updateSettings = exports.getSettings = exports.updateTeamMember = exports.createTeamMember = exports.getTeam = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db = __importStar(require("../database/db"));
// Listar todos os corretores (apenas para Admin)
const getTeam = async (req, res) => {
    try {
        const authReq = req;
        if (authReq.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar equipes.' });
        }
        const { rows } = await db.query('SELECT id, nome, email, telefone, ativo, role, nome_exibicao, foto_url, data_criacao FROM corretores ORDER BY nome ASC');
        res.json(rows);
    }
    catch (err) {
        console.error('Erro ao buscar equipe:', err);
        res.status(500).json({ error: 'Erro ao buscar equipe de corretores.' });
    }
};
exports.getTeam = getTeam;
// Cadastrar corretor na equipe (apenas para Admin)
const createTeamMember = async (req, res) => {
    try {
        const authReq = req;
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
        const salt = await bcryptjs_1.default.genSalt(10);
        const hash = await bcryptjs_1.default.hash(senha, salt);
        const result = await db.query(`INSERT INTO corretores (nome, email, telefone, senha_hash, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nome, email, telefone, role, ativo`, [nome.trim(), email.toLowerCase().trim(), telefone || null, hash, role || 'corretor']);
        const newCorretor = result.rows[0];
        await db.query(`INSERT INTO permissoes_corretor (corretor_id) VALUES ($1) ON CONFLICT DO NOTHING`, [newCorretor.id]);
        res.status(201).json(newCorretor);
    }
    catch (err) {
        console.error('Erro ao adicionar membro à equipe:', err);
        res.status(500).json({ error: 'Erro ao adicionar corretor.' });
    }
};
exports.createTeamMember = createTeamMember;
// Atualizar corretor na equipe (apenas para Admin)
const updateTeamMember = async (req, res) => {
    try {
        const authReq = req;
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
        let params = [];
        if (senha) {
            const salt = await bcryptjs_1.default.genSalt(10);
            const hash = await bcryptjs_1.default.hash(senha, salt);
            queryText = `
        UPDATE corretores 
        SET nome = $1, email = $2, telefone = $3, role = $4, ativo = $5, senha_hash = $6
        WHERE id = $7
        RETURNING id, nome, email, telefone, role, ativo
      `;
            params = [nome.trim(), email.toLowerCase().trim(), telefone || null, role || 'corretor', ativo !== false, hash, id];
        }
        else {
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
    }
    catch (err) {
        console.error('Erro ao atualizar corretor:', err);
        res.status(500).json({ error: 'Erro ao atualizar corretor.' });
    }
};
exports.updateTeamMember = updateTeamMember;
// Obter configurações globais do sistema
const getSettings = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT chave, valor FROM configuracoes');
        const settingsObj = rows.reduce((acc, row) => {
            acc[row.chave] = row.valor;
            return acc;
        }, {});
        res.json(settingsObj);
    }
    catch (err) {
        console.error('Erro ao buscar configurações:', err);
        res.status(500).json({ error: 'Erro ao buscar configurações.' });
    }
};
exports.getSettings = getSettings;
// Atualizar configurações globais do sistema (apenas Admin)
const updateSettings = async (req, res) => {
    try {
        const authReq = req;
        if (authReq.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem alterar as configurações.' });
        }
        const { comissao_corretor_padrao, comissao_gestao_padrao } = req.body;
        if (comissao_corretor_padrao !== undefined) {
            await db.query('INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2', ['comissao_corretor_padrao', parseFloat(comissao_corretor_padrao).toFixed(2)]);
        }
        if (comissao_gestao_padrao !== undefined) {
            await db.query('INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2', ['comissao_gestao_padrao', parseFloat(comissao_gestao_padrao).toFixed(2)]);
        }
        res.json({ message: 'Configurações atualizadas com sucesso!' });
    }
    catch (err) {
        console.error('Erro ao atualizar configurações:', err);
        res.status(500).json({ error: 'Erro ao atualizar configurações.' });
    }
};
exports.updateSettings = updateSettings;
// Obter permissões de um corretor
const getBrokerPermissions = async (req, res) => {
    try {
        const authReq = req;
        if (authReq.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const { id } = req.params;
        const { rows } = await db.query('SELECT * FROM permissoes_corretor WHERE corretor_id = $1', [id]);
        if (rows.length === 0) {
            await db.query('INSERT INTO permissoes_corretor (corretor_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
            const newQuery = await db.query('SELECT * FROM permissoes_corretor WHERE corretor_id = $1', [id]);
            return res.json(newQuery.rows[0]);
        }
        res.json(rows[0]);
    }
    catch (err) {
        console.error('Erro ao buscar permissões do corretor:', err);
        res.status(500).json({ error: 'Erro ao buscar permissões.' });
    }
};
exports.getBrokerPermissions = getBrokerPermissions;
// Atualizar permissões de um corretor
const updateBrokerPermissions = async (req, res) => {
    try {
        const authReq = req;
        if (authReq.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const { id } = req.params;
        const { acesso_portfolio_geral, criacao_leads_manuais, edicao_comissao_captacao, visualizacao_margem_imobiliaria, exportacao_dossies, participacao_roleta } = req.body;
        const result = await db.query(`INSERT INTO permissoes_corretor (
        corretor_id, acesso_portfolio_geral, criacao_leads_manuais, 
        edicao_comissao_captacao, visualizacao_margem_imobiliaria, 
        exportacao_dossies, participacao_roleta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (corretor_id) DO UPDATE SET
        acesso_portfolio_geral = EXCLUDED.acesso_portfolio_geral,
        criacao_leads_manuais = EXCLUDED.criacao_leads_manuais,
        edicao_comissao_captacao = EXCLUDED.edicao_comissao_captacao,
        visualizacao_margem_imobiliaria = EXCLUDED.visualizacao_margem_imobiliaria,
        exportacao_dossies = EXCLUDED.exportacao_dossies,
        participacao_roleta = EXCLUDED.participacao_roleta
      RETURNING *`, [
            id,
            acesso_portfolio_geral !== false,
            criacao_leads_manuais !== false,
            edicao_comissao_captacao === true,
            visualizacao_margem_imobiliaria === true,
            exportacao_dossies !== false,
            participacao_roleta !== false
        ]);
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('Erro ao atualizar permissões do corretor:', err);
        res.status(500).json({ error: 'Erro ao atualizar permissões.' });
    }
};
exports.updateBrokerPermissions = updateBrokerPermissions;
