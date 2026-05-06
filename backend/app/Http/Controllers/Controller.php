<?php

namespace App\Http\Controllers;

abstract class Controller
{
    public function show($id)
    {
        $asset = Asset::with([
            'category',
            'vendor',
            'location'
        ])->find($id);

        if (!$asset) {
            return response()->json([
                'message' => 'Asset not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Detail asset',
            'data' => $asset
        ]);
    }
}
