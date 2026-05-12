<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class AssetPropertyRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'asset_id'      => 'required|exists:master_assets,id',
            'property_name' => 'required|string|max:100',
            'value'         => 'nullable|string',
            'note'          => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'asset_id.required'      => 'ID aset wajib diisi',
            'asset_id.exists'        => 'Aset tidak ditemukan',
            'property_name.required' => 'Nama properti wajib diisi',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false, 'message' => 'Validation error', 'errors' => $validator->errors(),
        ], 422));
    }
}