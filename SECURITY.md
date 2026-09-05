# Security Policy

## 🔒 Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | ✅        |

## 🚨 Reporting a Vulnerability

**DO NOT** report security vulnerabilities through public GitHub Issues.

If you discover a security vulnerability, please follow responsible disclosure:

1. **Email**: Contact the maintainers privately (check README for contact)
2. **Describe**: Include a detailed description of the vulnerability
3. **Reproduce**: Provide steps to reproduce the issue
4. **Impact**: Explain the potential impact

We will respond within **48 hours** and work to address the issue promptly.

## 🔑 Credential & Secret Management

This project uses the following secret management practices:

- All credentials are stored in `.env` files (never committed to git)
- Config files with real credentials (`r2_config.json`, `multi_server_config.json`) are git-ignored
- Example template files (`*.example.json`, `.env.example`) are provided instead
- Android signing keystores are never committed to version control

### If You Find Exposed Credentials

If you discover any credentials accidentally committed:
1. Report immediately via private channel
2. We will revoke and rotate the affected credentials immediately
3. We will audit the git history and scrub using `git-filter-repo`

## ⚠️ Known Security Boundaries

- The admin panel is protected by JWT + RBAC
- API rate limiting is enforced on auth and search endpoints
- Video stream URLs are authorized — only licensed content is distributed
- Password hashing uses Argon2 (industry standard)
