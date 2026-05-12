<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class AssetAssignmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'asset_id'    => 'required|exists:master_assets,id',
            'user_name'   => 'required|string|max:255',
            'assign_date' => 'required|date',
            'return_date' => 'nullable|date|after_or_equal:assign_date',
            'note'        => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'asset_id.required'    => 'ID aset wajib diisi',
            'asset_id.exists'      => 'Aset tidak ditemukan',
            'user_name.required'   => 'Nama user wajib diisi',
            'assign_date.required' => 'Tanggal penugasan wajib diisi',
            'return_date.after_or_equal' => 'Tanggal pengembalian tidak boleh sebelum tanggal penugasan',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false, 'message' => 'Validation error', 'errors' => $validator->errors(),
        ], 422));
    }
}