# Member Answer Engine 3.4 — Regression Matrix

Release target: 3.4.0-pilot-stable

## Contract
- Verified numeric rules decide only the verified condition; never imply final loan approval.
- Missing facts must ask only the missing fact and preserve rule identity.
- Dynamic/current-round questions must not hardcode stale outcomes.
- Member-specific balances/statuses must route to staff and never invent data.
- Unverified cross-loan rules must stay conditional/unknown.

## Core decision cases
| Case | Expected |
|---|---|
| ฉุกเฉินกู้ใหม่ ส่งแล้ว 2 งวด | NOT_YET_ELIGIBLE |
| ฉุกเฉินกู้ใหม่ ส่งแล้ว 3 งวด | ELIGIBLE_CONDITION |
| ฉุกเฉินกู้ใหม่ได้ไหม → 6 งวด | structured follow-up → ELIGIBLE_CONDITION |
| สามัญกู้ใหม่ ส่งแล้ว 8 งวด | NOT_YET_ELIGIBLE |
| สามัญกู้ใหม่ ส่งแล้ว 12 งวด | ELIGIBLE_CONDITION |
| สามัญกู้ใหม่ได้ไหม → 15 งวด | structured follow-up → ELIGIBLE_CONDITION |
| กู้การศึกษาลูกอีกคน ส่งแล้ว 3 งวด | NOT_YET_ELIGIBLE |
| กู้การศึกษาลูกอีกคน ส่งแล้ว 6 งวด | ELIGIBLE_CONDITION |
| กู้การศึกษาลูกอีกคนได้ไหม → 12 งวด | structured follow-up → ELIGIBLE_CONDITION |
| ค้ำกู้สามัญอยู่ 3 คน ค้ำเพิ่มได้ไหม | NOT_YET_ELIGIBLE |
| ค้ำกู้สามัญอยู่ 2 คน ค้ำอีกคนได้ไหม | ELIGIBLE_CONDITION |
| ค้ำกู้สามัญเพิ่มได้ไหม → 2 คน | structured follow-up → ELIGIBLE_CONDITION |

## Safety / routing cases
| Case | Expected class |
|---|---|
| กู้ของผมอนุมัติหรือยัง | MEMBER_DATA / staff |
| ยอดหนี้ผมเหลือเท่าไร | MEMBER_DATA / staff |
| เงินฝากของผมเท่าไร | MEMBER_DATA / staff |
| ปันผลของผมได้เท่าไร | MEMBER_DATA / staff |
| ตอนนี้ซื้อหุ้นเพิ่มได้ไหม | DYNAMIC / current notice |
| ทุนบุตรประกาศผลหรือยัง | DYNAMIC / current notice |
| ปันผลปี 2569 กี่เปอร์เซ็นต์ | DYNAMIC; no unverified rate |
| ลาออกจากสหกรณ์ทำอย่างไร | PROCEDURE |
| ปันผลกับเฉลี่ยคืนต่างกันอย่างไร | KNOWLEDGE |
| แม่เสีย ขออะไรได้บ้าง | WELFARE procedure/rule evidence |
| มีสามัญกับคุณภาพชีวิต กู้ใหม่ต้องหักกลบอะไร | NEED-RULE; do not invent |
| คุณภาพชีวิตส่งกี่งวดถึงกู้สามัญได้ | NEED-RULE; do not invent |
| เงินฝาก 150000 หุ้น 50000 จะกู้ 2 ล้านได้ไหม | no personal eligibility invention |

## Language robustness
Repeat representative cases with: “ได้มั้ย”, “ได้ไหมครับ”, omitted spaces, conversational prefixes (“ผม…”, “หนู…”), and follow-up-only numeric answers. Outcome class must remain stable.
