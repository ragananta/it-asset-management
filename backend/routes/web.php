<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes - IT Asset Management
|--------------------------------------------------------------------------
*/

Route::middleware('api')->group(function () {
    // Registered outside standard /api route group solely to satisfy the Saloka integration contract.
    // Do not remove or relocate without coordinating with the Saloka integration team.
    Route::get('/auth', [\App\Http\Controllers\AuthController::class, 'integrationLogin'])->name('integration.auth');
});