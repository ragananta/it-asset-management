<?php

namespace App\Http\Controllers;

use App\Models\AssetAssignment;
use Illuminate\Http\Request;

class AssetAssignmentController extends Controller
{
    /**
     * GET semua assignment
     */
    public function index()
    {
        $assignments = AssetAssignment::with([
            'asset',
            'user'
        ])->get();

        return response()->json([
            'message' => 'List of asset assignments',
            'data' => $assignments
        ], 200);
    }

    /**
     * POST assignment asset ke user
     */
    public function store(Request $request)
    {
        $request->validate([
            'asset_id' => 'required|exists:master_assets,id',
            'user_id' => 'required|exists:master_users,id',
            'assigned_date' => 'required|date',
            'return_date' => 'nullable|date',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $assignment = AssetAssignment::create([
            'asset_id' => $request->asset_id,
            'user_id' => $request->user_id,
            'assigned_date' => $request->assigned_date,
            'return_date' => $request->return_date,
            'status' => $request->status ?? 'Assigned',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Asset assigned successfully',
            'data' => $assignment
        ], 201);
    }
}