<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\MaintenanceLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AssetAssignmentController;
use App\Http\Controllers\MaintenanceScheduleController;
use App\Http\Controllers\ApprovalRequestController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MasterUserController;

//
// 🔓 PUBLIC ROUTES
//
Route::post('/login', [AuthController::class, 'login']);

// =========================
    // 🔥 MASTER DATA COMBINED (INI YANG KAMU BUTUH)
    // =========================
    Route::get('/master-data', function () {
        return response()->json([
            'categories' => \App\Models\Category::all(),
            'vendors' => \App\Models\Vendor::all(),
            'users' => \App\Models\MasterUser::all(),
            'locations' => \App\Models\Location::all(),
        ]);
    });

//
// 🔐 PROTECTED ROUTES
//
Route::middleware('auth:sanctum')->group(function () {

    // AUTH
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // =========================
    // ASSETS
    // =========================
    Route::apiResource('assets', AssetController::class);

    // =========================
    // MASTER DATA CRUD
    // =========================
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('vendors', VendorController::class);
    Route::apiResource('locations', LocationController::class);
    Route::apiResource('master-users', MasterUserController::class);

    // =========================
    // MAINTENANCE
    // =========================
    Route::get('/maintenance-logs', [MaintenanceLogController::class, 'index']);
    Route::post('/maintenance-logs', [MaintenanceLogController::class, 'store']);

    Route::get('/maintenance-schedules', [MaintenanceScheduleController::class, 'index']);
    Route::post('/maintenance-schedules', [MaintenanceScheduleController::class, 'store']);

    // =========================
    // ASSET ASSIGNMENT
    // =========================
    Route::get('/asset-assignments', [AssetAssignmentController::class, 'index']);
    Route::post('/asset-assignments', [AssetAssignmentController::class, 'store']);

    // =========================
    // APPROVAL
    // =========================
    Route::get('/approval-requests', [ApprovalRequestController::class, 'index']);
    Route::post('/approval-requests', [ApprovalRequestController::class, 'store']);

    // =========================
    // AUDIT
    // =========================
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::post('/audit-logs', [AuditLogController::class, 'store']);

    // =========================
    // NOTIFICATIONS
    // =========================
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::get('/notifications/{id}', [NotificationController::class, 'show']);
    Route::put('/notifications/{id}', [NotificationController::class, 'update']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications/check-warranty', [NotificationController::class, 'checkWarranty']);

    // =========================
    // DASHBOARD
    // =========================
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/chart/assets', [DashboardController::class, 'assetChart']);
    Route::get('/dashboard/chart/maintenance', [DashboardController::class, 'maintenanceChart']);
    Route::get('/dashboard/recent-assets', [DashboardController::class, 'recentAssets']);

    // =========================
    // REPORTS
    // =========================
    Route::get('/reports/assets', [ReportController::class, 'exportAssets']);
    Route::get('/reports/assets/pdf', [ReportController::class, 'exportAssetsPdf']);

});