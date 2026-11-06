# ReconIQ — Data Flow Documentation

## 1. Overview

This document details the data flows through the ReconIQ platform, from file upload through reconciliation to claims generation.

---

## 2. File Upload Flow

```mermaid
flowchart TD
    A["User selects file\n(CSV/XLSX)"] --> B["Frontend validates\nfile type & size"]
    B --> C["Upload to\nPOST /api/v1/uploads"]
    C --> D{"Backend\nvalidation"}
    D -->|Invalid| E["Return 422\nerror response"]
    D -->|Valid| F["Store file in\nstorage/uploads/\nwith UUID name"]
    F --> G["Create uploaded_files\nrecord (status: uploaded)"]
    G --> H["Parse file\nasynchronously"]
    H --> I["Extract column\nheaders"]
    I --> J["Extract sample data\n(first 10 rows)"]
    J --> K["Count total rows"]
    K --> L["Update record\n(status: parsed)"]
    L --> M["Return file metadata\nto frontend"]

    style A fill:#e1f5fe
    style M fill:#c8e6c9
    style E fill:#ffcdd2
```

### Flow Details

| Step | Component | Description |
|---|---|---|
| 1 | Frontend | User selects a file and chooses document type (orders, settlements, etc.) and partner |
| 2 | Frontend | Client-side validation: file extension (.csv, .xlsx), max size (50MB default) |
| 3 | API | Multipart form upload with metadata (document_type, partner) |
| 4 | Service | Server-side validation: MIME type check, size re-validation, malware scan (future) |
| 5 | Storage | File saved with UUID filename to prevent collisions and path traversal |
| 6 | Database | Upload record created with `status: uploaded` |
| 7 | Parser | CSV/Excel parser reads the file, handles encoding detection |
| 8-10 | Parser | Extract headers, sample rows, and row count |
| 11 | Database | Record updated to `status: parsed` with extracted metadata |
| 12 | API | Return parsed file info including headers and preview |

---

## 3. Column Mapping Flow

```mermaid
flowchart TD
    A["File parsed\nsuccessfully"] --> B["Load canonical schema\nfor document type"]
    B --> C{"AI module\navailable?"}
    C -->|Yes| D["Send headers +\nsample data to\nOllama"]
    C -->|No| E["Use rule-based\nheader matching"]
    D --> F["AI returns suggested\nmappings with\nconfidence scores"]
    E --> F
    F --> G["Present mappings\nto user in UI"]
    G --> H{"User reviews\nmappings"}
    H -->|Adjust| I["User modifies\nmappings"]
    I --> H
    H -->|Confirm| J["Save column_mapping\nrecord"]
    J --> K{"Save as\ntemplate?"}
    K -->|Yes| L["Create/update\nmapping template\nfor partner"]
    K -->|No| M["Update file status\nto 'mapped'"]
    L --> M
    M --> N["Ready for\nnormalization"]

    style A fill:#e1f5fe
    style N fill:#c8e6c9
```

### Canonical Schema Fields

| Document Type | Required Fields | Optional Fields |
|---|---|---|
| **Orders** | order_reference, order_date, net_amount, status | sku, product_name, quantity, discount, payment_method |
| **Settlements** | order_reference, settlement_date, net_settlement | commission, shipping_fee, tcs, tds |
| **Freight** | order_reference, awb_number, total_freight | weight, charged_weight, zone, courier_partner |
| **COD Remittances** | order_reference, cod_amount, remitted_amount, status | utr_number, remittance_date |
| **Returns** | order_reference, return_date, return_status | refund_amount, refund_status, return_reason |

---

## 4. Normalization Flow

```mermaid
flowchart TD
    A["Column mapping\nconfirmed"] --> B["Load file data\nwith mappings"]
    B --> C["For each row:\nApply column mapping"]
    C --> D["Coerce data types"]
    D --> E["Parse dates to\nISO format"]
    E --> F["Convert amounts\nto Decimal"]
    F --> G["Compute dedup_hash\n(SHA-256 of key fields)"]
    G --> H{"Duplicate\ndetected?"}
    H -->|Yes| I["Flag as duplicate\nskip or merge"]
    H -->|No| J["Compute quality\nscore (0.0-1.0)"]
    I --> J
    J --> K["Insert into\nnormalized_transactions"]
    K --> L{"More rows?"}
    L -->|Yes| C
    L -->|No| M["Update file status\nto 'normalized'"]
    M --> N["Return normalization\nsummary"]

    style A fill:#e1f5fe
    style N fill:#c8e6c9
```

### Quality Score Calculation
The quality score reflects data completeness:
```
score = (filled_required_fields / total_required_fields) * 0.7
      + (filled_optional_fields / total_optional_fields) * 0.3
```

### Deduplication Hash
```python
dedup_hash = sha256(f"{order_reference}|{document_type}|{partner}|{transaction_date}|{net_amount}")
```

---

## 5. Reconciliation Flow

