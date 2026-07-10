<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SatsBagDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'barcode'    => $this->asset_code,
            'name'       => $this->asset_name,
            'store_name' => $this->store_name ?? '-',
            'assets'     => $this->containedAssets->map(function ($child) {
                return [
                    'asset_code' => $child->asset_code,
                    'asset_name' => $child->asset_name,
                    'condition'  => $child->condition_status ?? '-',
                ];
            })->values()->toArray(),
        ];
    }
}
