<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceSchedule;
use Illuminate\Http\Request;

class MaintenanceScheduleController extends Controller
{
    public function index()
    {
        $data = MaintenanceSchedule::with('asset')->get();

        return response()->json([
            'message' => 'List of maintenance schedules',
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'asset_id' => 'required|exists:master_assets,id',
            'scheduled_date' => 'required|date',
            'maintenance_type' => 'required|string',
            'priority' => 'nullable|string',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $data = MaintenanceSchedule::create([
            'asset_id' => $request->asset_id,
            'scheduled_date' => $request->scheduled_date,
            'maintenance_type' => $request->maintenance_type,
            'priority' => $request->priority ?? 'Medium',
            'status' => $request->status ?? 'Pending',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Maintenance schedule created successfully',
            'data' => $data
        ], 201);
    }
}