<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class MasterAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $asset = $this->route('asset') ?? $this->route('id');
        $id = is_object($asset) ? $asset->id : $asset;

        return [
            'asset_code'       => 'nullable|string|max:100|unique:master_assets,asset_code,' . $id,
            'asset_name'       => 'required|string|max:255',
            'category_id'      => 'required|exists:categories,id',
            'category_name'    => 'nullable|string|max:100',

            'location_id'      => 'nullable|exists:locations,id',
            'user_name'        => 'nullable|string|max:100',

            'brand'            => 'nullable|string|max:100',
            'model'            => 'nullable|string|max:100',
            'serial_number'    => 'nullable|string|max:100|unique:master_assets,serial_number,' . $id,
            'vendor'           => 'nullable|string|max:255',
            'purchase_date'    => 'nullable|date',
            'purchase_price'   => 'nullable|numeric|min:0',
            'warranty_expired' => 'nullable|date|after_or_equal:purchase_date',
            'condition_status' => 'nullable|in:good,damaged,under_maintenance,retired',

            // ✅ TAMBAHAN: field status
            'status'           => 'nullable|in:active,borrowed,disposed',

            'note'             => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'asset_code.unique'               => 'Kode aset sudah digunakan',
            'asset_name.required'             => 'Nama aset wajib diisi',
            'category_id.required'            => 'Kategori wajib dipilih',
            'category_id.exists'              => 'Kategori tidak ditemukan',
            'location_id.exists'              => 'Lokasi tidak ditemukan',
            'serial_number.unique'            => 'Serial number sudah digunakan',
            'condition_status.in'             => 'Kondisi tidak valid. Pilih: good, damaged, under_maintenance, atau retired',
            'status.in'                       => 'Status tidak valid. Pilih: active, borrowed, atau disposed',
            'warranty_expired.after_or_equal' => 'Tanggal garansi tidak boleh sebelum tanggal pembelian',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422)
        );
    }
}
