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
        $this->token      = config('fonnte.token') ?? '';
        $this->adminPhone = config('fonnte.admin_phone') ?? '';
    }

    public function send(string $phone, string $message): void
    {
        if (empty($this->token)) {
            Log::warning('Fonnte token is not configured. Skipping WhatsApp notification.');
            return;
        }

        if (empty($phone)) {
            Log::warning('Recipient phone number is empty. Skipping WhatsApp notification.');
            return;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => $this->token,
            ])->post('https://api.fonnte.com/send', [
                'target'  => $phone,
                'message' => $message,
            ]);

            Log::info('Fonnte response', [
                'phone'  => $phone,
                'status' => $response->status(),
                'body'   => $response->json(),
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

        if (!empty($this->adminPhone)) {
            $this->send($this->adminPhone,
                "📋 *Peminjaman Aset Baru*\n\n" .
                "Peminjam: *{$borrowerName}*\n" .
                "Aset: *{$assetName}*\n" .
                "Tanggal Pinjam: {$assignDate}\n" .
                "Tanggal Kembali: {$return}"
            );
        }
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

        if (!empty($this->adminPhone)) {
            $this->send($this->adminPhone,
                "✅ *Aset Dikembalikan*\n\n" .
                "Peminjam: *{$borrowerName}*\n" .
                "Aset: *{$assetName}*\n" .
                "Dikembalikan pada: {$returnDate}"
            );
        }
    }

    public function notifyMaintenanceCompleted(string $phone, string $borrowerName, string $assetName, string $assetCode): void
    {
        $this->send($phone,
            "Halo *{$borrowerName}*,\n\n" .
            "Maintenance untuk aset yang sedang Anda pinjam telah selesai.\n\n" .
            "Detail Aset:\n" .
            "• Nama Aset: *{$assetName}*\n" .
            "• Kode Aset: *{$assetCode}*\n\n" .
            "Silakan menghubungi Admin IT apabila memerlukan informasi lebih lanjut.\n\n" .
            "Terima kasih."
        );

        if (!empty($this->adminPhone)) {
            $this->send($this->adminPhone,
                "🔧 *Maintenance Selesai*\n\n" .
                "Peminjam: *{$borrowerName}*\n" .
                "Aset: *{$assetName}* ({$assetCode})\n" .
                "Status: Selesai"
            );
        }
    }
}