<?php

namespace App\Exports;

use App\Models\MaintenanceLog;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Http\Request;

class MaintenanceExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    protected Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function query()
    {
        $query = MaintenanceLog::with('asset:id,asset_name,asset_code');

        $sortBy = $this->request->get('sort_by', 'date');
        $sortOrder = strtolower($this->request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['date', 'cost', 'pic', 'status', 'created_at', 'updated_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
            if ($sortBy !== 'id') {
                $query->orderBy('id', 'desc');
            }
        } else {
            $query->orderByDesc('date')
                  ->orderByDesc('created_at')
                  ->orderByDesc('id');
        }

        if ($this->request->filled('status')) {
            $query->where('status', $this->request->status);
        }

        if ($this->request->filled('pic')) {
            $query->where('pic', $this->request->pic);
        }

        if ($this->request->filled('date_from') && $this->request->filled('date_to')) {
            $query->whereBetween('date', [$this->request->date_from, $this->request->date_to]);
        }

        if ($this->request->filled('search')) {
            $search = $this->request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('pic', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'No',
            'Kode Aset',
            'Nama Aset',
            'Tanggal',
            'Deskripsi',
            'Biaya (Rp)',
            'PIC / Teknisi',
            'Status',
        ];
    }

    public function map($log): array
    {
        static $no = 0;
        $no++;

        return [
            $no,
            $log->asset?->asset_code ?? '-',
            $log->asset?->asset_name ?? '-',
            $log->date?->format('d/m/Y') ?? '-',
            $log->description,
            $log->cost ?? 0,
            $log->pic,
            $log->status === 'completed' ? 'Selesai' : 'Berlangsung',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => 'solid', 'startColor' => ['rgb' => '3B82F6']],
                'alignment' => ['horizontal' => 'center'],
            ],
        ];
    }

    public function title(): string
    {
        return 'Maintenance Log';
    }
}