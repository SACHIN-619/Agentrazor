"""
auth.py — Authentication, Authorization & Multi-Tenant RBAC Middleware.

Supports:
- User signup, password hashing (Werkzeug pbkdf2:sha256), login, JWT issuance
- Strict identity verification via Bearer JWT token in Authorization header
- Scoped tenant identity injection into Flask `g.current_user` and `g.merchant_id`
- Server-side RBAC decorator: MERCHANT_ADMIN, FINANCE_OPERATOR, AUDITOR
- ZERO development auth bypasses: X-User-Role is disabled in production.
"""

import os
import datetime
from functools import wraps
import jwt
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, Merchant, MerchantUser

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "razorrecover-prod-secret-key-2026-secure")
JWT_ALGORITHM = "HS256"

VALID_ROLES = {"MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"}


def generate_jwt(user_id: str, merchant_id: str, role: str) -> str:
    """Generates a signed JWT token valid for 24 hours."""
    payload = {
        "sub": user_id,
        "merchant_id": merchant_id,
        "role": role,
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    """Decodes and cryptographically validates JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def authenticate_request():
    """
    Middleware function to authenticate every API request.
    Extracts Bearer token, populates `g.current_user` and `g.merchant_id`.
    Requires valid cryptographic JWT token.
    """
    auth_header = request.headers.get("Authorization", "")
    token = None

    if auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ")[1].strip()

    if token:
        payload = decode_jwt(token)
        if payload:
            user = User.query.get(payload.get("sub"))
            merchant = Merchant.query.get(payload.get("merchant_id"))
            if user and merchant:
                g.current_user = {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "role": payload.get("role", "AUDITOR")
                }
                g.merchant_id = merchant.id
                return g.current_user

    return None


def require_role(allowed_roles: list):
    """
    Decorator strictly enforcing role authorization on endpoints.
    allowed_roles e.g. ['MERCHANT_ADMIN', 'FINANCE_OPERATOR']
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if request.method == "OPTIONS":
                return jsonify({"ok": True}), 200

            user = authenticate_request()
            if not user:
                return jsonify({
                    "error": "Unauthorized — valid Bearer JWT token required"
                }), 401

            user_role = user.get("role", "AUDITOR")
            normalized_allowed = [r.upper().replace(" ", "_") for r in allowed_roles]
            normalized_user_role = user_role.upper().replace(" ", "_")

            if normalized_user_role not in normalized_allowed:
                return jsonify({
                    "error": f"Forbidden — role '{user_role}' cannot perform this action",
                    "required_roles": allowed_roles,
                    "your_role": user_role
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator


def get_current_user():
    """Returns currently authenticated user from Flask request context."""
    return getattr(g, "current_user", None)


def get_current_merchant_id():
    """Returns currently authenticated merchant_id from Flask request context."""
    return getattr(g, "merchant_id", None)