```mermaid
flowchart TD
    A["User creates\nreconciliation run"] --> B["Select source dataset\n(e.g., Orders)"]
    B --> C["Select target dataset\n(e.g., Settlements)"]
    C --> D["Configure match rules\nand tolerance"]
    D --> E["Execute reconciliation\n(status: running)"]

    E --> F["PASS 1:\nExact Match"]
    F --> G["Match on\norder_reference\n(exact string)"]
    G --> H["Compare amounts\nwithin tolerance"]
    H --> I["Record matches\n(confidence: 1.0)"]

    I --> J["PASS 2:\nFuzzy Match"]
    J --> K["Match unmatched on\namount + date\nproximity"]
    K --> L["Record matches\n(confidence: 0.5-0.9)"]

    L --> M["PASS 3:\nFlag Unmatched"]
    M --> N["Source-only items\n= Missing settlements"]
    M --> O["Target-only items\n= Extra settlements"]

    I --> P["Detect discrepancies\nfrom matched pairs"]
    L --> P
    N --> P
    O --> P

    P --> Q["Categorize\ndiscrepancies"]
    Q --> R["Compute summary\nstatistics"]
    R --> S["Update run status\nto 'completed'"]
    S --> T["Return reconciliation\nresults"]

    style A fill:#e1f5fe
    style T fill:#c8e6c9
```

### Match Types

| Match Type | Confidence | Criteria |
|---|---|---|
| `exact` | 1.0 | Order reference matches exactly, amounts within tolerance |
| `fuzzy_high` | 0.8–0.9 | Order reference similar, amounts match, dates within 3 days |
| `fuzzy_low` | 0.5–0.7 | Amounts match, partner matches, dates within 7 days |
| `manual` | N/A | Flagged for human review |

### Discrepancy Detection Rules

```mermaid
flowchart LR
    A["Matched Pair"] --> B{"Amount\ndifference?"}
    B -->|"> tolerance"| C["short_payment or\nexcess_payment"]
    B -->|"<= tolerance"| D["Reconciled ✓"]

    E["Source Only\n(no match)"] --> F["missing_settlement\nor missing_remittance"]

    G["Target Only\n(no match)"] --> H["extra_settlement\nor duplicate_charge"]

    I["Freight Match"] --> J{"Charged weight\n> actual?"}
    J -->|Yes| K["weight_discrepancy"]
    J -->|No| D

    style D fill:#c8e6c9
    style C fill:#ffcdd2
    style F fill:#ffcdd2
    style H fill:#ffcdd2
    style K fill:#ffcdd2
```

---

## 6. Claims Flow

```mermaid
flowchart TD
    A["Discrepancy\nconfirmed"] --> B["User reviews\ndiscrepancy details"]
    B --> C{"Generate\nclaim?"}
    C -->|No| D["Mark discrepancy\nas resolved/ignored"]
    C -->|Yes| E["Create claim\n(status: draft)"]
    E --> F["Auto-populate claim\ndetails from\ndiscrepancy"]
    F --> G["User reviews and\nedits claim"]
    G --> H["Submit claim\n(status: submitted)"]
    H --> I["Record submission\ndate"]
    I --> J["Partner acknowledges\n(status: acknowledged)"]
    J --> K["Partner reviews\n(status: under_review)"]
    K --> L{"Partner\ndecision"}
    L -->|Accepted| M["Record recovery\namount"]
    L -->|Rejected| N["Mark as rejected\nwith reason"]
    L -->|Partial| O["Record partial\nrecovery"]
    M --> P["Close claim\n(status: closed)"]
    N --> P
    O --> P
    P --> Q["Update discrepancy\nresolution status"]

    style A fill:#e1f5fe
    style P fill:#c8e6c9
    style D fill:#fff9c4
```

### Claim Lifecycle States

```mermaid
stateDiagram-v2
    [*] --> Draft : Create from discrepancy
    Draft --> Submitted : User submits
    Submitted --> Acknowledged : Partner confirms receipt
    Acknowledged --> UnderReview : Partner starts review
    UnderReview --> Resolved : Partner agrees
    UnderReview --> Rejected : Partner rejects
    Resolved --> Closed : Recovery confirmed
    Rejected --> Closed : Written off or re-filed
    Draft --> Closed : Cancelled by user
```

---

## 7. Complete End-to-End Flow

```mermaid
flowchart LR
    subgraph Upload["1. Upload"]
        A["CSV/XLSX\nFile"] --> B["Parse &\nStore"]
    end

    subgraph Map["2. Map"]
        B --> C["AI Suggest\nMappings"]
        C --> D["User\nConfirms"]
    end

    subgraph Normalize["3. Normalize"]
        D --> E["Transform\nto Canonical"]
        E --> F["Dedup &\nQuality Check"]
    end

    subgraph Reconcile["4. Reconcile"]
        F --> G["Multi-pass\nMatching"]
        G --> H["Detect\nDiscrepancies"]
    end

    subgraph Recover["5. Recover"]
        H --> I["Generate\nClaims"]
        I --> J["Track\nRecovery"]
    end

    style Upload fill:#e3f2fd
    style Map fill:#f3e5f5
    style Normalize fill:#e8f5e9
    style Reconcile fill:#fff3e0
    style Recover fill:#fce4ec
```
