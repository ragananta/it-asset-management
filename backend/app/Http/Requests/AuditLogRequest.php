<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class AuditLogRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'asset_id'    => 'nullable|exists:master_assets,id',
            'action'      => 'required|in:repair,renew,update,replace',
            'description' => 'required|string',
            'pic'         => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'action.required' => 'Action wajib dipilih',
            'action.in'       => 'Action tidak valid. Pilih: repair, renew, update, atau replace',
            'description.required' => 'Deskripsi wajib diisi',
            'pic.required'    => 'PIC wajib diisi',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false, 'message' => 'Validation error', 'errors' => $validator->errors(),
        ], 422));
    }
}