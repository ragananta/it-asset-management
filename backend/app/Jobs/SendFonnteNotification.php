<?php

namespace App\Jobs;

use App\Services\FonnteService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendFonnteNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $type, // 'borrowed' | 'returned'
        public string $phone,
        public string $borrowerName,
        public string $assetName,
        public $assignDate,
        public $returnDate = null,
    ) {}

    public function handle(FonnteService $fonnte): void
    {
        if ($this->type === 'borrowed') {
            $fonnte->notifyBorrowed(
                phone: $this->phone,
                borrowerName: $this->borrowerName,
                assetName: $this->assetName,
                assignDate: $this->assignDate,
                returnDate: $this->returnDate,
            );
        } else {
            $fonnte->notifyReturned(
                phone: $this->phone,
                borrowerName: $this->borrowerName,
                assetName: $this->assetName,
                returnDate: $this->returnDate,
            );
        }
    }
}