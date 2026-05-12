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
    // Route::apiResource('locations', LocationController::class); // uncomment jika LocationController dibuat

    // Master Assets
    Route::apiResource('assets', MasterAssetController::class);

    // Asset Properties
    Route::apiResource('asset-properties', AssetPropertyController::class);

    // Maintenance Logs
    Route::apiResource('maintenance-logs', MaintenanceLogController::class);

    // Audit Logs
    Route::apiResource('audit-logs', AuditLogController::class);

    // Asset Assignments
    Route::apiResource('asset-assignments', AssetAssignmentController::class);

    // Logs (read-only)
    Route::get('logs',      [LogController::class, 'index']);
    Route::get('logs/{id}', [LogController::class, 'show']);
});