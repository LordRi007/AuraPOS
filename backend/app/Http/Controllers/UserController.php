<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        // Restrict user list access to admins
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $users = User::orderBy('created_at', 'desc')->get();
        return response()->json($users);
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'password' => 'required|string|min:6',
            'role' => ['required', Rule::in(['admin', 'cashier'])],
            'position' => 'nullable|string|max:255',
            'tel' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'position' => $request->position,
            'tel' => $request->tel,
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:6',
            'role' => ['required', Rule::in(['admin', 'cashier'])],
            'position' => 'nullable|string|max:255',
            'tel' => 'nullable|string|max:255',
        ]);

        $updateData = [
            'name' => $request->name,
            'username' => $request->username,
            'role' => $request->role,
            'position' => $request->position,
            'tel' => $request->tel,
        ];

        if ($request->filled('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return response()->json($user);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = User::findOrFail($id);

        // Prevent self-deletion
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Cannot delete currently logged in account.'], 400);
        }

        $user->delete();

        return response()->json(['success' => true]);
    }
}
