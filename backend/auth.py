"""
auth.py — Role-Based Access Control (RBAC) & Authentication Middleware.

Enforces backend RBAC for 3 operational roles:
  - Merchant Admin   : Full access to all operations, agent execution, policy configuration
  - Finance Operator : Can approve/reject drafts, execute Tier 1 actions, view analytics
  - Auditor          : Read-only access to cases, ledger, analytics

In production: verifies Firebase ID tokens passed as Authorization: Bearer <token>
In development (RAZORRECOVER_ALLOW_UNAUTHENTICATED=1): uses X-User-Role header for role simulation
"""

import os
from functools import wraps
from flask import request, jsonify

# Role hierarchy — controls what each role can do
ROLE_HIERARCHY = {
    "Merchant Admin": 3,
    "Finance Operator": 2,
    "Auditor": 1
}

VALID_ROLES = set(ROLE_HIERARCHY.keys())
DEV_MODE = os.getenv("RAZORRECOVER_ALLOW_UNAUTHENTICATED", "1") == "1"


def authenticate_request():
    """
    Extracts user identity and role from request headers.

    Production: validates Authorization: Bearer <firebase_id_token>
    Development: reads X-User-Role header directly (only when dev mode enabled)
    """
    if DEV_MODE:
        # Dev mode: trust X-User-Role header for demo/testing
        role = request.headers.get("X-User-Role", "Merchant Admin")
        # Validate the role is a valid one even in dev mode
        if role not in VALID_ROLES:
            role = "Merchant Admin"
        return {
            "uid": f"dev_{role.lower().replace(' ', '_')}",
            "email": f"{role.lower().replace(' ', '.')}@razorrecover.io",
            "role": role,
            "auth_mode": "development_header"
        }

    # Production: extract Bearer token from Authorization header
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    id_token = auth_header.split("Bearer ")[1].strip()

    # Attempt Firebase token verification if SDK available
    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        decoded = fb_auth.verify_id_token(id_token)
        return {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "role": decoded.get("role", "Auditor"),  # Default to lowest privilege
            "auth_mode": "firebase_token"
        }
    except ImportError:
        pass
    except Exception as e:
        print(f"[auth] Token verification failed: {e}")

    return None


def require_role(allowed_roles: list):
    """
    Decorator enforcing role-based permissions on backend endpoints.

    IMPORTANT: Backend enforces this independently of frontend UI state.
    Even if a user changes the dropdown in the UI, the backend checks the
    actual X-User-Role header (dev) or decoded token role (production).

    Allowed roles: ['Merchant Admin', 'Finance Operator', 'Auditor']
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Handle OPTIONS preflight
            if request.method == "OPTIONS":
                return jsonify({"ok": True}), 200

            user = authenticate_request()
            if not user:
                return jsonify({
                    "error": "Unauthorized — valid authentication token required",
                    "hint": "Pass Authorization: Bearer <token> or X-User-Role header in dev mode"
                }), 401

            user_role = user.get("role", "Auditor")
            if user_role not in allowed_roles:
                return jsonify({
                    "error": f"Forbidden — role '{user_role}' cannot perform this action",
                    "required_roles": allowed_roles,
                    "your_role": user_role
                }), 403

            # Inject user context into request for downstream handlers
            request.user = user
            return f(*args, **kwargs)
        return decorated
    return decorator


def get_current_user():
    """Returns authenticated user context from current request."""
    return getattr(request, "user", None)
