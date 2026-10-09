# Official source freshness and evidence control

The existing single-page Member Answer Engine, canonical Rule Master, nine original release suites,
all 69 LINE records and 306 question variants are preserved. The inline script count and Production URL are unchanged.

## Implementation

- `data/official-source-registry.json` records official indexes, document identity, original URL,
  publication/effective dates, amendments, domains, checks, byte hashes and reviewed rule versions.
  Unknown dates remain null. The first inventory is discovery, not a claim that every listed rule was verified.
- `scripts/sync-official-sources.mjs` fetches eight registered indexes, the newest 40 notice entries
  from the existing listing, and at most eight rotating PDFs per run. It uses conditional requests,
  stable per-index link metadata, SHA-256 and exact official-to-Drive link lineage. Changed bytes,
  changed link labels in the same index, removed primary links and new documents become PENDING.
- `.github/workflows/official-source-sync.yml` runs every 12 hours, with a startup run on release.
  It commits only detection/cache/impact data to `official-source-monitor`; it never changes main's
  Rule Master or promotes a candidate. This separate read-only detection feed lets Production stop
  old answers without waiting for a rule-change merge or spending money on an LLM per question.
- Production loads detection state before accepting the first typed question and refreshes it
  at most once per 15 minutes of activity. It sends no questions, account details or credentials.
  A monitor snapshot can add locks and matching-content check timestamps; it cannot replace values,
  import rule versions or promote CURRENT rules. Network failure retains the embedded verified snapshot;
  checks older than 72 hours, or tracked primary bytes older than 14 days, cause Evidence Lock.
- The gate covers direct questions, calculators and ongoing guided conversations. Account-specific
  questions still go to official self-service. Unknown historical dates/fields do not fall into current branches.
  Historical primary versions are preserved with effective intervals. Relative payment history is not
  confused with an instruction to use an old rule. “ตอนนี้” uses the current date in Asia/Bangkok.
- Share impacts affect share questions and loan eligibility involving shares; they do not rerun a loan's
  term-only inquiry. `run-impacted-regression.mjs` retains before/after results for selected questions.
  `current-rule-corpus.mjs` separately executes all permanent questions with current dated source/field contracts,
  independently of legacy answers. Original tests are still required, without reductions or exceptions.
- Current events remain NEWS with `rulePromotion:false`; a news card does not update Rule Master.

## Sources monitored

1. `https://www.dlasavingcoop.com/show.php?Category=procedure`
2. `https://www.dlasavingcoop.com/list.php?Category=notice`
3. `https://www.dlasavingcoop.com/show.php?No=774` (ordinary/education/disaster/interest)
4. `https://www.dlasavingcoop.com/show.php?No=773` (emergency)
5. `https://www.dlasavingcoop.com/show.php?No=2385` (special loans)
6. `https://www.dlasavingcoop.com/show.php?No=772` (member documents)
7. `https://www.dlasavingcoop.com/show.php?No=775` (welfare)
8. `https://www.dlasavingcoop.com/show.php?No=807` (deposits)

Facebook, LINE, board messages and infographics are never primary rule authority. Exact signed PDFs
linked by these indexes can be primary; a Drive URL alone is insufficient. The legacy board reference
for the old ordinary income threshold was replaced by the actual 2566 primary PDF, page 4, clause 2.3.
That historical text is not asserted to apply to every date before July 2569 without further amendment review.

## Review and promotion

Review the signed primary file, its effective date, clauses replaced, parent rules and affected domains.
Keep unresolved metadata/effects PENDING. Add a reviewed version with a non-overlapping effective interval;
mark the affected previous version SUPERSEDED, preserving the original values and scope. Partial amendments
do not supersede an entire regulation. Update canonical extraction only for verified changes; run affected
before/after contracts, all original suites and browser gates, then CI and the existing PR/Pages workflow.

## Newly verified / remaining scope

- The signed share amendment 3/2569 was found on the official procedure index, announced 30 September 2569,
  effective 1 October 2569. It replaces clause 7, limits monthly holding to 5,000 **shares**, permits reduction
  after at least six months under the stated conditions, and retains the separate board-declared income schedule.
  Its limits are not converted to baht without the necessary primary evidence. The PDF is preserved in `docs/evidence`.
- The salary-based monthly share schedule is PENDING_VERIFICATION. Salary 32,000 does not produce an invented amount.
- Retired-guarantor eligibility remains Evidence Lock for the unverified specific scope; the current ordinary criteria
  alone are insufficient for a blanket yes/no across loan types. The member receives primary-document and staff actions.
- Existing loan versions effective 1 October 2569 stay CURRENT. Reviewed emergency/housing/redeem amendments
  before that date stay SUPERSEDED for their encoded scope. The registry also contains unextracted baseline discoveries,
  explicitly distinct from verified answer rules.

Production: https://tarszsz001-cmyk.github.io/dlasavingcoop-member-assistant/
