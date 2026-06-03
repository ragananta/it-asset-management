<?php

namespace App\Exports;

use App\Models\MasterAsset;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Http\Request;

class AssetsExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    protected Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function query()
    {
        $query = MasterAsset::with('category:id,name')
            ->orderBy('created_at', 'desc');

        if ($this->request->filled('search')) {
            $search = $this->request->search;
            $query->where(function ($q) use ($search) {
                $q->where('asset_code', 'like', "%{$search}%")
                  ->orWhere('asset_name', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%");
            });
        }

        if ($this->request->filled('category_id')) {
            $query->where('category_id', $this->request->category_id);
        }

        if ($this->request->filled('condition_status')) {
            $query->where('condition_status', $this->request->condition_status);
        }

        if ($this->request->filled('status')) {
            $query->where('status', $this->request->status);
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'No', 'Kode Aset', 'Nama Aset', 'Kategori', 'Brand', 'Model',
            'Serial Number', 'Vendor', 'Harga Beli (Rp)', 'Tanggal Beli',
            'Garansi Sampai', 'Kondisi', 'Status', 'Catatan',
        ];
    }

    public function map($asset): array
    {
        static $no = 0;
        $no++;

        $conditionMap = [
            'good'             => 'Good',
            'damaged'          => 'Damaged',
            'under_maintenance' => 'Maintenance',
        ];
        $statusMap = [
            'active'   => 'Aktif',
            'borrowed' => 'Dipinjam',
            'disposed' => 'Disposed',
        ];

        return [
            $no,
            $asset->asset_code        ?? '-',
            $asset->asset_name        ?? '-',
            $asset->category?->name   ?? '-',
            $asset->brand             ?? '-',
            $asset->model             ?? '-',
            $asset->serial_number     ?? '-',
            $asset->vendor            ?? '-',
            $asset->purchase_price    ?? 0,
            $asset->purchase_date?->format('d/m/Y')    ?? '-',
            $asset->warranty_expired?->format('d/m/Y') ?? '-',
            $conditionMap[$asset->condition_status ?? ''] ?? $asset->condition_status ?? '-',
            $statusMap[$asset->status ?? '']             ?? $asset->status ?? '-',
            $asset->note ?? '-',
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
        return 'Data Aset';
    }
}