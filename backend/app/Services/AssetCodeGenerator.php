<?php

namespace App\Services;

use App\Models\Category;
use App\Models\MasterAsset;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class AssetCodeGenerator
{
    public function generateForCategory(int $categoryId): string
    {
        $category = Category::query()->find($categoryId);

        if (! $category) {
            throw new ModelNotFoundException('Kategori tidak ditemukan');
        }

        $categoryCode = $this->normalizeCategoryCode($category->code);
        $prefix = "AST-{$categoryCode}-";

        $lastAssetCode = MasterAsset::query()
            ->where('category_id', $categoryId)
            ->where('asset_code', 'like', $prefix . '%')
            ->orderByDesc('asset_code')
            ->value('asset_code');

        $lastNumber = 0;

        if ($lastAssetCode && preg_match('/-(\d+)$/', $lastAssetCode, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        do {
            $lastNumber++;
            $nextCode = $prefix . str_pad((string) $lastNumber, 3, '0', STR_PAD_LEFT);
        } while (MasterAsset::query()->where('asset_code', $nextCode)->exists());

        return $nextCode;
    }

    private function normalizeCategoryCode(string $code): string
    {
        $code = strtoupper(trim($code));

        return preg_replace('/^CAT[-_]/', '', $code) ?: $code;
    }
}
