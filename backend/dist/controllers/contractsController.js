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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContract = exports.verifyCertificates = void 0;
const db = __importStar(require("../database/db"));
// Simular verificação de certidões junto a Sefin e ONR com lógica de timeout resiliente
const verifyCertificates = async (req, res) => {
    try {
        const { cpf } = req.body;
        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório para consulta de certidões.' });
        }
        console.log(`>>> [INTEGRAÇÃO] Iniciando busca de certidões negativas para o CPF: ${cpf}...`);
        // Simulando o delay de uma chamada de API governamental
        await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(), 2500);
            req.on('close', () => {
                clearTimeout(timer);
                console.log('>>> [INTEGRAÇÃO] Requisição cancelada pelo cliente.');
            });
        });
        res.json({
            status: 'Sucesso',
            cpf: cpf,
            consultas: [
                {
                    orgao: 'SEFIN (Secretaria de Finanças)',
                    documento: 'Certidão Negativa de Débitos Municipais (IPTU/Taxas)',
                    status: 'Nada Consta',
                    codigo_autenticidade: 'SEFIN-827394-CE',
                    validade: '2026-10-09'
                },
                {
                    orgao: 'ONR (Operador Nacional do Registro de Imóveis)',
                    documento: 'Certidão de Matrícula e Ônus Reais',
                    status: 'Livre de Ônus',
                    codigo_autenticidade: 'ONR-99283-F12',
                    validade: '2026-08-09'
                }
            ]
        });
    }
    catch (err) {
        console.error('Erro na consulta de certidões:', err);
        res.status(500).json({ error: 'Erro ao consultar órgãos governamentais.' });
    }
};
exports.verifyCertificates = verifyCertificates;
// Gerar minuta do contrato de repasse preenchido automaticamente
const generateContract = async (req, res) => {
    try {
        const { repasse_id, cliente_nome, cliente_cpf, cliente_profissao, cliente_estado_civil, cliente_endereco } = req.body;
        if (!repasse_id || !cliente_nome || !cliente_cpf) {
            return res.status(400).json({ error: 'Dados obrigatórios ausentes para gerar contrato (Repasse, Nome e CPF do comprador).' });
        }
        // Buscar detalhes do repasse e corretor associado
        const queryText = `
      SELECT r.*, c.nome as corretor_nome, c.telefone as corretor_telefone
      FROM repasses r
      LEFT JOIN corretores c ON r.corretor_id = c.id
      WHERE r.id = $1
    `;
        const { rows } = await db.query(queryText, [repasse_id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Repasse selecionado não foi encontrado.' });
        }
        const repasse = rows[0];
        // Formatação de valores monetários para o contrato
        const formatCurrency = (val) => {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val));
        };
        const valorChaveStr = formatCurrency(repasse.valor_chave);
        const saldoDevedorStr = formatCurrency(repasse.saldo_devedor);
        const parcelaStr = repasse.parcela ? formatCurrency(repasse.parcela) : 'N/A';
        const contratoTexto = `
# INSTRUMENTO PARTICULAR DE CESSÃO DE DIREITOS E OBRIGAÇÕES DE IMÓVEL FINANCIADO ("REPASSE")

Pelo presente instrumento particular, as partes têm entre si justo e acordado o seguinte:

## 1. DAS PARTES

**CEDENTE:**
Portfólio de Repasses Imobiliários, por intermédio de seu corretor responsável: **${repasse.corretor_nome || 'Corretor Autorizado'}** (Telefone: ${repasse.corretor_telefone || 'N/A'}).

**CESSIONÁRIO:**
Sr(a). **${cliente_nome}**, sob CPF nº **${cliente_cpf}**, estado civil **${cliente_estado_civil || 'Não informado'}**, profissão **${cliente_profissao || 'Não informado'}**, residente e domiciliado em **${cliente_endereco || 'Não informado'}**.

## 2. DO OBJETO DO CONTRATO
O objeto deste contrato é a cessão de direitos e obrigações relativos ao repasse do imóvel localizado no bairro **${repasse.bairro}**, descrito como: *${repasse.titulo}*.

## 3. DOS VALORES E CONDIÇÕES DE PAGAMENTO
Fica ajustado entre as partes as seguintes condições financeiras:
a) **Valor da Chave (Ágio):** O CESSIONÁRIO pagará ao CEDENTE o valor de **${valorChaveStr}** na assinatura deste instrumento.
b) **Saldo Devedor:** O CESSIONÁRIO assume a responsabilidade exclusiva pelo saldo devedor remanescente junto à instituição financeira credora, no montante atualizado de **${saldoDevedorStr}**, cujas parcelas mensais são de **${parcelaStr}**.
c) **Transferência do Financiamento:** O CESSIONÁRIO obriga-se a realizar os trâmites para a transferência do financiamento junto ao banco credor no prazo de até 12 (doze) meses a contar desta data.

## 4. DA IMISSÃO NA POSSE
O CESSIONÁRIO será imitido na posse direta do imóvel na data de quitação do valor da chave mencionado no item 3(a).

## 5. DO FORO
As partes elegem o foro da Comarca de Fortaleza/CE para dirimir quaisquer dúvidas oriundas deste contrato.

E, por estarem assim justos e contratados, assinam o presente em 02 (duas) vias de igual teor.

Fortaleza/CE, ${new Date().toLocaleDateString('pt-BR')}.

___________________________________________________
**CEDENTE (REPRESENTANTE / CORRETOR)**

___________________________________________________
**CESSIONÁRIO (${cliente_nome})**
    `;
        res.json({
            repasse_id: repasse.id,
            cliente: {
                nome: cliente_nome,
                cpf: cliente_cpf
            },
            contrato: contratoTexto.trim()
        });
    }
    catch (err) {
        console.error('Erro ao gerar contrato:', err);
        res.status(500).json({ error: 'Erro ao gerar o contrato de repasse.' });
    }
};
exports.generateContract = generateContract;
