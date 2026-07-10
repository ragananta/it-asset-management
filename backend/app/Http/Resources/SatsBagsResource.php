<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SatsBagsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $logicalStatus = 'available';
        if ($this->condition_status === 'under_maintenance') {
            $logicalStatus = 'maintenance';
        } elseif ($this->status === 'borrowed') {
            $logicalStatus = 'borrowed';
        } elseif ($this->status === 'disposed') {
            $logicalStatus = 'lost';
        }

        return [
            'barcode'    => $this->asset_code,
            'name'       => $this->asset_name,
            'store_name' => $this->store_name ?? '-',
            'status'     => $logicalStatus,
        ];
    }
}
