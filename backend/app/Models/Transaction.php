<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'txn_code',
        'subtotal',
        'discount',
        'tax',
        'total',
        'payment_method',
        'cashier',
        'status',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'discount' => 'float',
        'tax' => 'float',
        'total' => 'float',
    ];

    public function items()
    {
        return $this->hasMany(TransactionItem::class);
    }
}
