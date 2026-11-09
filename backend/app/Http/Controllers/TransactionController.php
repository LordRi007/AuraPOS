<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function index()
    {
        // Fetch all transactions with nested items, newest first
        $transactions = Transaction::with('items')->latest()->get();
        
        // Format response to match the exact frontend structure
        return response()->json($transactions);
    }

    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'subtotal' => 'required|numeric',
            'discount' => 'required|numeric',
            'tax' => 'required|numeric',
            'total' => 'required|numeric',
            'payment_method' => 'required|string',
            'cashier' => 'required|string',
        ]);

        $transaction = DB::transaction(function () use ($request) {
            // Generate unique txn_code
            $count = Transaction::count();
            $txnCode = 'TXN-' . (1001 + $count);

            // 1. Create Transaction
            $txn = Transaction::create([
                'txn_code' => $txnCode,
                'subtotal' => $request->subtotal,
                'discount' => $request->discount,
                'tax' => $request->tax,
                'total' => $request->total,
                'payment_method' => $request->payment_method,
                'cashier' => $request->cashier,
            ]);

            // 2. Process items & deduct stocks
            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['id']);

                if ($product->stock < $item['quantity']) {
                    throw new \Exception("Product {$product->name} does not have enough stock. Remaining: {$product->stock}");
                }

                // Deduct stock
                $product->decrement('stock', $item['quantity']);

                // Create transaction item
                TransactionItem::create([
                    'transaction_id' => $txn->id,
                    'product_id' => $product->id,
                    'name' => $item['name'] ?? $product->name,
                    'price' => $item['price'] ?? $product->price,
                    'quantity' => $item['quantity'],
                ]);
            }

            return $txn;
        });

        // Load items relation to return the complete object
        $transaction->load('items');

        return response()->json($transaction, 201);
    }

    public function refund($id)
    {
        try {
            $transaction = DB::transaction(function () use ($id) {
                // Find transaction by ID or code
                $txn = Transaction::with('items')->where('id', $id)->orWhere('txn_code', $id)->firstOrFail();
                
                if ($txn->status === 'refunded') {
                    throw new \Exception("Transaction {$txn->txn_code} has already been refunded.");
                }
                
                // Return items back to stock
                foreach ($txn->items as $item) {
                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->increment('stock', $item->quantity);
                    }
                }
                
                // Mark as refunded
                $txn->status = 'refunded';
                $txn->save();
                
                return $txn;
            });
            
            return response()->json($transaction);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
