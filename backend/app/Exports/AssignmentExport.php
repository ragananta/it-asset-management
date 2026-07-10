<?php

namespace App\Exports;

use App\Models\AssetAssignment;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Http\Request;

class AssignmentExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    protected Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function query()
    {
        $query = AssetAssignment::with('asset:id,asset_name,asset_code');

        $sortBy = $this->request->get('sort_by', 'assign_date');
        $sortOrder = strtolower($this->request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['user_name', 'phone', 'assign_date', 'return_date', 'created_at', 'updated_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
            if ($sortBy !== 'id') {
                $query->orderBy('id', 'desc');
            }
        } else {
            $query->orderByDesc('assign_date')
                  ->orderByDesc('id');
        }

        if ($this->request->filled('search')) {
            $query->where('user_name', 'like', '%' . $this->request->search . '%');
        }

        if ($this->request->has('is_active')) {
            if ($this->request->is_active === '1') {
                $query->whereNull('return_date');
            } elseif ($this->request->is_active === '0') {
                $query->whereNotNull('return_date');
            }
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'No', 'Kode Aset', 'Nama Aset', 'Dipinjam Oleh',
            'No. WhatsApp', 'Tgl Pinjam', 'Tgl Kembali', 'Status', 'Catatan',
        ];
    }

    public function map($item): array
    {
        static $no = 0;
        $no++;

        return [
            $no,
            $item->asset?->asset_code ?? '-',
            $item->asset?->asset_name ?? '-',
            $item->user_name ?? '-',
            $item->phone ?? '-',
            $item->assign_date?->format('d/m/Y') ?? '-',
            $item->return_date?->format('d/m/Y') ?? '-',
            $item->return_date ? 'Dikembalikan' : 'Dipinjam',
            $item->note ?? '-',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => 'solid', 'startColor' => ['rgb' => '8B5CF6']],
                'alignment' => ['horizontal' => 'center'],
            ],
        ];
    }

    public function title(): string
    {
        return 'Data Peminjaman';
    }
}