"""
models.py — PostgreSQL & SQLAlchemy Database Models for RazorRecover.

Defines all core SaaS models:
- Identity & Multi-Tenancy (Merchants, Users, MerchantUsers)
- Gateway Credentials & Encryption (GatewayConnection)
- Customers & Revenue Signals (Customer, RevenueSignal)
- Case Lifecycle & State Engine (Case, CaseEvent)
- Intelligence & Policy (AIDiagnosis, PolicyDecision)
- Execution & Governance (Approval, RecoveryAction, Payment)
- Financial Ledger & Immutable Audit (LedgerEntry, AuditLog, IdempotencyKey)
- Benchmarking (EvaluationRun)
"""

import uuid
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON

db = SQLAlchemy()


def generate_uuid():
    return str(uuid.uuid4())


class Merchant(db.Model):
    __tablename__ = "merchants"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    business_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    environment = db.Column(db.String(20), default="TEST", nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    merchant_users = db.relationship("MerchantUser", backref="merchant", lazy=True, cascade="all, delete-orphan")
    gateway_connections = db.relationship("GatewayConnection", backref="merchant", lazy=True, cascade="all, delete-orphan")
    cases = db.relationship("Case", backref="merchant", lazy=True, cascade="all, delete-orphan")
    ledger_entries = db.relationship("LedgerEntry", backref="merchant", lazy=True, cascade="all, delete-orphan")
    audit_logs = db.relationship("AuditLog", backref="merchant", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "business_name": self.business_name,
            "email": self.email,
            "environment": self.environment,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default="ACTIVE", nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    merchant_memberships = db.relationship("MerchantUser", backref="user", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }


class MerchantUser(db.Model):
    __tablename__ = "merchant_users"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # MERCHANT_ADMIN, FINANCE_OPERATOR, AUDITOR
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("merchant_id", "user_id", name="uq_merchant_user"),)

    def to_dict(self):
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "user_id": self.user_id,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class GatewayConnection(db.Model):
    __tablename__ = "gateway_connections"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    provider = db.Column(db.String(50), default="RAZORPAY", nullable=False)
    environment = db.Column(db.String(20), default="TEST", nullable=False)  # TEST or LIVE
    key_id = db.Column(db.String(255), nullable=False)
    encrypted_secret = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default="ACTIVE", nullable=False)
    last_verified_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("merchant_id", "environment", name="uq_merchant_gateway_env"),)

    def to_dict(self):
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "provider": self.provider,
            "environment": self.environment,
            "key_id": self.key_id,
            "status": self.status,
            "last_verified_at": self.last_verified_at.isoformat() if self.last_verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    external_id = db.Column(db.String(255), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "external_id": self.external_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class RevenueSignal(db.Model):
    __tablename__ = "revenue_signals"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    customer_id = db.Column(db.String(36), db.ForeignKey("customers.id"), nullable=True)
    source = db.Column(db.String(50), nullable=False)  # WEBHOOK, API_SYNC, CSV_IMPORT
    event_type = db.Column(db.String(100), nullable=False)  # payment.failed, order.unpaid
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(10), default="INR", nullable=False)
    raw_payload = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "customer_id": self.customer_id,
            "source": self.source,
            "event_type": self.event_type,
            "amount": float(self.amount),
            "currency": self.currency,
            "raw_payload": self.raw_payload,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Case(db.Model):
    __tablename__ = "cases"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    signal_id = db.Column(db.String(36), db.ForeignKey("revenue_signals.id"), nullable=True)
    customer_id = db.Column(db.String(36), db.ForeignKey("customers.id"), nullable=True)
    case_number = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.String(50), default="DETECTED", nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(10), default="INR", nullable=False)
    risk_level = db.Column(db.String(20), nullable=True)
    assigned_tier = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    customer = db.relationship("Customer", backref="cases")
    events = db.relationship("CaseEvent", backref="case", lazy=True, cascade="all, delete-orphan")
    diagnoses = db.relationship("AIDiagnosis", backref="case", lazy=True, cascade="all, delete-orphan")
    policies = db.relationship("PolicyDecision", backref="case", lazy=True, cascade="all, delete-orphan")
    approvals = db.relationship("Approval", backref="case", lazy=True, cascade="all, delete-orphan")
    recovery_actions = db.relationship("RecoveryAction", backref="case", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.id,  # compatibility alias
            "case_number": self.case_number,
            "merchant_id": self.merchant_id,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else "Unknown Customer",
            "customer_email": self.customer.email if self.customer else "",
            "status": self.status,
            "amount": float(self.amount),
            "currency": self.currency,
            "risk_level": self.risk_level,
            "assigned_tier": self.assigned_tier,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "events_count": len(self.events) if self.events else 0
        }


