"""
FastAPI ingest router for NUMARA-Alicia-SNT
Canonical: NUMARA_ALICIA_META_GRAPH_V2_2

This router validates all incoming payloads via Pydantic models (ingest_schema.py)
then forwards clean field dicts to the Cloudflare sync worker. It is NOT a
pass-through: unknown/extra fields are rejected at the Pydantic layer before
anything reaches Airtable.

Required environment variables:
  SYNC_WORKER_URL   — base URL of the deployed numara-alicia-snt-sync worker
  INGEST_TOKEN_HASH — SHA-256 hex of the bearer token expected from callers

Routes:
  POST  /ingest/nodes
  PATCH /ingest/nodes/{airtable_record_id}
  POST  /ingest/edges
  PATCH /ingest/edges/{airtable_record_id}
  POST  /ingest/evidence
  PATCH /ingest/evidence/{airtable_record_id}
  POST  /ingest/legal-targets
  PATCH /ingest/legal-targets/{airtable_record_id}
  POST  /ingest/attorneys
  PATCH /ingest/attorneys/{airtable_record_id}
  POST  /ingest/documents
  PATCH /ingest/documents/{airtable_record_id}
"""

from __future__ import annotations

import hashlib
import os
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .ingest_schema import (
    AttorneyCreate, AttorneyUpdate,
    DocumentCreate, DocumentUpdate,
    EdgeCreate, EdgeUpdate,
    EvidenceCreate, EvidenceUpdate,
    LegalTargetCreate, LegalTargetUpdate,
    NodeCreate, NodeUpdate,
)

router = APIRouter(prefix="/ingest", tags=["ingest"])
security = HTTPBearer()

SYNC_WORKER_URL = os.environ["SYNC_WORKER_URL"].rstrip("/")
INGEST_TOKEN_HASH = os.environ["INGEST_TOKEN_HASH"]


def verify_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> str:
    token_hash = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    if token_hash != INGEST_TOKEN_HASH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
    return credentials.credentials


async def _post(table: str, fields: dict, agent_id: str) -> dict:
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            f"{SYNC_WORKER_URL}/sync/{table}",
            json={"fields": fields},
            headers={"X-Agent-ID": agent_id},
        )
    if not res.is_success:
        raise HTTPException(status_code=res.status_code, detail=res.json())
    return res.json()


async def _patch(table: str, record_id: str, fields: dict, agent_id: str, force: bool = False) -> dict:
    headers: dict = {"X-Agent-ID": agent_id}
    if force:
        headers["X-Delta-Force"] = "true"
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.patch(
            f"{SYNC_WORKER_URL}/sync/{table}/{record_id}",
            json={"fields": fields},
            headers=headers,
        )
    if res.status_code == 409:
        raise HTTPException(status_code=409, detail=res.json())
    if not res.is_success:
        raise HTTPException(status_code=res.status_code, detail=res.json())
    return res.json()


def _only_set(mapping: dict) -> dict:
    """Drop None values so PATCH payloads never null out existing fields."""
    return {k: v for k, v in mapping.items() if v is not None}


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

@router.post("/nodes", status_code=201)
async def create_node(
    body: NodeCreate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
):
    fields = {
        "Label": body.label,
        "Node Type": body.node_type.value,
        "Claim Class": body.claim_class.value,
        "Confidence": body.confidence,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
        "Status": body.status.value,
        "Last Modified By": body.last_modified_by,
        **_only_set({"Description": body.description, "Tags": body.tags}),
    }
    return await _post("Nodes", fields, x_agent_id)


@router.patch("/nodes/{record_id}")
async def update_node(
    record_id: str,
    body: NodeUpdate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
    x_delta_force: Annotated[str, Header()] = "false",
):
    fields = _only_set({
        "Label": body.label,
        "Node Type": body.node_type.value if body.node_type else None,
        "Claim Class": body.claim_class.value if body.claim_class else None,
        "Confidence": body.confidence,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
        "Status": body.status.value if body.status else None,
        "Description": body.description,
        "Tags": body.tags,
    })
    fields["Last Modified By"] = body.last_modified_by
    fields["Delta Version"] = body.delta_version
    return await _patch("Nodes", record_id, fields, x_agent_id, x_delta_force == "true")


# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------

@router.post("/edges", status_code=201)
async def create_edge(
    body: EdgeCreate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
):
    fields: dict = {
        "Edge Label": body.edge_label,
        "Relation Type": body.relation_type.value,
        "Claim Class": body.claim_class.value,
        "Confidence": body.confidence,
        "Direction": body.direction,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
        "Status": body.status.value,
        "Last Modified By": body.last_modified_by,
        **_only_set({
            "Effective Date": body.effective_date.isoformat() if body.effective_date else None,
            "Notes": body.notes,
        }),
    }
    return await _post("Edges", fields, x_agent_id)


@router.patch("/edges/{record_id}")
async def update_edge(
    record_id: str,
    body: EdgeUpdate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
    x_delta_force: Annotated[str, Header()] = "false",
):
    fields = _only_set({
        "Edge Label": body.edge_label,
        "Relation Type": body.relation_type.value if body.relation_type else None,
        "Claim Class": body.claim_class.value if body.claim_class else None,
        "Confidence": body.confidence,
        "Effective Date": body.effective_date.isoformat() if body.effective_date else None,
        "Status": body.status.value if body.status else None,
        "Notes": body.notes,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
    })
    fields["Last Modified By"] = body.last_modified_by
    fields["Delta Version"] = body.delta_version
    return await _patch("Edges", record_id, fields, x_agent_id, x_delta_force == "true")


# ---------------------------------------------------------------------------
# Evidence Ledger
# ---------------------------------------------------------------------------

