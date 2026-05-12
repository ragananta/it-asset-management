export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="modal-overlay">
      <div className="confirm-dialog">
        <div className="confirm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-text">{message}</div>
        <div className="confirm-btns">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}