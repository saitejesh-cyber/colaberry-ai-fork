import datetime as dt, sys
import numpy as np
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter

OUT = sys.argv[1]
START = np.datetime64("2026-11-09")
HOL = ["2026-11-26", "2026-11-27", "2026-12-24", "2026-12-25", "2027-01-01", "2027-01-18"]

def bd(d, n):
    return np.busday_offset(d, n, roll="forward", holidays=HOL)

# (id, task, features, resources, workdays, deps)  -- phase rows have workdays=None
T = [
 ("P0", "Phase 0 - Architecture gate & pre-implementation decisions", "", "", None, []),
 ("0.1", "Karun code-access review", "Repo + branch, runnable examples, pipeline stages, DB schema, deployment files", "Karun; Tech Lead", 5, []),
 ("0.2", "CAD integration contract", "CAD adapter, AutoCAD version, license / automation setup, exact export contract (PDF + DXF + CAD)", "Karun; Tech Lead", 5, []),
 ("0.3", "US residency verification", "ZITADEL US instance, Permit control-plane hosting, Vertex AI model/location (no global fallback), log/backup/support locations", "Architect; Security Eng", 5, []),
 ("0.4", "Data platform build-vs-buy", "PostgreSQL topology, Redis hosting, backups, failover / replica locations, GCS retention/versioning/deletion", "Architect; DevOps Eng", 3, []),
 ("0.5", "Freeze service boundaries", "Update ADRs 0027-0031 + drawing-service ADR; sign-off on provisional items", "Architect; Tech Lead", 2, ["0.1", "0.2", "0.3", "0.4"]),

 ("P1", "Phase 1 - Platform infrastructure (GKE, us-east1)", "", "", None, []),
 ("1.1", "GKE Standard zonal cluster (us-east1-b)", "Cluster sizing, namespaces, one Deployment per process (frontend, backend, auth, worker, beat)", "DevOps Eng", 4, ["0.4"]),
 ("1.2", "Ingress: GKE Gateway + regional ALB", "HTTPS routing to frontend / API / auth Services, certificates", "DevOps Eng", 3, ["1.1"]),
 ("1.3", "PostgreSQL provisioning", "US cluster, separate runtime DB roles, backups, FORCE RLS-ready", "DevOps Eng; Backend Eng", 3, ["1.1"]),
 ("1.4", "Redis provisioning", "US queue + tenant-scoped cache (managed or StatefulSet)", "DevOps Eng", 2, ["1.1"]),
 ("1.5", "Google Cloud Storage bucket", "Regional us-east1 bucket, private access, tenant / job / version layout, retention + versioning", "DevOps Eng", 2, ["1.1"]),
 ("1.6", "CI/CD + environments", "Build/deploy pipelines, secrets, dual CI matrix (permit | native)", "DevOps Eng", 3, ["1.2"]),

 ("P2", "Phase 2 - AIX Auth microservice (ADR 0027-0031)", "", "", None, []),
 ("2.1", "01: 0028-A Catalog registry", "Seed global catalog tables from current constants; gate: registry matches constants", "Backend Eng (Auth)", 2, ["0.5"]),
 ("2.2", "02: 0028-B Roles per application + console split", "Backfill application_id, move admin permissions into console app", "Backend Eng (Auth)", 5, ["2.1"]),
 ("2.3", "03: 0030-P0 Engine switch scaffolding", "AUTHZ_ENGINE factory, ResidualReconcilingPort, no-op facts writer (Permit unchanged)", "Backend Eng (Auth)", 2, ["2.2"]),
 ("2.4", "04: 0027-A Unified application registry", "Merge oauth_clients + applications", "Backend Eng (Auth)", 2, ["2.3"]),
 ("2.5", "05: 0029-A/B Platform admin (superadmin)", "SUPER_ADMIN_DOMAIN/EMAILS validator, /platform/*, template propagation, platform_audit_log; gate: platform isolation", "Backend Eng (Auth); Frontend Eng", 5, ["2.4"]),
 ("2.6", "06: 0028-C/E eng_drawing schema + PEP", "Drawings, projects, disciplines, membership (ReBAC), author != approver SoD veto; gate: drawing matrix + discipline RLS", "Backend Eng (Auth)", 5, ["2.5"]),
 ("2.7", "07: 0030-P1/P2 Native evaluator", "Port 155 Rego cases as unit corpus, native e2e, fail-closed tests", "Backend Eng (Authz)", 10, ["2.6"]),
 ("2.8", "08: 0027-B/C/D Tokens, multi-issuer, S2S authz", "App-scoped claims (iss, aud, tenant_id, app=eng_drawing), refresh, client_credentials, /authz/check; security review F1-F6, S1-S15", "Backend Eng (Auth); Security Eng", 5, ["2.6"]),
 ("2.9", "8b: 0031-A/B Tenant API hardening + docs", "Rate limits, idempotency, ProblemDetails, OpenAPI, PKCE CLI helper; gate: Schemathesis contract tests", "Backend Eng (Auth); QA Eng", 4, ["2.8"]),
 ("2.10", "09: Profiles, platform-only console, shadow, CI", "Delete tenant UI shell, ship platform console + no-access page, shadow soak, dual CI matrix", "Backend Eng (Auth); Frontend Eng; DevOps Eng", 9, ["2.7", "2.9"]),
 ("2.11", "10: 0027-F Cutover + 0031-D login retirement", "Console on AIX tokens, drop legacy tables, retire old login code", "Backend Eng (Auth)", 4, ["2.10"]),
 ("2.12", "Permit Edge PDP deployment (optional)", "Private PDP in US GKE cluster, policy sync from Permit control plane", "DevOps Eng; Backend Eng (Auth)", 2, ["2.8", "1.2"]),

 ("P3", "Phase 3 - Drawing API (FastAPI) & processing workers", "", "", None, []),
 ("3.1", "FastAPI drawing service scaffold", "Projects, jobs, outputs endpoints; verify AIX token + audience; bind user / tenant / app", "Backend Eng (Drawing)", 4, ["0.5", "1.3"]),
 ("3.2", "Tenant-scoped data model", "Drawing jobs + versions tables, tenant/project filters, FORCE RLS, separate runtime roles", "Backend Eng (Drawing)", 4, ["3.1"]),
 ("3.3", "Enforce access decision per operation", "Call /authz/check per drawing op; deny on failed identity/entitlement/permission", "Backend Eng (Drawing)", 3, ["3.2", "2.8"]),
 ("3.4", "Upload PDF + input & unit checks", "File checks, vector vs scan, known dimensions/units, 'Needs input' state (no guessed CAD geometry)", "Backend Eng (Drawing)", 4, ["3.2", "1.5"]),
 ("3.5", "Celery workers + Redis queue", "Python stages with tenant + job context, recheck before side effects, progress/result updates", "Backend Eng (Drawing)", 4, ["3.4", "1.4"]),
 ("3.6", "Glass scope extraction (Gemini / Vertex AI)", "US-resident model config, Gemini + Python interpretation, separate AI context per tenant", "AI/ML Eng", 8, ["3.5", "0.3"]),
 ("3.7", "Approved parts catalog + sheet templates", "Manufacturer catalog ingestion, client sheet templates", "Backend Eng (Drawing)", 4, ["3.2"]),
 ("3.8", "Draft generation", "Match catalog components from opening data; produce draft versions", "AI/ML Eng; Backend Eng (Drawing)", 6, ["3.6", "3.7"]),
 ("3.9", "AutoCAD / CAD adapter integration", "Adapter, runtime + outputs per contract from Karun; deployment placement", "Karun; Backend Eng (Drawing)", 8, ["3.8", "0.2"]),
 ("3.10", "Review, release & version lifecycle", "draft -> in_review -> released -> obsolete; author/approver separation; immutable releases; corrections create new drafts", "Backend Eng (Drawing)", 5, ["3.8", "3.3"]),
 ("3.11", "Versioned outputs + authorized downloads", "Approved PDF + DXF + agreed CAD format to GCS tenant/job/version; authorize every file request", "Backend Eng (Drawing)", 3, ["3.10", "3.9"]),
 ("3.12", "Celery Beat (optional)", "Scheduled jobs only, single active scheduler Deployment", "Backend Eng (Drawing); DevOps Eng", 2, ["3.5"]),

 ("P4", "Phase 4 - Customer web app (React / Next.js)", "", "", None, []),
 ("4.1", "Login via AIX Auth", "OIDC / PKCE, refresh, app=eng_drawing tokens, no-access handling", "Frontend Eng", 3, ["2.8"]),
 ("4.2", "Upload & job status UI", "Project + job type, upload, progress, 'Needs input' resolution", "Frontend Eng", 5, ["4.1", "3.5"]),
 ("4.3", "Review & approval UI", "Dimensions, door swing, part fit review; approve/return; version history", "Frontend Eng", 5, ["4.2", "3.10"]),
 ("4.4", "Released outputs & downloads", "Download approved PDF / DXF / CAD per version", "Frontend Eng", 2, ["4.3", "3.11"]),

 ("P5", "Phase 5 - Security, compliance & launch", "", "", None, []),
 ("5.1", "Tenant isolation test suite", "Cross-tenant deny (DB, GCS, jobs, AI context), platform admin no-bypass", "QA Eng; Security Eng", 4, ["3.11", "2.11"]),
 ("5.2", "Retention, deletion & logging policy", "Deletion periods, US locations for logs / audit / backups / temp CAD files, monitoring", "Architect; DevOps Eng", 3, ["0.3", "3.11"]),
 ("5.3", "Security review / pentest", "OWASP Top 10, token & PDP fail-closed, file access", "Security Eng", 4, ["5.1"]),
 ("5.4", "UAT with Tenant A (Middlesex Glass)", "End-to-end upload -> review -> release on real drawings", "QA Eng; Tech Lead; Karun", 5, ["4.4", "5.1"]),
 ("5.5", "Production go-live", "Prod deploy, runbooks, zone-outage acceptance, hypercare", "DevOps Eng; Tech Lead", 3, ["5.3", "5.4", "5.2"]),
]

