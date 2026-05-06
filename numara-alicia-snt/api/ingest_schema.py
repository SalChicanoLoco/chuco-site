"""
FastAPI ingest schema for NUMARA-Alicia-SNT
Canonical: NUMARA_ALICIA_META_GRAPH_V2_2

All models enforce:
  - Provenance fields required on create, non-empty if provided on update
  - Confidence clamped to [0.0, 1.0]
  - Delta Version supplied by caller on updates for conflict detection
  - Integrity Hash excluded from update models (write-once; enforced at worker)
  - No null overwrites: Optional fields omitted from PATCH payload if None
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Shared enums
# ---------------------------------------------------------------------------

class ClaimClass(str, Enum):
    fact = "fact"
    allegation = "allegation"
    inference = "inference"
    hearsay = "hearsay"
    stipulated = "stipulated"


class NodeType(str, Enum):
    person = "person"
    organization = "organization"
    event = "event"
    location = "location"
    claim = "claim"
    document = "document"
    entity = "entity"


class NodeStatus(str, Enum):
    active = "active"
    disputed = "disputed"
    archived = "archived"
    redacted = "redacted"


class RelationType(str, Enum):
    asserts = "asserts"
    refutes = "refutes"
    supports = "supports"
    contradicts = "contradicts"
    involves = "involves"
    filed_against = "filed_against"
    represents = "represents"
    authored = "authored"
    references = "references"
    co_defendant = "co-defendant"
    witness_of = "witness_of"
    related_to = "related_to"
    owns = "owns"
    employed_by = "employed_by"
    colluded_with = "colluded_with"


class EdgeStatus(str, Enum):
    active = "active"
    disputed = "disputed"
    superseded = "superseded"
    archived = "archived"


class EvidenceClaimClass(str, Enum):
    documentary = "documentary"
    testimonial = "testimonial"
    physical = "physical"
    digital = "digital"
    circumstantial = "circumstantial"
    expert = "expert"


class EvidenceStatus(str, Enum):
    pending = "pending"
    admitted = "admitted"
    disputed = "disputed"
    excluded = "excluded"
    sealed = "sealed"


class TargetClaimClass(str, Enum):
    defendant = "defendant"
    co_defendant = "co-defendant"
    witness = "witness"
    person_of_interest = "person_of_interest"
    co_conspirator = "co-conspirator"
    third_party = "third_party"


class TargetStatus(str, Enum):
    active = "active"
    pending = "pending"
    settled = "settled"
    dismissed = "dismissed"
    convicted = "convicted"
    acquitted = "acquitted"


class AttorneyRole(str, Enum):
    plaintiff_counsel = "plaintiff_counsel"
    defense_counsel = "defense_counsel"
    court_appointed = "court_appointed"
    mediator = "mediator"
    judge = "judge"
    pro_se = "pro_se"
    expert_witness = "expert_witness"
    paralegal = "paralegal"


class AttorneyClaimClass(str, Enum):
    verified = "verified"
    unverified = "unverified"
    disputed = "disputed"


class AttorneyStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    disbarred = "disbarred"
    retired = "retired"


class DocType(str, Enum):
    court_filing = "court_filing"
    exhibit = "exhibit"
    transcript = "transcript"
    report = "report"
    correspondence = "correspondence"
    contract = "contract"
    affidavit = "affidavit"
    deposition = "deposition"
    motion = "motion"
    order = "order"
    judgment = "judgment"
    subpoena = "subpoena"
    other = "other"


class DocClaimClass(str, Enum):
    official = "official"
    unofficial = "unofficial"
    disputed = "disputed"
    sealed = "sealed"
    redacted = "redacted"


class DocStatus(str, Enum):
    draft = "draft"
    pending = "pending"
    filed = "filed"
    sealed = "sealed"
    withdrawn = "withdrawn"
    archived = "archived"


# ---------------------------------------------------------------------------
# Provenance mixins
# ---------------------------------------------------------------------------

class ProvenanceMixin(BaseModel):
    """Required on create. Both fields must be non-empty strings."""
    provenance_source: str = Field(..., min_length=1, description="Origin agent, system, or person.")
    provenance_ref: str = Field(..., min_length=1, description="Document ID, case number, or external reference.")


class ProvenanceUpdateMixin(BaseModel):
    """Optional on update. If provided, must not be empty string."""
    provenance_source: Optional[str] = Field(None, min_length=1)
    provenance_ref: Optional[str] = Field(None, min_length=1)

    @model_validator(mode="after")
    def provenance_not_blank(self) -> "ProvenanceUpdateMixin":
        for field in ("provenance_source", "provenance_ref"):
            if getattr(self, field) == "":
                raise ValueError(f"{field} may not be set to empty string — omit it to leave unchanged.")
        return self


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

class NodeCreate(ProvenanceMixin):
    label: str = Field(..., min_length=1, max_length=200)
    node_type: NodeType
    claim_class: ClaimClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: NodeStatus = NodeStatus.active
    last_modified_by: str = Field(..., min_length=1)


class NodeUpdate(ProvenanceUpdateMixin):
    label: Optional[str] = Field(None, min_length=1, max_length=200)
    node_type: Optional[NodeType] = None
    claim_class: Optional[ClaimClass] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[NodeStatus] = None
    last_modified_by: str = Field(..., min_length=1)
    delta_version: int = Field(..., ge=0, description="Caller's current known Delta Version for conflict detection.")


class NodeResponse(BaseModel):
    node_id: str
    label: str
    node_type: NodeType
    claim_class: ClaimClass
    confidence: float
    provenance_source: str
    provenance_ref: str
    status: NodeStatus
    description: Optional[str]
    tags: Optional[List[str]]
    delta_version: int
    last_modified_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------

class EdgeCreate(ProvenanceMixin):
    edge_label: str = Field(..., min_length=1, max_length=300)
    source_node_id: str = Field(..., description="Stable Node ID (N-rec...)")
    target_node_id: str = Field(..., description="Stable Node ID (N-rec...)")
    relation_type: RelationType
    claim_class: ClaimClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    direction: str = Field("directed", pattern="^(directed|undirected)$")
    effective_date: Optional[date] = None
    status: EdgeStatus = EdgeStatus.active
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)

    @field_validator("source_node_id", "target_node_id")
    @classmethod
    def must_not_be_same(cls, v: str) -> str:
        return v

    @model_validator(mode="after")
    def source_not_target(self) -> "EdgeCreate":
        if self.source_node_id == self.target_node_id:
            raise ValueError("source_node_id and target_node_id must differ.")
        return self


class EdgeUpdate(ProvenanceUpdateMixin):
    edge_label: Optional[str] = Field(None, min_length=1)
    relation_type: Optional[RelationType] = None
    claim_class: Optional[ClaimClass] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    effective_date: Optional[date] = None
    status: Optional[EdgeStatus] = None
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)
    delta_version: int = Field(..., ge=0)


# ---------------------------------------------------------------------------
# Evidence Ledger
# ---------------------------------------------------------------------------

class EvidenceCreate(ProvenanceMixin):
    title: str = Field(..., min_length=1, max_length=300)
    claim_class: EvidenceClaimClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_node_ids: Optional[List[str]] = None
    document_ids: Optional[List[str]] = None
    legal_target_ids: Optional[List[str]] = None
    integrity_hash: Optional[str] = Field(
        None, description="SHA-256 of document payload. Write-once; enforced at worker layer."
    )
    status: EvidenceStatus = EvidenceStatus.pending
    date_acquired: Optional[date] = None
    filed_date: Optional[date] = None
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)


class EvidenceUpdate(ProvenanceUpdateMixin):
    title: Optional[str] = Field(None, min_length=1)
    claim_class: Optional[EvidenceClaimClass] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    status: Optional[EvidenceStatus] = None
    filed_date: Optional[date] = None
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)
    delta_version: int = Field(..., ge=0)
    # integrity_hash intentionally absent — write-once field enforced at worker


# ---------------------------------------------------------------------------
# Legal Targets
# ---------------------------------------------------------------------------

class LegalTargetCreate(ProvenanceMixin):
    full_name: str = Field(..., min_length=1, max_length=200)
    claim_class: TargetClaimClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    role: Optional[str] = None
    node_ids: Optional[List[str]] = None
    attorney_ids: Optional[List[str]] = None
    case_reference: Optional[str] = None
    status: TargetStatus = TargetStatus.active
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)


class LegalTargetUpdate(ProvenanceUpdateMixin):
    full_name: Optional[str] = Field(None, min_length=1)
    claim_class: Optional[TargetClaimClass] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    role: Optional[str] = None
    case_reference: Optional[str] = None
    status: Optional[TargetStatus] = None
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)
    delta_version: int = Field(..., ge=0)


# ---------------------------------------------------------------------------
# Attorney Contacts
# ---------------------------------------------------------------------------

class AttorneyCreate(ProvenanceMixin):
    full_name: str = Field(..., min_length=1, max_length=200)
    bar_number: Optional[str] = None
    firm_name: Optional[str] = None
    role: AttorneyRole
    claim_class: AttorneyClaimClass = AttorneyClaimClass.unverified
    confidence: float = Field(..., ge=0.0, le=1.0)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: AttorneyStatus = AttorneyStatus.active
    notes: Optional[str] = None


class AttorneyUpdate(ProvenanceUpdateMixin):
    full_name: Optional[str] = Field(None, min_length=1)
    bar_number: Optional[str] = None
    firm_name: Optional[str] = None
    role: Optional[AttorneyRole] = None
    claim_class: Optional[AttorneyClaimClass] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[AttorneyStatus] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentCreate(ProvenanceMixin):
    title: str = Field(..., min_length=1, max_length=400)
    doc_type: DocType
    claim_class: DocClaimClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    file_url: Optional[str] = None
    integrity_hash: Optional[str] = Field(
        None, description="SHA-256 of file at ingestion. Write-once after first set."
    )
    filing_date: Optional[date] = None
    received_date: Optional[date] = None
    legal_target_ids: Optional[List[str]] = None
    attorney_ids: Optional[List[str]] = None
    status: DocStatus = DocStatus.pending
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)


class DocumentUpdate(ProvenanceUpdateMixin):
    title: Optional[str] = Field(None, min_length=1)
    doc_type: Optional[DocType] = None
    claim_class: Optional[DocClaimClass] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    file_url: Optional[str] = None
    filing_date: Optional[date] = None
    received_date: Optional[date] = None
    status: Optional[DocStatus] = None
    notes: Optional[str] = None
    last_modified_by: str = Field(..., min_length=1)
    delta_version: int = Field(..., ge=0)
    # integrity_hash intentionally absent — write-once enforced at worker
