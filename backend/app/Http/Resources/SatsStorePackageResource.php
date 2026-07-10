<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SatsStorePackageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'store_code' => $this->resource['store_code'],
            'store_name' => $this->resource['store_name'],
            'assets'     => collect($this->resource['assets'])->map(function ($item) {
                return [
                    'asset_code' => $item['asset_code'] ?? $item->asset_code ?? '',
                    'asset_name' => $item['asset_name'] ?? $item->asset_name ?? '',
                    'condition'  => $item['condition'] ?? $item['condition_status'] ?? $item->condition_status ?? '-',
                ];
            })->toArray(),
        ];
    }
}
