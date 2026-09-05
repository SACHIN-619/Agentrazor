"""
razorpay_client.py — Dual Adapter Interface for Razorpay Test Mode & Mock Simulation.

Provides seamless switching between live Razorpay Test API and deterministic Mock Adapter.
"""

import os
import time
import uuid

# Load .env before reading env vars (critical when module imported before app.py)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import razorpay
    _RAZORPAY_SDK_AVAILABLE = True
except ImportError:
    _RAZORPAY_SDK_AVAILABLE = False


class RazorpayClientAdapter:
    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
        self.is_live_test_mode = bool(self.key_id and self.key_secret and _RAZORPAY_SDK_AVAILABLE)

        if self.is_live_test_mode:
            try:
                self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
            except Exception as e:
                print(f"[RazorpayAdapter] Live initialization warning: {e}. Falling back to Mock Adapter.")
                self.is_live_test_mode = False
        else:
            self.client = None

    def get_mode_info(self) -> dict:
        return {
            "mode": "Razorpay Test Mode" if self.is_live_test_mode else "Offline Simulation Mode",
            "is_live_sdk": self.is_live_test_mode,
            "key_id_configured": bool(self.key_id),
            "key_id_prefix": self.key_id[:12] + "..." if len(self.key_id) > 12 else self.key_id
        }

    def ping(self) -> dict:
        """Tests live connectivity to Razorpay Test API."""
        import time
        start = time.time()
        if self.is_live_test_mode:
            try:
                # Fetch 1 payment to verify API credentials work
                res = self.client.payment.all({"count": 1})
                latency_ms = int((time.time() - start) * 1000)
                return {
                    "success": True,
                    "mode": "Razorpay Test Mode",
                    "latency_ms": latency_ms,
                    "message": "Live Razorpay Test API credentials verified successfully",
                    "api_response": "OK"
                }
            except Exception as e:
                return {
                    "success": False,
                    "mode": "Razorpay Test Mode",
                    "error": str(e),
                    "message": "Razorpay API credential check failed"
                }
        return {
            "success": True,
            "mode": "Offline Simulation Mode",
            "latency_ms": 1,
            "message": "Offline Simulation Mode active — no Razorpay credentials configured"
        }

    def fetch_invoices(self) -> list:
        """Fetches payment links / invoices from Razorpay Test API."""
        if self.is_live_test_mode:
            try:
                res = self.client.payment_link.all({"count": 20})
                items = res.get("items", []) if isinstance(res, dict) else []
                return [
                    {
                        "id": item.get("id"),
                        "amount": item.get("amount", 0) / 100.0,
                        "status": item.get("status"),
                        "short_url": item.get("short_url"),
                        "created_at": item.get("created_at")
                    }
                    for item in items
                ]
            except Exception as e:
                print(f"[RazorpayAdapter] fetch_invoices error: {e}")
                return []
        return []

    def create_payment_link(self, amount: float, description: str, customer_name: str, customer_email: str) -> dict:
        """Generates a payment link (Live Test API or Mock)."""
        amount_paisa = int(amount * 100)
        reference_id = f"plink_{uuid.uuid4().hex[:10]}"

        if self.is_live_test_mode:
            try:
                payload = {
                    "amount": amount_paisa,
                    "currency": "INR",
                    "accept_partial": False,
                    "description": description,
                    "customer": {
                        "name": customer_name,
                        "email": customer_email,
                    },
                    "notify": {"sms": False, "email": True},
                    "reminder_enable": True,
                    "notes": {"source": "RazorRecover Agent"}
                }
                res = self.client.payment_link.create(payload)
                return {
                    "success": True,
                    "link_id": res.get("id", reference_id),
                    "short_url": res.get("short_url", f"https://rzp.io/i/{reference_id}"),
                    "status": res.get("status", "created"),
                    "mode": "Razorpay Test Mode"
                }
            except Exception as e:
                print(f"[RazorpayAdapter] API create_payment_link error: {e}. Using mock link.")

        # Fallback Mock Mode
        return {
            "success": True,
            "link_id": reference_id,
            "short_url": f"https://test.razorpay.com/plink/{reference_id}",
            "status": "created",
            "mode": "Offline Simulation Mode"
        }

    def trigger_payment_retry(self, case_id: str, amount: float) -> dict:
        """Simulates/triggers a payment retry action."""
        txn_id = f"pay_retry_{uuid.uuid4().hex[:8]}"
        if self.is_live_test_mode:
            # Razorpay API test order creation
            try:
                order = self.client.order.create({
                    "amount": int(amount * 100),
                    "currency": "INR",
                    "receipt": f"rcpt_{case_id}",
                    "notes": {"case_id": case_id, "action": "recovery_retry"}
                })
                return {
                    "success": True,
                    "transaction_id": order.get("id"),
                    "status": "authorized",
                    "mode": "Razorpay Test Mode"
                }
            except Exception as e:
                print(f"[RazorpayAdapter] Order creation error: {e}")

        return {
            "success": True,
            "transaction_id": txn_id,
            "status": "authorized",
            "mode": "Offline Simulation Mode"
        }

    def fetch_payment_status(self, payment_id_or_link_id: str) -> dict:
        """Fetches payment status for verification from Razorpay Test API."""
        if self.is_live_test_mode:
            try:
                if payment_id_or_link_id.startswith("plink_"):
                    res = self.client.payment_link.fetch(payment_id_or_link_id)
                    paid_amount = res.get("amount_paid", 0) / 100.0
                    is_paid = res.get("status") == "paid"
                    return {
                        "status": res.get("status"),
                        "paid_amount": paid_amount,
                        "verified": is_paid,
                        "mode": "Razorpay Test Mode"
                    }
                elif payment_id_or_link_id.startswith("pay_"):
                    res = self.client.payment.fetch(payment_id_or_link_id)
                    is_captured = res.get("status") in ["captured", "authorized"]
                    return {
                        "status": res.get("status"),
                        "paid_amount": res.get("amount", 0) / 100.0,
                        "verified": is_captured,
                        "mode": "Razorpay Test Mode"
                    }
            except Exception as e:
                print(f"[RazorpayAdapter] fetch_payment_status error: {e}")

        # Mock fallback — return pending (not auto-verified)
        return {
            "status": "created",
            "paid_amount": 0.0,
            "verified": False,
            "mode": "Offline Simulation Mode"
        }


# Singleton adapter instance
razorpay_adapter = RazorpayClientAdapter()