sched = {}
for tid, task, feat, res, dur, deps in T:
    if dur is None:
        continue
    s = START
    for d in deps:
        s = max(s, bd(sched[d][1], 1))
    s = bd(s, 0)
    e = bd(s, dur - 1)
    sched[tid] = (s, e)

# phase spans
phase = None
spans = {}
for tid, *_rest in T:
    if tid.startswith("P"):
        phase = tid
        continue
    s, e = sched[tid]
    a, b = spans.get(phase, (s, e))
    spans[phase] = (min(a, s), max(b, e))

end_all = max(e for _, e in sched.values())
first_mon = START
weeks = []
w = first_mon
while w <= end_all:
    weeks.append(w)
    w = w + np.timedelta64(7, "D")

wb = Workbook()
ws = wb.active
ws.title = "Task Tracker"
hdr = ["Task", "Features", "Resources", "Start Date", "End Date"]
thin = Side(style="thin", color="D4D4D8")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
hfill = PatternFill("solid", fgColor="18181B")
pfill = PatternFill("solid", fgColor="E4E4E7")
for i, h in enumerate(hdr, 1):
    c = ws.cell(row=1, column=i, value=h)
for j, wk in enumerate(weeks):
    c = ws.cell(row=1, column=6 + j, value=wk.astype(dt.date))
    c.number_format = "mmm d"
