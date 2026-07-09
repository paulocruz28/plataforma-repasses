import React from 'react';
import { Repasse } from '../services/api';
import { Share2 } from 'lucide-react';

interface RepasseCardProps {
  item: Repasse;
  onNegociar: (id: number) => void;
  onShare: (id: number) => void;
}

export const RepasseCard: React.FC<RepasseCardProps> = ({ item, onNegociar, onShare }) => {
  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val.toString()));
  };

  return (
    <div className="repasse-card glass-panel">
      <div className="card-image-wrapper">
        <span className="badge badge-success card-badge">{item.status}</span>
        <img 
          src={item.imagem_url} 
          alt={item.titulo} 
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=60';
          }}
        />
      </div>
      <div className="card-details">
        <h3>{item.titulo}</h3>
        <div className="card-location">
          📍 <span>{item.bairro}</span>
        </div>
        <div className="card-specs">
          <span>🛏️ {item.quartos} {item.quartos > 1 ? 'Quartos' : 'Quarto'}</span>
          <span>📐 {item.area ? item.area : 0} m²</span>
          <span>🌅 {item.varanda ? 'Com Varanda' : 'Sem Varanda'}</span>
        </div>
        <div className="card-financials">
          <div className="financial-item">
            <span className="financial-label">Valor da Chave (Ágio)</span>
            <span className="financial-value highlight">{formatCurrency(item.valor_chave)}</span>
          </div>
          <div className="financial-item">
            <span className="financial-label">Saldo Devedor</span>
            <span className="financial-value">{formatCurrency(item.saldo_devedor)}</span>
          </div>
        </div>
        <div className="card-footer">
          <div className="broker-info">
            <span className="broker-label">Responsável</span>
            <span className="broker-name">{item.corretor_nome || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => onShare(item.id)} 
              title="Enviar por WhatsApp" 
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Share2 size={16} />
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => onNegociar(item.id)}
            >
              Negociar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
