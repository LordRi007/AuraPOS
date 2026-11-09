<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 0. Seed Categories
        $categoriesToSeed = ['Coffee', 'Drinks', 'Food', 'Desserts'];
        foreach ($categoriesToSeed as $catName) {
            Category::create(['name' => $catName]);
        }

        // 1. Seed Users
        User::create([
            'name' => 'Administrator',
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'position' => 'Acting Manager',
            'tel' => '0889298383',
        ]);

        User::create([
            'name' => 'Cashier A',
            'username' => 'cashier',
            'password' => Hash::make('cashier123'),
            'role' => 'cashier',
            'position' => 'Employee',
            'tel' => '010883860',
        ]);

        // 2. Seed Products
        $products = [
            [
                'name' => 'Specialty Espresso',
                'category' => 'Coffee',
                'price' => 3.50,
                'stock' => 120,
                'sku' => 'CF-ESP-01',
                'description' => 'Double shot rich espresso brewed from premium Arabica beans.'
            ],
            [
                'name' => 'Matcha Latte',
                'category' => 'Drinks',
                'price' => 4.25,
                'stock' => 85,
                'sku' => 'DR-MAT-02',
                'description' => 'Ceremonial grade Japanese matcha with steamed oat milk.'
            ],
            [
                'name' => 'Caramel Macchiato',
                'category' => 'Coffee',
                'price' => 4.75,
                'stock' => 90,
                'sku' => 'CF-MAC-03',
                'description' => 'Freshly steamed milk with vanilla-flavored syrup, espresso, and caramel drizzle.'
            ],
            [
                'name' => 'Chocolate Fudge Cake',
                'category' => 'Desserts',
                'price' => 5.50,
                'stock' => 25,
                'sku' => 'DS-CHOC-04',
                'description' => 'Decadent multi-layered chocolate fudge cake.'
            ],
            [
                'name' => 'Avocado Toast',
                'category' => 'Food',
                'price' => 7.95,
                'stock' => 40,
                'sku' => 'FD-AVO-05',
                'description' => 'Sourdough toast topped with mashed avocado, cherry tomatoes, and feta.'
            ],
            [
                'name' => 'Strawberry Waffle',
                'category' => 'Desserts',
                'price' => 6.75,
                'stock' => 30,
                'sku' => 'DS-WAF-06',
                'description' => 'Crisp waffle served with fresh strawberries, cream, and maple syrup.'
            ],
            [
                'name' => 'Classic Club Sandwich',
                'category' => 'Food',
                'price' => 8.50,
                'stock' => 15,
                'sku' => 'FD-CLUB-07',
                'description' => 'Triple-decker sandwich with turkey bacon, chicken breast, lettuce, and tomato.'
            ],
            [
                'name' => 'Cold Brew Tonic',
                'category' => 'Drinks',
                'price' => 4.50,
                'stock' => 60,
                'sku' => 'DR-COLD-08',
                'description' => 'Cold brew coffee poured over premium tonic water and ice.'
            ],
        ];

        $seededProducts = [];
        foreach ($products as $prodData) {
            $seededProducts[] = Product::create($prodData);
        }

        // 3. Seed Sample Transactions (last few days for chart rendering)
        // Let's create transactions for the past 5 days
        for ($i = 4; $i >= 0; $i--) {
            $date = now()->subDays($i);
            
            // Random total and items
            $isCash = $i % 2 === 0;
            $paymentMethod = $isCash ? 'Cash' : ($i % 3 === 0 ? 'Card' : 'KHQR');
            $cashierName = $isCash ? 'Cashier A' : 'Administrator';

            $txn = Transaction::create([
                'txn_code' => 'TXN-' . (1000 + 5 - $i),
                'subtotal' => 25.50 + ($i * 12.35),
                'discount' => $i * 1.50,
                'tax' => (25.50 + ($i * 12.35) - ($i * 1.50)) * 0.10,
                'total' => (25.50 + ($i * 12.35) - ($i * 1.50)) * 1.10,
                'payment_method' => $paymentMethod,
                'cashier' => $cashierName,
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            // Add 1 or 2 items
            TransactionItem::create([
                'transaction_id' => $txn->id,
                'product_id' => $seededProducts[0]->id,
                'name' => $seededProducts[0]->name,
                'price' => $seededProducts[0]->price,
                'quantity' => 2 + $i,
            ]);

            if ($i % 2 === 0) {
                TransactionItem::create([
                    'transaction_id' => $txn->id,
                    'product_id' => $seededProducts[3]->id,
                    'name' => $seededProducts[3]->name,
                    'price' => $seededProducts[3]->price,
                    'quantity' => 1,
                ]);
            }
        }
    }
}
