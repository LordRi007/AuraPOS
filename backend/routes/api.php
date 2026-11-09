<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\KHQRController;
use App\Http\Controllers\CategoryController;
use Illuminate\Support\Facades\Route;

// Public login endpoint
Route::post('/login', [AuthController::class, 'login']);

// Authenticated routes protected by Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Authentication
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Products inventory catalog
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Categories management CRUD
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // User management CRUD
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // Sales transactions logging
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::post('/transactions/{id}/refund', [TransactionController::class, 'refund']);

    // KHQR Payments Integration
    Route::post('/khqr/generate', [KHQRController::class, 'generate']);
    Route::post('/khqr/check-payment', [KHQRController::class, 'checkPayment']);
    Route::post('/khqr/check-payment-hash', [KHQRController::class, 'checkPaymentByHash']);
    Route::post('/khqr/check-payment-hash-list', [KHQRController::class, 'checkPaymentByHashList']);
    Route::post('/khqr/check-payment-short-hash', [KHQRController::class, 'checkPaymentByShortHash']);

    // Dashboard analytics
    Route::get('/stats', [StatsController::class, 'index']);
});
