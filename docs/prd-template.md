# Product requirements: [product name]

Copy this file to `docs/PRD.md` for a new product. Replace bracketed values and remove
irrelevant rows. Examples below illustrate how to write measurable requirements; they
are not enabled features, delivery commitments or inherited requirements. Keep this
document proportional to the product and link detailed designs when needed.

| Field                                   | Value                                     |
| --------------------------------------- | ----------------------------------------- |
| Owner / decision maker                  | [name or team]                            |
| Status                                  | [draft / agreed / in delivery / released] |
| Document version / updated              | [version] / [date]                        |
| Target release                          | [milestone or date, with assumptions]     |
| Product / design / technical references | [links]                                   |

## 1. Problem, users and outcomes

**Problem and evidence:** [Who experiences what problem? What observation/data supports it?]

**Current workaround:** [How is the job done now, and what does it cost?]

**Primary users and context:** [Roles, main task, device/browser, language, accessibility
and connectivity needs. Distinguish paying customer, end user and operator where relevant.]

| Goal                         | Baseline        | Target and deadline  | Measurement / owner      |
| ---------------------------- | --------------- | -------------------- | ------------------------ |
| G-01 [user/business outcome] | [current value] | [measurable outcome] | [event/report and owner] |

## 2. Scope and constraints

- **In scope:** [smallest complete user journeys in this release]
- **Non-goals:** [explicit exclusions and what would justify revisiting them]
- **Constraints:** [budget, time, data residency, browser support, procurement or migration]
- **Assumptions:** [assumption, validation method, owner and consequence if false]
- **Dependencies:** [inputs/accounts/assets/decisions needed, owner and needed-by date]

## 3. User journeys and functional requirements

Describe the main journey from entry to outcome, including cancellation and recovery.
Link a diagram only if it clarifies branches, ownership or asynchronous events.

| ID / priority  | Actor and trigger   | Required behavior              | Acceptance criterion and evidence                             |
| -------------- | ------------------- | ------------------------------ | ------------------------------------------------------------- |
| FR-01 / Must   | [actor does action] | [observable outcome and rules] | Given [state], when [action], then [result]; [test/demo link] |
| FR-02 / Should | [actor does action] | [observable outcome]           | [measurable pass condition; test/demo link]                   |

For every asynchronous requirement specify relevant states:

| Requirement | Loading / empty      | Success                        | Denied / expired                | Failure / retry / duplicate                   |
| ----------- | -------------------- | ------------------------------ | ------------------------------- | --------------------------------------------- |
| FR-01       | [what the user sees] | [confirmation and next action] | [safe explanation and recovery] | [retained data, retry and deduplication rule] |

## 4. Permissions and data

Do not assume the starter's workspace selector implements accounts or tenancy.

| Resource / action                     | Public       | Signed-in owner | Other member / operator | Backend rule                 |
| ------------------------------------- | ------------ | --------------- | ----------------------- | ---------------------------- |
| [resource: read/create/update/delete] | [allow/deny] | [scope]         | [scope]                 | [ownership/membership check] |

| Entity   | Key fields / relationships                | Owner / tenant | Read indexes / pagination | Retention / deletion                         |
| -------- | ----------------------------------------- | -------------- | ------------------------- | -------------------------------------------- |
| [entity] | [IDs, required values, state transitions] | [authority]    | [actual access paths]     | [retention period, export/deletion behavior] |

**Sensitive data:** [What is collected, why, access, encryption/access controls, logging
redaction, retention, export and deletion responsibilities. Do not claim certification
or legal compliance without separate evidence.]

**Migration:** [existing data, compatibility period, backfill, validation and recovery]

## 5. Optional capability decisions

The base backend is Convex. Other services remain disabled until the product needs
them. Selecting a provider requires implementation, credentials and real-flow testing;
see [integrations.md](integrations.md).

| Capability          | Needed / reason                         | Choice                               | Activation and acceptance evidence                                                          |
| ------------------- | --------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Backend             | Yes                                     | Convex                               | [deployment, schema, validated function smoke test]                                         |
| Authentication      | [yes/no]                                | [compatible provider or none]        | [refresh/sign-out/denial/tenant isolation tests]                                            |
| Payments            | [yes/no]                                | DOKU if needed, otherwise disabled   | [sandbox charge, signed webhook, duplicate/reordered event, refund/reconciliation evidence] |
| Transactional email | [yes/no]                                | Resend if needed, otherwise disabled | [verified sender, delivery/failure, deduplication and suppression tests]                    |
| GCP workload        | [yes/no and why Convex is insufficient] | [specific service or none]           | [identity, least privilege, cost limit, failure/retry evidence]                             |

