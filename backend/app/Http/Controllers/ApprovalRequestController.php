<?php

namespace App\Http\Controllers;

use App\Models\ApprovalRequest;
use Illuminate\Http\Request;

class ApprovalRequestController extends Controller
{
    public function index()
    {
        $data = ApprovalRequest::with([
            'user',
            'asset'
        ])->get();

        return response()->json([
            'message' => 'List of approval requests',
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:master_users,id',
            'asset_id' => 'nullable|exists:master_assets,id',
            'request_type' => 'required|string',
            'request_description' => 'nullable|string',
            'request_date' => 'required|date',
        ]);

        $data = ApprovalRequest::create([
            'user_id' => $request->user_id,
            'asset_id' => $request->asset_id,
            'request_type' => $request->request_type,
            'request_description' => $request->request_description,
            'status' => 'Pending',
            'request_date' => $request->request_date,
        ]);

        return response()->json([
            'message' => 'Approval request created successfully',
            'data' => $data
        ], 201);
    }
}