<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use KHQR\BakongKHQR;
use KHQR\Helpers\KHQRData;
use KHQR\Models\IndividualInfo;
use KHQR\Models\MerchantInfo;
use Illuminate\Support\Facades\Log;

class KHQRController extends Controller
{
    /**
     * Generate KHQR code and MD5 hash for a POS transaction
     */
    public function generate(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'sometimes|string|in:USD,KHR',
        ]);

        try {
            $usdAmount = round($request->input('amount'), 2);
            
            // Allow setting currency from .env (fallback to USD)
            $bakongCurrency = env('BAKONG_CURRENCY', 'USD');
            $exchangeRate = floatval(env('BAKONG_EXCHANGE_RATE', 4100));

            $currency = (strtoupper($bakongCurrency) === 'KHR') ? 'KHR' : 'USD';
            $amount = ($currency === 'KHR') ? round($usdAmount * $exchangeRate) : $usdAmount;

            // Generate dynamic unique bill number
            $billNumber = 'INV-' . time() . '-' . rand(1000, 9999);

            $response = $this->callExternalGateway('POST', '/api/generate-qr', [
                'amount' => $amount,
                'currency' => $currency,
                'billNumber' => $billNumber
            ]);

            if ($response && isset($response['success']) && $response['success'] === true) {
                return response()->json([
                    'success' => true,
                    'qr' => $response['data']['khqrString'],
                    'md5' => $response['data']['md5Hash'],
                    'amount' => $amount,
                    'currency' => $currency
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate KHQR code from gateway: ' . ($response['message'] ?? 'Unknown error'),
            ], 400);

        } catch (\Exception $e) {
            Log::error('KHQR Generation Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal server error during KHQR generation.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper to call the api.2008.run external KHQR gateway.
     */
    private function callExternalGateway(string $method, string $endpoint, ?array $payload = null)
    {
        $apiKey = env('RUN2008_API_KEY', 'khqr-202b72d1-52c6-45f2-9411-2743016c9606');
        $baseUrl = env('RUN2008_BASE_URL', 'https://api.2008.run');
        $url = rtrim($baseUrl, '/') . $endpoint;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $headers = [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
        ];
        
        if (strtoupper($method) === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($payload) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            throw new \Exception('cURL error connecting to External Gateway.');
        }

        $result = json_decode($response, true);
        return is_array($result) ? $result : [];
    }

    /**
     * Custom cURL helper to query the Bakong API.
     * Bypasses the SDK's built-in cURL to set a browser-like User-Agent (preventing CloudFront 403 blocks)
     * and disables peer verification to avoid local Windows SSL cert problems.
     */
    private function checkTransaction(string $endpoint, array $payload)
    {
        $apiToken = env('BAKONG_API_TOKEN');
        $baseUrl = env('BAKONG_API_BASE_URL', 'https://api-bakong.nbc.gov.kh');
        $url = rtrim($baseUrl, '/') . $endpoint;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiToken,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        
        // Disable SSL peer verification to prevent SSL certificate errors on local dev setups
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            throw new \Exception('cURL error connecting to Bakong gateway.');
        }

        if ($httpCode === 401) {
            throw new \Exception('Unauthorized: Bakong API token is invalid or expired.');
        }

        $result = json_decode($response, true);
        return is_array($result) ? $result : [];
    }

    /**
     * Check transaction payment status using the MD5 hash
     */
    public function checkPayment(Request $request)
    {
        $request->validate([
            'md5' => 'required|string|size:32',
        ]);

        try {
            $response = $this->callExternalGateway('POST', '/api/check-payment', [
                'md5' => $request->input('md5')
            ]);

            if ($response && isset($response['success']) && $response['success'] === true) {
                $paid = $response['data']['paid'] ?? false;
                return response()->json([
                    'success' => true,
                    'paid' => $paid,
                    'data' => $response['data'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'paid' => false,
                'message' => $response['message'] ?? 'Payment pending',
            ]);

        } catch (\Exception $e) {
            Log::error('KHQR Payment Verification Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error verifying payment status.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check transaction payment status using the Full Hash
     */
    public function checkPaymentByHash(Request $request)
    {
        $request->validate([
            'hash' => 'required|string',
        ]);

        try {
            $response = $this->checkTransaction('/v1/check_transaction_by_hash', [
                'hash' => $request->input('hash')
            ]);

            if ($response && isset($response['responseCode']) && (int)$response['responseCode'] === 0) {
                return response()->json([
                    'success' => true,
                    'data' => $response['data'] ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $response['responseMessage'] ?? 'Transaction not found or not completed.',
                'errorCode' => $response['errorCode'] ?? null
            ], 400);

        } catch (\Exception $e) {
            Log::error('KHQR Hash Verification Error: ' . $e->getMessage());

            if (str_contains(strtolower($e->getMessage()), 'unauthorized')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bakong API Authentication failed. The API token might be invalid or expired.',
                    'error' => $e->getMessage()
                ], 401);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error verifying transaction status by hash.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check transaction status for a list of Full Hashes
     */
    public function checkPaymentByHashList(Request $request)
    {
        $request->validate([
            'hashes' => 'required|array|min:1',
            'hashes.*' => 'required|string',
        ]);

        try {
            $response = $this->checkTransaction('/v1/check_transaction_by_md5_list', $request->input('hashes'));

            if ($response && isset($response['responseCode']) && (int)$response['responseCode'] === 0) {
                return response()->json([
                    'success' => true,
                    'data' => $response['data'] ?? [],
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $response['responseMessage'] ?? 'Query failed.',
                'errorCode' => $response['errorCode'] ?? null
            ], 400);

        } catch (\Exception $e) {
            Log::error('KHQR Hash List Verification Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error verifying transaction status list.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check transaction status using Short Hash, Amount, and Currency
     */
    public function checkPaymentByShortHash(Request $request)
    {
        $request->validate([
            'short_hash' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|in:USD,KHR',
        ]);

        try {
            $shortHash = $request->input('short_hash');
            $amount = floatval($request->input('amount'));
            $currency = $request->input('currency');

            $response = $this->checkTransaction('/v1/check_transaction_by_short_hash', [
                'hash' => $shortHash,
                'amount' => $amount,
                'currency' => $currency
            ]);

            if ($response && isset($response['responseCode']) && (int)$response['responseCode'] === 0) {
                return response()->json([
                    'success' => true,
                    'data' => $response['data'] ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $response['responseMessage'] ?? 'Transaction not found or details mismatch.',
                'errorCode' => $response['errorCode'] ?? null
            ], 400);

        } catch (\Exception $e) {
            Log::error('KHQR Short Hash Verification Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error verifying transaction status by short hash.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
