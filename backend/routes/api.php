<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\MasterAssetController;
use App\Http\Controllers\AssetPropertyController;
use App\Http\Controllers\MaintenanceLogController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AssetAssignmentController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\PlotingDeviceController;
use App\Http\Controllers\StorePackageController;

/*
|--------------------------------------------------------------------------
| API Routes - IT Asset Management
|--------------------------------------------------------------------------
*/

// ═══════════════════════════════════════════════
// AUTH - Public Routes (tidak perlu token)
// ═══════════════════════════════════════════════
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

// ═══════════════════════════════════════════════
// PROTECTED ROUTES (wajib Bearer Token)
// ═══════════════════════════════════════════════
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Locations
    Route::apiResource('locations', LocationController::class);

    // Export Master Assets
    Route::get('/assets/export', [MasterAssetController::class, 'export']);
    Route::get('/assets/generate-code/{categoryId}', [MasterAssetController::class, 'generateCode']);
    Route::get('/assets/{id}/timeline', [MasterAssetController::class, 'timeline']);
    Route::get('/assets/lookup/{asset_code}', [MasterAssetController::class, 'lookup']);

    // Master Assets
    Route::apiResource('assets', MasterAssetController::class);

    // Asset Properties
    Route::apiResource('asset-properties', AssetPropertyController::class);

    // Export Maintenance Logs
    Route::get('/maintenance-logs/export', [MaintenanceLogController::class, 'export']);

    // Maintenance Logs
    Route::apiResource('maintenance-logs', MaintenanceLogController::class);

    // Audit Logs
    Route::apiResource('audit-logs', AuditLogController::class);

    // Export Asset Assignments
    Route::get('/asset-assignments/export', [AssetAssignmentController::class, 'export']);

    // Asset Assignments
    Route::apiResource('asset-assignments', AssetAssignmentController::class);

    // Logs (read-only)
    Route::get('logs',      [LogController::class, 'index']);
    Route::get('logs/{id}', [LogController::class, 'show']);

    // Restore Category (soft delete)
    Route::post('/categories/{id}/restore', [CategoryController::class, 'restore']);

    // Tanpa perlu use statement
    Route::get('/karyawan', [\App\Http\Controllers\KaryawanController::class, 'index']);
    
    // Export Dashboard Data
    Route::get('/dashboard/export', [DashboardController::class, 'export']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Reports
    Route::get('/reports/assets-by-employee/export', [ReportController::class, 'exportByEmployee']);
    Route::get('/reports/assets-by-employee', [ReportController::class, 'assetsByEmployee']);

    // Stores Options
    Route::get('/stores/options', [PlotingDeviceController::class, 'storeOptions']);

    // Ploting Devices CRUD & Timeline
    Route::get('/ploting-devices/scan/{asset_code}', [PlotingDeviceController::class, 'scan']);
    Route::get('/ploting-devices/{id}/timeline', [PlotingDeviceController::class, 'timeline']);
    Route::apiResource('ploting-devices', PlotingDeviceController::class);

    // Store Packages
    Route::get('/store-packages', [StorePackageController::class, 'index']);
    Route::get('/store-packages/{store_code}', [StorePackageController::class, 'show']);
    Route::post('/store-packages', [StorePackageController::class, 'store']);
    Route::put('/store-packages/{store_code}', [StorePackageController::class, 'update']);
    Route::delete('/store-packages/{store_code}', [StorePackageController::class, 'destroy']);

    // Fonnte WhatsApp Notifications
    Route::post('/fonnte/send', [\App\Http\Controllers\FonnteController::class, 'send']);

});
