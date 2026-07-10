<?php

namespace App\Exports;

use App\Models\AssetAssignment;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Http\Request;

class AssetByEmployeeExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    protected Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    /**
     * Ambil data assignment aktif (belum dikembalikan), urutkan per nama karyawan.
     */
    public function collection()
    {
        $query = AssetAssignment::whereNull('return_date')
            ->with([
                'asset' => fn($q) => $q->select('id', 'asset_name', 'asset_code', 'category_id', 'condition_status', 'status', 'purchase_price'),
                'asset.category' => fn($q) => $q->select('id', 'name'),
            ]);

        // Filter pencarian berdasarkan nama karyawan, nama aset, atau kode aset
        if ($this->request->filled('search')) {
            $search = $this->request->search;
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhereHas('asset', function ($assetQuery) use ($search) {
                      $assetQuery->where('asset_name', 'like', "%{$search}%")
                                ->orWhere('asset_code', 'like', "%{$search}%");
                  });
            });
        }

        $results = $query->orderBy('user_name', 'ASC')
            ->orderBy('assign_date', 'DESC')
            ->orderBy('id', 'DESC')
            ->get();

        // Filter berdasarkan department (cross-reference dengan API karyawan)
        if ($this->request->filled('department')) {
            $karyawanService = app(\App\Services\KaryawanService::class);
            $karyawanList = $karyawanService->getAllActiveKaryawan();
            $department = $this->request->department;

            // Ambil nama-nama karyawan yang sesuai department
            $matchingNames = collect($karyawanList)
                ->filter(fn($k) => ($k['departemen'] ?? '') === $department)
                ->pluck('name')
                ->toArray();

            // Filter data hasil query hanya yang namanya cocok
            $results = $results->filter(function ($item) use ($matchingNames) {
                return in_array($item->user_name, $matchingNames);
            })->values();
        }

        // Apply sorting if provided
        if ($this->request->filled('sort_by')) {
            $sortBy = $this->request->sort_by;
            $sortOrder = strtolower($this->request->get('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
            
            if ($sortBy === 'user_name') {
                $results = $sortOrder === 'desc'
                    ? $results->sortByDesc('user_name', SORT_NATURAL | SORT_FLAG_CASE)
                    : $results->sortBy('user_name', SORT_NATURAL | SORT_FLAG_CASE);
            }
        }

        return $results->values();
    }

    public function headings(): array
    {
        return [
            'No', 'Nama Karyawan', 'Kode Aset', 'Nama Aset',
            'Kategori', 'Kondisi', 'Status', 'Nilai Aset', 'Tgl Pinjam',
        ];
    }

    public function map($item): array
    {
        static $no = 0;
        $no++;

        return [
            $no,
            $item->user_name ?? '-',
            $item->asset?->asset_code ?? '-',
            $item->asset?->asset_name ?? '-',
            $item->asset?->category?->name ?? '-',
            $item->asset?->condition_status ?? '-',
            $item->asset?->status ?? '-',
            $item->asset?->purchase_price ?? 0,
            $item->assign_date?->format('d/m/Y') ?? '-',
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
        return 'Aset Per Karyawan';
    }
}
