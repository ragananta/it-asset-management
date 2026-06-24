<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Models\MasterAsset;
use App\Models\AssetContainer;

class PlotingDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'container_asset_id' => 'required|exists:master_assets,id',
            'asset_ids'          => 'nullable|array',
            'asset_ids.*'        => 'exists:master_assets,id',
            'store_id'           => 'required|integer',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $containerId = $this->input('container_asset_id');
            if (!$containerId) {
                return;
            }

            // Validate container
            $container = MasterAsset::with('category')->find($containerId);
            if ($container) {
                if (!$container->category || $container->category->code !== 'CAT-TAS') {
                    $validator->errors()->add('container_asset_id', 'Asset kontainer harus berkategori Tas.');
                }
                if ($container->condition_status === 'retired') {
                    $validator->errors()->add('container_asset_id', 'Tas yang sudah retired tidak boleh digunakan.');
                }
                if ($container->status === 'disposed') {
                    $validator->errors()->add('container_asset_id', 'Tas yang sudah lost/disposed tidak boleh digunakan.');
                }
            }

            // Validate contained assets
            $assetIds = $this->input('asset_ids', []);
            if (is_array($assetIds)) {
                $currentContainerId = $this->route('ploting_device') ?? $this->route('id');
                if (!$currentContainerId) {
                    // Fallback to containerId if it's route parameter
                    $currentContainerId = $containerId;
                }

                foreach ($assetIds as $assetId) {
                    // Cannot contain itself
                    if ($assetId == $containerId) {
                        $validator->errors()->add('asset_ids', 'Tas tidak boleh berisi dirinya sendiri.');
                        continue;
                    }

                    $asset = MasterAsset::with('category')->find($assetId);
                    if ($asset) {
                        if ($asset->category && $asset->category->code === 'CAT-TAS') {
                            $validator->errors()->add('asset_ids', 'Asset kategori Tas tidak boleh dimasukkan ke dalam Tas lain.');
                        }
                        if ($asset->condition_status === 'retired') {
                            $validator->errors()->add('asset_ids', 'Asset yang sudah retired tidak boleh dimasukkan ke dalam Tas.');
                        }
                        if ($asset->status === 'disposed') {
                            $validator->errors()->add('asset_ids', 'Asset yang sudah lost/disposed tidak boleh dimasukkan ke dalam Tas.');
                        }
                        if ($asset->status === 'borrowed') {
                            $validator->errors()->add('asset_ids', "{$asset->asset_name} sedang dipinjam dan tidak boleh dimasukkan ke dalam Tas.");
                        }

                        // Check if already in another container
                        $query = AssetContainer::with('containerAsset')->where('contained_asset_id', $assetId);
                        if ($currentContainerId) {
                            $query->where('container_asset_id', '!=', $currentContainerId);
                        }
                        $existingMapping = $query->first();
                        if ($existingMapping) {
                            $parentName = $existingMapping->containerAsset?->asset_name ?? 'lain';
                            $validator->errors()->add('asset_ids', "{$asset->asset_name} sudah berada di dalam Asset Package {$parentName}.");
                        }

                        // Check if already in a Store Package
                        $storeMapping = \App\Models\StoreAssetMapping::where('asset_id', $assetId)->first();
                        if ($storeMapping) {
                            $validator->errors()->add('asset_ids', "{$asset->asset_name} sudah berada di dalam Store Package {$storeMapping->store_name}.");
                        }
                    }
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'container_asset_id.required' => 'Asset Tas wajib diisi',
            'container_asset_id.exists'   => 'Asset Tas tidak ditemukan',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors'  => $validator->errors(),
        ], 422));
    }
}
