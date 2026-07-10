<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SatsAssetLookupResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'asset_code' => $this->resource['asset_code'] ?? $this->resource->asset_code ?? '',
            'asset_name' => $this->resource['asset_name'] ?? $this->resource->asset_name ?? '',
            'asset_type' => $this->resource['asset_type'] ?? '',
            'status'     => $this->resource['status'] ?? $this->resource->status ?? '',
            'condition'  => $this->resource['condition'] ?? $this->resource['condition_status'] ?? $this->resource->condition_status ?? '-',
        ];
    }
}
