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
    }

    public function store(AssetAssignmentRequest $request)
    {
        try {
            $asset = MasterAsset::find($request->asset_id);
            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            // ── Cek apakah aset sedang dipinjam ──────────────────────────────
            $alreadyBorrowed = AssetAssignment::where('asset_id', $request->asset_id)
                ->whereNull('return_date')
                ->exists();

            if ($alreadyBorrowed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aset ini sedang dipinjam dan belum dikembalikan.',
                    'errors'  => [
                        'asset_id' => ['Aset ini sedang dipinjam, tidak bisa dipinjam lagi sebelum dikembalikan.']
                    ],
                ], 422);
            }

            $assignment = AssetAssignment::create($request->validated());

            $asset->update(['assigned_user_id' => null]);

            $this->writeLog($request, 'create_data', "Aset '{$asset->asset_name}' ditugaskan kepada '{$assignment->user_name}'");

            if ($assignment->phone) {
                $this->fonnte->notifyBorrowed(
                    phone:        $assignment->phone,
                    borrowerName: $assignment->user_name,
                    assetName:    $asset->asset_name,
                    assignDate:   $assignment->assign_date,
                    returnDate:   $assignment->return_date,
                );
            }

            return $this->createdResponse($assignment->load('asset'), 'Penugasan aset berhasil ditambahkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
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