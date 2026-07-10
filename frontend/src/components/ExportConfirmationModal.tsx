import { Download } from "lucide-react";

interface ExportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ExportConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: ExportConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Modal Header Icon */}
        <div className="bg-teal-50 p-6 flex flex-col items-center text-center gap-3 border-b border-teal-100">
          <div className="bg-teal-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg animate-pulse">
            <Download className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Export Data</h3>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Anda akan mengunduh data sesuai filter yang sedang diterapkan.
            <br />
            Jika tidak ada filter yang dipilih, seluruh data yang tersedia akan diekspor.
          </p>
          <p className="text-xs font-semibold text-slate-700">
            Apakah Anda ingin melanjutkan?
          </p>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full border border-gray-250 hover:bg-slate-100 transition text-xs font-bold text-slate-500"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="h-9 px-5 bg-teal-600 hover:bg-teal-700 text-white transition text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
