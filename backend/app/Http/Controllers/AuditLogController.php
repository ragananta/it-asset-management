<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index()
    {
        $data = AuditLog::with('user')->get();

        return response()->json([
            'message' => 'List of audit logs',
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|exists:master_users,id',
            'module' => 'required|string',
            'action' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $data = AuditLog::create([
            'user_id' => $request->user_id,
            'module' => $request->module,
            'action' => $request->action,
            'description' => $request->description,
            'activity_time' => now(),
        ]);

        return response()->json([
            'message' => 'Audit log created successfully',
            'data' => $data
        ], 201);
    }
}