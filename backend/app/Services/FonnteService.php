<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FonnteService
{
    protected string $token;
    protected string $adminPhone;

    public function __construct()
    {
        $this->token      = config('fonnte.token');
        $this->adminPhone = config('fonnte.admin_phone');
    }

    public function send(string $phone, string $message): void
    {
        try {
            Http::withHeaders([
                'Authorization' => $this->token,
            ])->post('https://api.fonnte.com/send', [
                'target'  => $phone,
                'message' => $message,
            ]);
        } catch (\Exception $e) {
            Log::error('Fonnte error: ' . $e->getMessage());
        }
    }

    public function notifyBorrowed(string $phone, string $borrowerName, string $assetName, string $assignDate, ?string $returnDate): void
    {
        $return = $returnDate ?? 'Tidak ditentukan';

        $this->send($phone,
            "Halo *{$borrowerName}*,\n\n" .
            "Kamu tercatat meminjam aset berikut:\n" .
            "📦 *{$assetName}*\n" .
            "📅 Tanggal Pinjam: {$assignDate}\n" .
            "🔁 Tanggal Kembali: {$return}\n\n" .
            "Harap jaga aset dengan baik. Terima kasih!"
        );

        $this->send($this->adminPhone,
            "📋 *Peminjaman Aset Baru*\n\n" .
            "Peminjam: *{$borrowerName}*\n" .
            "Aset: *{$assetName}*\n" .
            "Tanggal Pinjam: {$assignDate}\n" .
            "Tanggal Kembali: {$return}"
        );
    }

    public function notifyReturned(string $phone, string $borrowerName, string $assetName, string $returnDate): void
    {
        $this->send($phone,
            "Halo *{$borrowerName}*,\n\n" .
            "Pengembalian aset kamu telah dicatat:\n" .
            "📦 *{$assetName}*\n" .
            "✅ Dikembalikan pada: {$returnDate}\n\n" .
            "Terima kasih sudah mengembalikan aset tepat waktu!"
        );

        $this->send($this->adminPhone,
            "✅ *Aset Dikembalikan*\n\n" .
            "Peminjam: *{$borrowerName}*\n" .
            "Aset: *{$assetName}*\n" .
            "Dikembalikan pada: {$returnDate}"
        );
    }
}