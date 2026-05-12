export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
          <h2 style={{margin:0}}>{title}</h2>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}