Record provider account ownership, environments, secrets location and rotation owner.
Never put credential values in this document.

## 6. Quality requirements

Replace examples with explicit targets appropriate to the audience and traffic. A
number without a measurement environment is not an acceptance criterion.

| ID / area                | Target                                                                         | Measurement environment / evidence                            |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| NFR-01 / Usability       | [e.g. 4 of 5 representative users finish the main task unaided]                | [task, participant criteria, test session]                    |
| NFR-02 / Accessibility   | [named standard/level and core tasks; keyboard and screen-reader coverage]     | [manual checks plus automated checks; defects and exceptions] |
| NFR-03 / Performance     | [e.g. p95 confirmed operation < 1s at 50 concurrent users]                     | [device/network, region, dataset, operation and load method]  |
| NFR-04 / Capacity        | [concurrent users, records/day, payload/file limits and growth horizon]        | [load scenario, index/read budget and failure threshold]      |
| NFR-05 / Security        | [private-data denial cases, allowed origins, secret handling and abuse limits] | [tests and review findings]                                   |
| NFR-06 / Reliability     | [availability target, recoverable data loss/RPO and recovery time/RTO]         | [monitoring window, backup/restore drill and owner]           |
| NFR-07 / Compatibility   | [supported browsers, viewport range, zoom and reduced motion]                  | [browser matrix and real-device checks]                       |
| NFR-08 / Maintainability | [required CI gates, handoff docs and operational owner]                        | [exact commit checks and handoff record]                      |

## 7. Design, copy and assets

Follow [DESIGN.md](../DESIGN.md). Record brand tone, key screens and navigation, locale,
copy owner, supported themes and essential empty/error states. Use the canonical
product config, design tokens and asset catalog rather than parallel values.

| Asset / screen        | Purpose / placement       | Dimensions / format / alternatives         | Source / rights / status                   |
| --------------------- | ------------------------- | ------------------------------------------ | ------------------------------------------ |
| Favicon and app icons | [browser/device identity] | [catalog entry]                            | [placeholder/generated/licensed; reviewer] |
| Social metadata image | [sharing preview]         | [catalog entry, safe text area]            | [source and review]                        |
| [product imagery]     | [user purpose]            | [aspect ratio, responsive sizes, alt text] | [source, rights and owner]                 |

Use [the asset workflow](assets.md) for generation prompts and replacement checks.
List which placeholders may remain in a prototype and which block the product release.

## 8. Milestones, risks and decisions

| Milestone | Requirements / deliverable | Owner / dependencies     | Exit evidence / target      |
| --------- | -------------------------- | ------------------------ | --------------------------- |
| M-01      | [first complete journey]   | [owner; required inputs] | [demo/test evidence; date]  |
| M-02      | [hardening and UAT]        | [owner; external setup]  | [acceptance evidence; date] |

| Risk / open decision          | Impact              | Mitigation or options | Owner / decision due |
| ----------------------------- | ------------------- | --------------------- | -------------------- |
| [risk or unresolved question] | [effect on outcome] | [next action]         | [owner/date]         |

Record a decision when it changes scope, data ownership, costs or provider behavior.
Routine implementation choices do not require separate approval records.

## 9. UAT, release and operations

| Requirement IDs | Scenario / expected result                            | Tester  | Evidence / result / defect |
| --------------- | ----------------------------------------------------- | ------- | -------------------------- |
| [FR/NFR IDs]    | [happy path plus relevant denied/failure/retry state] | [owner] | [link; pass/fail/untested] |

- **Release gate:** [Must requirements accepted; required checks; unresolved defect policy]
- **Deployment:** [environment, domain, exact commit, configuration and migration order]
- **Rollback:** [trigger, responsible person, previous version and schema/data compatibility]
- **Operations:** [logs, alerts, service owners, quotas/cost limits and incident contact]
- **Recovery:** [backup/restore procedure, rehearsal evidence and expected RPO/RTO]
- **Handoff:** [source/access transfer, runbook, user guide, known limitations and support period]
- **Acceptance record:** [decision maker, date, evidence and explicitly accepted exceptions]

## Change history

| Date / version | Change and reason                 | Requirements affected | Author   |
| -------------- | --------------------------------- | --------------------- | -------- |
| [date/version] | [initial scope or later decision] | [IDs]                 | [author] |
