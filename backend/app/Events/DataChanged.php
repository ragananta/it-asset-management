<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DataChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $resource;
    public string $action;

    /**
     * @param string $resource  nama data yang berubah: 'assets', 'categories', 'maintenance', dll
     * @param string $action    jenis perubahan: 'created', 'updated', 'deleted'
     */
    public function __construct(string $resource, string $action)
    {
        $this->resource = $resource;
        $this->action   = $action;
    }

    /**
     * Broadcast ke public channel 'data-changes'
     * Semua halaman yang subscribe ke channel ini akan dapat notifikasi
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('data-changes'),
        ];
    }

    /**
     * Nama event yang diterima frontend
     */
    public function broadcastAs(): string
    {
        return 'DataChanged';
    }
}