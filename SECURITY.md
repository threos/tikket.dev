# Security

Contact: [help@tikket.dev](mailto:help@tikket.dev)

Based on [https://supabase.com/.well-known/security.txt](https://supabase.com/.well-known/security.txt)

At Tikket, the security of our systems is a top priority. But no system is free of vulnerabilities, however much effort we put into security.

If you find a vulnerability, tell us. We want to correct it as fast as possible. Your report helps us protect our users and our systems.

## Out of scope

These findings are out of scope:

- Clickjacking on pages with no sensitive actions.
- CSRF on unauthenticated pages, on logout, or on login.
- Attacks that need a man-in-the-middle position or physical access to the device of a user.
- Any activity that can disrupt our service, that is, denial of service (DoS).
- Content spoofing and text injection without an attack vector, that is, without a way to change HTML or CSS.
- Email spoofing.
- Missing DNSSEC, CAA, or CSP headers.
- A missing Secure or HttpOnly flag on a cookie that is not sensitive.
- Dead links.

## What we ask of you

- Email your findings to [help@tikket.dev](mailto:help@tikket.dev).
- Do not run automated scanners on our infrastructure or dashboard. If you want to do this, contact us first. We will set up a sandbox for you.
- Do not exploit the vulnerability. For example, do not download more data than you need to show the problem. Do not delete or change the data of other people.
- Do not reveal the problem to others until we resolve it.
- Do not attack physical security, use social engineering, use distributed denial of service, send spam, or attack applications of third parties.
- Give us enough information to reproduce the problem, so that we can resolve it fast. The IP address or the URL of the affected system and a description of the vulnerability are usually enough. A complex vulnerability can need more explanation.

## What we promise

- We will reply to your report within 3 business days with our evaluation and an expected resolution date.
- If you followed the rules above, we will not take legal action against you for the report.
- We will treat your report as confidential. We will not pass your personal details to third parties without your permission.
- We will keep you informed of the progress towards a resolution.
- When we publish information about the problem, we will name you as the discoverer, unless you ask us not to.
- We will try to resolve each problem as fast as possible. We want to take an active part in the final publication about the problem after we resolve it.
