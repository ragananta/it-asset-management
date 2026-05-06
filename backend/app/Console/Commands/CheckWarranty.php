<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Asset;
use App\Models\Notification;

class CheckWarranty extends Command
{
    protected $signature = 'warranty:check';
    protected $description = 'Check asset warranty and create notifications';

    public function handle()
    {
        $assets = Asset::whereNotNull('warranty_expiry')
            ->whereBetween('warranty_expiry', [
                now()->toDateString(),
                now()->addDays(7)->toDateString()
            ])
            ->get();

        foreach ($assets as $asset) {

            $message = $asset->asset_name . ' warranty will expire on ' . $asset->warranty_expiry;

            $exists = Notification::where('type', 'Warranty')
                ->where('title', 'Warranty Expiring Soon')
                ->whereDate('created_at', now()->toDateString())
                ->exists();

            if ($exists) {
                continue;
            }

            Notification::create([
                'user_id' => 1,
                'title' => 'Warranty Expiring Soon',
                'message' => $message,
                'type' => 'Warranty',
                'status' => 'Unread',
                'sent_at' => now(),
            ]);
        }

        $this->info('Warranty check completed');
    }
}