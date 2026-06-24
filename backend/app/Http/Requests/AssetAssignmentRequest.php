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
            'phone'       => 'required|string|max:20',
            'assign_date' => 'required|date',
            'return_date' => 'nullable|date|after_or_equal:assign_date',
            'note'        => 'nullable|string',
        ];
    }    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $assetId = $this->input('asset_id');
            if (!$assetId) return;

            $query = \App\Models\AssetAssignment::where('asset_id', $assetId)
                ->whereNull('return_date');

            $id = $this->route('asset_assignment') ?: $this->route('id');
            if ($id) {
                $query->where('id', '!=', $id);
            }

            if ($query->exists()) {
                $validator->errors()->add('asset_id', 'Aset ini sedang dipinjam, tidak bisa dipinjam lagi sebelum dikembalikan.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'asset_id.required'          => 'ID aset wajib diisi',
            'asset_id.exists'            => 'Aset tidak ditemukan',
            'user_name.required'         => 'Nama user wajib diisi',
            'phone.required'             => 'Nomor WhatsApp wajib diisi',
            'phone.max'                  => 'Nomor WhatsApp maksimal 20 karakter',
            'assign_date.required'       => 'Tanggal penugasan wajib diisi',
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