<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceLog;
use Illuminate\Http\Request;

class MaintenanceLogController extends Controller
{
    // GET semua maintenance log
    public function index()
    {
        $logs = MaintenanceLog::with('asset')->get();

        return response()->json([
            'message' => 'List of maintenance logs',
            'data' => $logs
        ]);
    }

    // GET detail maintenance log berdasarkan ID
    public function show($id)
    {
        $log = MaintenanceLog::with('asset')->find($id);

        if (!$log) {
            return response()->json([
                'message' => 'Maintenance log not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Detail maintenance log',
            'data' => $log
        ]);
    }

    // POST tambah maintenance log
    public function store(Request $request)
    {
        $request->validate([
            'asset_id' => 'required|exists:master_assets,id',
            'maintenance_date' => 'required|date',
            'maintenance_type' => 'required',
            'description' => 'nullable',
            'cost' => 'nullable',
            'technician' => 'nullable',
            'status' => 'nullable'
        ]);

        $log = MaintenanceLog::create([
            'asset_id' => $request->asset_id,
            'maintenance_date' => $request->maintenance_date,
            'maintenance_type' => $request->maintenance_type,
            'description' => $request->description,
            'cost' => $request->cost,
            'technician' => $request->technician,
            'status' => $request->status ?? 'Pending',
        ]);

        return response()->json([
            'message' => 'Maintenance log created successfully',
            'data' => $log
        ], 201);
    }

    // PUT update maintenance log
    public function update(Request $request, $id)
    {
        $log = MaintenanceLog::find($id);

        if (!$log) {
            return response()->json([
                'message' => 'Maintenance log not found'
            ], 404);
        }

        $log->update($request->all());

        return response()->json([
            'message' => 'Maintenance log updated successfully',
            'data' => $log
        ]);
    }

    // DELETE maintenance log
    public function destroy($id)
    {
        $log = MaintenanceLog::find($id);

        if (!$log) {
            return response()->json([
                'message' => 'Maintenance log not found'
            ], 404);
        }

        $log->delete();

        return response()->json([
            'message' => 'Maintenance log deleted successfully'
        ]);
    }
}