class CaseEvent(db.Model):
    __tablename__ = "case_events"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    case_id = db.Column(db.String(36), db.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    from_state = db.Column(db.String(50), nullable=True)
    to_state = db.Column(db.String(50), nullable=False)
    actor_type = db.Column(db.String(50), nullable=False)  # SYSTEM, AI_AGENT, USER
    actor_id = db.Column(db.String(36), nullable=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "from_state": self.from_state,
            "to_state": self.to_state,
            "actor_type": self.actor_type,
            "actor_id": self.actor_id,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class AIDiagnosis(db.Model):
    __tablename__ = "ai_diagnoses"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    case_id = db.Column(db.String(36), db.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    root_cause = db.Column(db.Text, nullable=False)
    confidence = db.Column(db.Numeric(5, 2), nullable=False)
    recommended_action = db.Column(db.Text, nullable=False)
    raw_response = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "root_cause": self.root_cause,
            "confidence": float(self.confidence),
            "recommended_action": self.recommended_action,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class PolicyDecision(db.Model):
    __tablename__ = "policy_decisions"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    case_id = db.Column(db.String(36), db.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    tier = db.Column(db.Integer, nullable=False)
    allowed = db.Column(db.Boolean, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "tier": self.tier,
            "allowed": self.allowed,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Approval(db.Model):
    __tablename__ = "approvals"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    case_id = db.Column(db.String(36), db.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    requested_by = db.Column(db.String(36), nullable=True)
    approved_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    decision = db.Column(db.String(20), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    reason = db.Column(db.Text, nullable=True)
    decided_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "requested_by": self.requested_by,
            "approved_by": self.approved_by,
            "decision": self.decision,
            "reason": self.reason,
            "decided_at": self.decided_at.isoformat() if self.decided_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class RecoveryAction(db.Model):
    __tablename__ = "recovery_actions"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    case_id = db.Column(db.String(36), db.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)  # PAYMENT_LINK, RETRIES, OFFER_DISCOUNT
    status = db.Column(db.String(50), default="PENDING", nullable=False)
    external_reference = db.Column(db.String(255), nullable=True)
    metadata_json = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "action_type": self.action_type,
            "status": self.status,
            "external_reference": self.external_reference,
            "metadata": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    case_id = db.Column(db.String(36), db.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    action_id = db.Column(db.String(36), db.ForeignKey("recovery_actions.id"), nullable=True)
    razorpay_payment_id = db.Column(db.String(255), unique=True, nullable=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    status = db.Column(db.String(50), nullable=False)  # CAPTURED, FAILED, PENDING
    verified_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "action_id": self.action_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "amount": float(self.amount),
            "status": self.status,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class LedgerEntry(db.Model):
    __tablename__ = "ledger_entries"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    case_id = db.Column(db.String(36), db.ForeignKey("cases.id"), nullable=True)
    payment_id = db.Column(db.String(36), db.ForeignKey("payments.id"), nullable=True)
    recovered_amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(10), default="INR", nullable=False)
    entry_type = db.Column(db.String(50), default="RECOVERY", nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "case_id": self.case_id,
            "payment_id": self.payment_id,
            "recovered_amount": float(self.recovered_amount),
            "currency": self.currency,
            "entry_type": self.entry_type,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    actor_id = db.Column(db.String(36), nullable=True)
    actor_type = db.Column(db.String(50), nullable=False)  # USER, SYSTEM, AGENT
    action = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)
    resource_id = db.Column(db.String(36), nullable=False)
    old_state = db.Column(JSON, nullable=True)
    new_state = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "actor_id": self.actor_id,
            "actor_type": self.actor_type,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "old_state": self.old_state,
            "new_state": self.new_state,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class IdempotencyKey(db.Model):
    __tablename__ = "idempotency_keys"

    key = db.Column(db.String(255), primary_key=True)
    resource_type = db.Column(db.String(50), nullable=False)
    response_body = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class EvaluationRun(db.Model):
    __tablename__ = "evaluation_runs"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    merchant_id = db.Column(db.String(36), db.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    dataset_name = db.Column(db.String(100), nullable=False)
    total_cases = db.Column(db.Integer, nullable=False)
    decision_accuracy = db.Column(db.Numeric(5, 2), nullable=True)
    policy_compliance = db.Column(db.Numeric(5, 2), nullable=True)
    unsafe_action_rate = db.Column(db.Numeric(5, 2), nullable=True)
    verification_success_rate = db.Column(db.Numeric(5, 2), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "dataset_name": self.dataset_name,
            "total_cases": self.total_cases,
            "decision_accuracy": float(self.decision_accuracy) if self.decision_accuracy else 0.0,
            "policy_compliance": float(self.policy_compliance) if self.policy_compliance else 0.0,
            "unsafe_action_rate": float(self.unsafe_action_rate) if self.unsafe_action_rate else 0.0,
            "verification_success_rate": float(self.verification_success_rate) if self.verification_success_rate else 0.0,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
