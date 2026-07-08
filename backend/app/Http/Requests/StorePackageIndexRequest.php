<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StorePackageIndexRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'page'     => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'search'   => 'nullable|string|max:100',
            'sort'     => 'nullable|string|in:store_code,store_name,total_assets,created_at',
            'order'    => 'nullable|string|in:asc,desc',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'page'     => $this->filled('page') ? (int) $this->input('page') : 1,
            'per_page' => $this->filled('per_page') ? (int) $this->input('per_page') : 10,
            'sort'     => $this->input('sort') ?? 'store_code',
            'order'    => strtolower($this->input('order') ?? 'asc') === 'desc' ? 'desc' : 'asc',
        ]);
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422)
        );
    }
}
