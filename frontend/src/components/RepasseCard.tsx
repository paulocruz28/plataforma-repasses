import React from 'react';
import type { Repasse } from '../services/api';

interface RepasseCardProps {
  item: Repasse;
  onSelect: (item: Repasse) => void;
}

export const RepasseCard: React.FC<RepasseCardProps> = ({ item, onSelect }) => {
  return (
    <div 
      className="repasse-card glass-panel" 
      onClick={() => onSelect(item)} 
      style={{ 
        cursor: 'pointer', 
        overflow: 'hidden', 
        borderRadius: '16px', 
        position: 'relative', 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid var(--border-color)',
        height: '280px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="card-image-wrapper" style={{ height: '100%', width: '100%', position: 'relative' }}>
        <span className="badge badge-success card-badge" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
          {item.status || 'Disponível'}
        </span>
        <img 
          src={item.imagem_url} 
          alt={item.titulo} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=60';
          }}
        />
        {/* Neighborhood Overlay gradient block */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
          padding: '40px 16px 16px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          height: '50%'
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
            📍 {item.bairro}
          </span>
        </div>
      </div>
    </div>
  );
};
