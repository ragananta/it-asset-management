<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SatsStoreResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->resource['code'] ?? $this->resource->code ?? '',
            'name' => $this->resource['name'] ?? $this->resource->name ?? '',
        ];
    }
}
