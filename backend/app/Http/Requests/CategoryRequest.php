<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => 'required|string|max:255',
            'code'        => 'required|string|max:50',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = preg_replace('/\s+/', ' ', trim((string) $this->input('name', '')));
        $code = preg_replace('/\s+/', ' ', trim((string) $this->input('code', '')));

        $this->merge([
            'name' => mb_convert_case(mb_strtolower($name), MB_CASE_TITLE, 'UTF-8'),
            'code' => mb_strtoupper($code, 'UTF-8'),
            'description' => $this->filled('description')
                ? trim((string) $this->input('description'))
                : null,
        ]);
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama kategori wajib diisi',
            'code.required' => 'Kode kategori wajib diisi',
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
