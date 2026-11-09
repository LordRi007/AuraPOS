<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function index()
    {
        $totalSales = Transaction::where('status', '!=', 'refunded')->sum('total');
        $totalTxns = Transaction::where('status', '!=', 'refunded')->count();
        $lowStockCount = Product::where('stock', '<=', 10)->count();

        // Calculate total items sold excluding refunded ones
        $itemsSold = TransactionItem::whereHas('transaction', function ($query) {
            $query->where('status', '!=', 'refunded');
        })->sum('quantity');

        // Compile last 7 days sales history
        $salesHistory = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dayLabel = $date->format('D'); // e.g. "Mon", "Tue"

            $dayTotal = Transaction::where('status', '!=', 'refunded')
                ->whereDate('created_at', $date->toDateString())
                ->sum('total');

            $salesHistory[] = [
                'day' => $dayLabel,
                'amount' => round((float)$dayTotal, 2),
            ];
        }

        return response()->json([
            'totalSales' => round((float)$totalSales, 2),
            'totalTransactions' => $totalTxns,
            'itemsSold' => (int)$itemsSold,
            'lowStockCount' => $lowStockCount,
            'salesHistory' => $salesHistory,
        ]);
    }
}
