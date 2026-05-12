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
        $id = $this->route('asset') ?? $this->route('id');

        return [
            'asset_code'       => 'required|string|max:100|unique:master_assets,asset_code,' . $id,
            'asset_name'       => 'required|string|max:255',
            'category_id'      => 'required|exists:categories,id',
            'location_id'      => 'nullable|exists:locations,id',
            'assigned_user_id' => 'nullable|exists:users,id',
            'brand'            => 'nullable|string|max:100',
            'model'            => 'nullable|string|max:100',
            'serial_number'    => 'nullable|string|max:100|unique:master_assets,serial_number,' . $id,
            'vendor'           => 'nullable|string|max:255',
            'purchase_date'    => 'nullable|date',
            'purchase_price'   => 'nullable|numeric|min:0',
            'warranty_expired' => 'nullable|date|after_or_equal:purchase_date',
            'condition_status' => 'nullable|in:good,damaged,under_maintenance,retired',
            'note'             => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'asset_code.required'    => 'Kode aset wajib diisi',
            'asset_code.unique'      => 'Kode aset sudah digunakan',
            'asset_name.required'    => 'Nama aset wajib diisi',
            'category_id.required'   => 'Kategori wajib dipilih',
            'category_id.exists'     => 'Kategori tidak ditemukan',
            'location_id.exists'     => 'Lokasi tidak ditemukan',
            'serial_number.unique'   => 'Serial number sudah digunakan',
            'condition_status.in'    => 'Status kondisi tidak valid. Pilih: good, damaged, under_maintenance, atau retired',
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