for c in ws[1]:
    c.font = Font(bold=True, color="FFFFFF")
    c.fill = hfill
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = border

r = 2
for tid, task, feat, res, dur, deps in T:
    if tid.startswith("P"):
        s, e = spans[tid]
        vals = [task, "", "", s.astype(dt.date), e.astype(dt.date)]
    else:
        s, e = sched[tid]
        vals = [f"{tid}  {task}", feat, res, s.astype(dt.date), e.astype(dt.date)]
    for i, v in enumerate(vals, 1):
        c = ws.cell(row=r, column=i, value=v)
        c.border = border
        c.alignment = Alignment(vertical="top", wrap_text=True)
        if i in (4, 5):
            c.number_format = "yyyy-mm-dd"
            c.alignment = Alignment(horizontal="center", vertical="top")
        if tid.startswith("P"):
            c.font = Font(bold=True)
            c.fill = pfill
    for j in range(len(weeks)):
        c = ws.cell(row=r, column=6 + j)
        c.border = border
        if tid.startswith("P"):
            c.fill = pfill
    r += 1

last_row = r - 1
last_col = get_column_letter(5 + len(weeks))
rng = f"F2:{last_col}{last_row}"
# Gantt bar: week overlaps [start, end]. Recomputes if dates are edited.
ws.conditional_formatting.add(rng, FormulaRule(
    formula=[f'AND(LEFT($A2,5)="Phase",$D2<=F$1+6,$E2>=F$1)'],
    fill=PatternFill("solid", fgColor="52525B"), stopIfTrue=True))
