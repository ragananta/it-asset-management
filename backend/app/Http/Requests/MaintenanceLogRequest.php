<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class MaintenanceLogRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'asset_id'    => 'required|exists:master_assets,id',
            'date'        => 'required|date',
            'description' => 'required|string',
            'cost'        => 'nullable|numeric|min:0',
            'pic'         => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'asset_id.required'    => 'ID aset wajib diisi',
            'asset_id.exists'      => 'Aset tidak ditemukan',
            'date.required'        => 'Tanggal maintenance wajib diisi',
            'description.required' => 'Deskripsi maintenance wajib diisi',
            'pic.required'         => 'PIC wajib diisi',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false, 'message' => 'Validation error', 'errors' => $validator->errors(),
        ], 422));
    }
}