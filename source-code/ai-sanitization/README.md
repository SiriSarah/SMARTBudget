# AI Sanitization

This directory contains the logic for stripping PII from data before it is sent to AI models.

## Security Claims Proven
1.  **PII Stripping**: All forbidden fields (names, descriptions, emails, notes) are explicitly removed from the data object.
2.  **Data Rounding**: Financial amounts are rounded to the nearest $5, $10, or $50 to prevent reconstructing exact transaction history while maintaining analytical utility.
3.  **Temporal Coarsening**: Absolute timestamps are converted to coarse period identifiers (e.g., "YYYY-MM").
4.  **Runtime Validation**: The `validateSanitizedData` function ensures that no forbidden fields accidentally remain in the payload.

## Files
- `sanitize.ts`: Core sanitization and validation logic.
- `dateUtils.ts`: Minimal date parsing required for temporal coarsening.