@router.post("/evidence", status_code=201)
async def create_evidence(
    body: EvidenceCreate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
):
    fields: dict = {
        "Title": body.title,
        "Claim Class": body.claim_class.value,
        "Confidence": body.confidence,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
        "Status": body.status.value,
        "Last Modified By": body.last_modified_by,
        **_only_set({
            "Integrity Hash": body.integrity_hash,
            "Date Acquired": body.date_acquired.isoformat() if body.date_acquired else None,
            "Filed Date": body.filed_date.isoformat() if body.filed_date else None,
            "Notes": body.notes,
        }),
    }
    return await _post("Evidence Ledger", fields, x_agent_id)


@router.patch("/evidence/{record_id}")
async def update_evidence(
    record_id: str,
    body: EvidenceUpdate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
    x_delta_force: Annotated[str, Header()] = "false",
):
    fields = _only_set({
        "Title": body.title,
        "Claim Class": body.claim_class.value if body.claim_class else None,
        "Confidence": body.confidence,
        "Status": body.status.value if body.status else None,
        "Filed Date": body.filed_date.isoformat() if body.filed_date else None,
        "Notes": body.notes,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
    })
    fields["Last Modified By"] = body.last_modified_by
    fields["Delta Version"] = body.delta_version
    return await _patch("Evidence Ledger", record_id, fields, x_agent_id, x_delta_force == "true")


# ---------------------------------------------------------------------------
# Legal Targets
# ---------------------------------------------------------------------------

@router.post("/legal-targets", status_code=201)
async def create_legal_target(
    body: LegalTargetCreate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
):
    fields: dict = {
        "Full Name": body.full_name,
        "Claim Class": body.claim_class.value,
        "Confidence": body.confidence,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
        "Status": body.status.value,
        "Last Modified By": body.last_modified_by,
        **_only_set({"Role": body.role, "Case Reference": body.case_reference, "Notes": body.notes}),
    }
    return await _post("Legal Targets", fields, x_agent_id)


@router.patch("/legal-targets/{record_id}")
async def update_legal_target(
    record_id: str,
    body: LegalTargetUpdate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
    x_delta_force: Annotated[str, Header()] = "false",
):
    fields = _only_set({
        "Full Name": body.full_name,
        "Claim Class": body.claim_class.value if body.claim_class else None,
        "Confidence": body.confidence,
        "Role": body.role,
        "Case Reference": body.case_reference,
        "Status": body.status.value if body.status else None,
        "Notes": body.notes,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
    })
    fields["Last Modified By"] = body.last_modified_by
    fields["Delta Version"] = body.delta_version
    return await _patch("Legal Targets", record_id, fields, x_agent_id, x_delta_force == "true")


# ---------------------------------------------------------------------------
# Attorney Contacts
# ---------------------------------------------------------------------------

@router.post("/attorneys", status_code=201)
async def create_attorney(
    body: AttorneyCreate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
):
    fields: dict = {
        "Full Name": body.full_name,
        "Role": body.role.value,
        "Claim Class": body.claim_class.value,
        "Confidence": body.confidence,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
        "Status": body.status.value,
        **_only_set({
            "Bar Number": body.bar_number,
            "Firm Name": body.firm_name,
            "Email": body.email,
            "Phone": body.phone,
            "Address": body.address,
            "Notes": body.notes,
        }),
    }
    return await _post("Attorney Contacts", fields, x_agent_id)


@router.patch("/attorneys/{record_id}")
async def update_attorney(
    record_id: str,
    body: AttorneyUpdate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
):
    fields = _only_set({
        "Full Name": body.full_name,
        "Bar Number": body.bar_number,
        "Firm Name": body.firm_name,
        "Role": body.role.value if body.role else None,
        "Claim Class": body.claim_class.value if body.claim_class else None,
        "Confidence": body.confidence,
        "Email": body.email,
        "Phone": body.phone,
        "Status": body.status.value if body.status else None,
        "Notes": body.notes,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
    })
    return await _patch("Attorney Contacts", record_id, fields, x_agent_id)


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.post("/documents", status_code=201)
async def create_document(
    body: DocumentCreate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
):
    fields: dict = {
        "Title": body.title,
        "Doc Type": body.doc_type.value,
        "Claim Class": body.claim_class.value,
        "Confidence": body.confidence,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
        "Status": body.status.value,
        "Last Modified By": body.last_modified_by,
        **_only_set({
            "Integrity Hash": body.integrity_hash,
            "File URL": body.file_url,
            "Filing Date": body.filing_date.isoformat() if body.filing_date else None,
            "Received Date": body.received_date.isoformat() if body.received_date else None,
            "Notes": body.notes,
        }),
    }
    return await _post("Documents", fields, x_agent_id)


@router.patch("/documents/{record_id}")
async def update_document(
    record_id: str,
    body: DocumentUpdate,
    _: str = Depends(verify_token),
    x_agent_id: Annotated[str, Header()] = "api",
    x_delta_force: Annotated[str, Header()] = "false",
):
    fields = _only_set({
        "Title": body.title,
        "Doc Type": body.doc_type.value if body.doc_type else None,
        "Claim Class": body.claim_class.value if body.claim_class else None,
        "Confidence": body.confidence,
        "File URL": body.file_url,
        "Filing Date": body.filing_date.isoformat() if body.filing_date else None,
        "Received Date": body.received_date.isoformat() if body.received_date else None,
        "Status": body.status.value if body.status else None,
        "Notes": body.notes,
        "Provenance Source": body.provenance_source,
        "Provenance Ref": body.provenance_ref,
    })
    fields["Last Modified By"] = body.last_modified_by
    fields["Delta Version"] = body.delta_version
    return await _patch("Documents", record_id, fields, x_agent_id, x_delta_force == "true")
