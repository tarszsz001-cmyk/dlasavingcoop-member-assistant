# Pilot hardening evidence and execution audit — 2026-10-05

Base: main e518f36. The requested feature/emergency-69-real-regression already has the same tree as this main. Old uncommitted work in feat/rule-master-4-smart-reasoning was preserved in its original checkout. This clean worktree contains only the current hardening changes.

## Version hierarchy (read full primary PDFs, not snippets)

Official indexes: https://www.dlasavingcoop.com/show.php?No=773 and https://www.dlasavingcoop.com/show.php?No=2385

- Emergency: `docs/evidence/emergency-current-2569.pdf`, source `1XZYfuXWgzqWp6K_Ld0aosuO58pxKXU5p`. Announced 11 September 2569, effective 1 October 2569. Clause 3 expressly repeals both the 2566 criteria and amendment No.2/2568. Verified older 6 months/6 shares/25% criteria are preserved as history until 30 September, never selected for current applications. Current: 3 months, 3 shares, 3,000 baht remaining income (excluded revolving credit, credit cards and cash cards), 12 arrears-free installments; emergency repeat 3 installments and offset; other loan 3 installments; restructured ordinary 12 installments. Four times monthly income, up to 30,000 after 3 months or 60,000 after 6 months; 15 installments. Clauses 7–8 govern submission and transfer timing; no fabricated approval status.
- Housing: `docs/evidence/housing-current-2569.pdf`, source `1PDrTLU46Q8y9qJju6KixhU4atYjDCLkn`. Announced 11 September, effective 1 October 2569, clause 3 repeals the amendment No.3 that was effective April. Secondhand house: 80% of appraised value. New house/construction: appraised value, not a uniform 90% cap. Maximum 3 million baht, all cooperative debt up to 5 million, 360 installments, age 75 at completion. Construction: first of four payments first, payments 2–4 require progress appraisal. Older verified rules remain in history.
- Mortgage redemption: `docs/evidence/redeem-current-2569.pdf`, source `1BbkfCefJUCsWRwTpSEXfvvziZ21R225O`. Announced 11 September, effective 1 October 2569. Clause 3 repeals prior amendments. Member 12 months, original mortgage paid at least 3 years without missed installments, remaining income 15% and at least 6,000 baht, amount capped by original outstanding mortgage and 3 million baht, 360 installments, age 75 at completion.
- Ordinary and property-backed quality-of-life: preserve the existing verified full criteria effective 1 October 2569 and primary sources. Do not reuse the prior LINE criteria.
- Rates: official rate page https://dlasavingcoop.com/show.php?No=4063 was read. Rates are current published information; verify latest announcement before an application. Facebook is retained for news only.

Each new primary PDF has its SHA-256, effective date, announcement date, title and evidence clauses in canonical data. Browser authority is embedded from that exact data and sync-checked. Corpus and retrospective answers are never embedded into runtime authority.

## Existing test corrections, without weakening behavior

Main had stale test assumptions: ReferenceError from undefined path/root; pre-3.5 intent names despite later decision engines; a personal-data test demanding staff handoff despite current self-service policy; a 3.2 release assertion against current 4.4; and global bans on PDF IDs that now belong to verified history. These are corrected to the current explicit service/evidence contracts, with added decision/source/privacy assertions. Every original question remains. History retains old numeric checks, and current checks enforce the superseding rules instead. No tests are deleted, skipped or reduced; no expected results are changed to accept false rules.

## Real corpus

Original workbook has 69 nonempty rows and 306 question patterns. All patterns, keywords and retrospective answers are preserved. Workbook SHA-256 is stored in corpus. Each variant has independently specified semantic assertions. Contextless variants ask the missing product or continue in the product already discussed; browser tests include actual follow-up entry. Executable tests invoke Member Answer Engine and retain per-row PASS/PARTIAL/FAIL plus root causes.

## Remaining evidence locks

Education full limits/terms/guarantor requirements; disaster-loan limits/terms/deadline; ordinary eligibility after restructuring; share-backed specific percentages; signup payment deadline/reapplication sanction; some fine-grained guarantor membership/share requirements. These do not receive invented thresholds: exact official criteria/form routes are available before human fallback. Assessment never equals loan approval. No monthly-payment formula is inferred from interest rates.