ws.conditional_formatting.add(rng, FormulaRule(
    formula=["AND($D2<>\"\",$D2<=F$1+6,$E2>=F$1)"],
    fill=PatternFill("solid", fgColor="DC2626")))

ws.column_dimensions["A"].width = 46
ws.column_dimensions["B"].width = 62
ws.column_dimensions["C"].width = 30
ws.column_dimensions["D"].width = 12
ws.column_dimensions["E"].width = 12
for j in range(len(weeks)):
    ws.column_dimensions[get_column_letter(6 + j)].width = 7
ws.freeze_panes = "F2"
ws.row_dimensions[1].height = 30

# Notes sheet
ns = wb.create_sheet("Sources & Assumptions")
notes = [
    ("Sources", ""),
    ("Engineering Drawing High Level Architecture (6 pages, 2 Nov 2026)", "Phases 0, 1, 3, 4, 5 - stack, tenant isolation, drawing workflow, GKE deployment, US residency"),
    ("AIX Auth Platform Plan artifact (ADR 0027-0031, branch feat/eng-drawing)", "Phase 2 - build steps 01-10 incl. 8b, in the plan's dependency order"),
    ("", ""),
    ("Assumptions", ""),
    ("Project start", "Mon 2026-11-09; working days only (Mon-Fri)"),
    ("Holidays excluded", ", ".join(HOL)),
    ("Effort sizing (ADR plan)", "S <= 0.5 day, M = 2 days, L = 5 days; L+L = 10, M+M = 4, M+L+M = 9"),
    ("Resources", "Role placeholders - replace with named engineers. Karun is named in the architecture doc as owner of code access / CAD."),
    ("Parallelism", "Auth (Phase 2) and Drawing API (Phase 3) run in parallel with separate engineers; 07 native evaluator runs alongside 08 tokens."),
    ("Gantt", "Week columns start on Mondays; bars are conditional formatting from Start/End Date, so editing a date moves the bar."),
    ("Provisional", "Architecture is provisional until Karun code access (task 0.1) - CAD tasks 0.2 / 3.9 dates are the least certain."),
]
for i, (a, b) in enumerate(notes, 1):
    ns.cell(row=i, column=1, value=a)
    ns.cell(row=i, column=2, value=b)
    if a in ("Sources", "Assumptions"):
        ns.cell(row=i, column=1).font = Font(bold=True)
ns.column_dimensions["A"].width = 60
ns.column_dimensions["B"].width = 110

wb.save(OUT)
print("tasks", len(sched), "weeks", len(weeks), "end", end_all)
for tid, (s, e) in sched.items():
    print(tid, s, e)
