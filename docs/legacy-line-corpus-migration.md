# Legacy LINE question corpus — migration plan

Source workbook: `คำถามบอทไลน์.xlsx`

## Verified inventory

The workbook has 995 worksheet rows but only **69 non-empty data records**. The legacy answers are not treated as current rules.

| Group | Records | Migration priority |
|---|---:|---|
| Debt-consolidation loan | 17 | P0 |
| Housing loan | 15 | P0 |
| Emergency loan | 11 | P0 |
| Other loan questions | 16 | P0/P1 |
| Shares | 2 | P1 |
| Other | 8 | P1 |

## Migration rule

1. Preserve the member's original `question_patterns` as intent/regression language.
2. Treat `keywords` as routing hints only.
3. Mark every old `answer` as `VERIFY_REQUIRED`.
4. Extract claims from the old answer: membership duration, share-payment duration, amount, LTV, residual income, interest, installments, age, guarantors, collateral, documents, deadlines and exceptions.
5. Compare each claim with the current official regulation/criteria/notice.
6. Only verified current claims may enter Rule Master.
7. Conflicting, superseded or incomplete claims must never be used to decide eligibility.
8. Generate regression cases from the original member wording after the Rule Master entry is verified.

## Official evidence entry points

- Ordinary and related loans: https://www.dlasavingcoop.com/show.php?No=774
- Emergency loan: https://www.dlasavingcoop.com/show.php?No=773
- Housing/special housing: https://www.dlasavingcoop.com/show.php?No=2385
- Current regulations index: https://www.dlasavingcoop.com/show.php?Category=procedure

## Acceptance rule

A member question must end in one of:
- verified answer,
- guided collection of only necessary facts,
- official self-service/action route,
- precise human handoff when human judgment/action is required,
- explicit evidence-pending response when a current rule has not yet been verified.

No dead end and no guessed rule.
