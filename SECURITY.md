# Security Policy

## Supported Versions

We actively support the following versions of this Phoenix LiveView PWA project:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our Phoenix LiveView PWA seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** open a public issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Report privately

Instead, please report security vulnerabilities by:

- **Email**: Send details to [security@example.com] (replace with your email)
- **GitHub Security Advisories**: Use the "Report a vulnerability" button in the Security tab of this repository
- **Direct message**: Contact [@ndrean] (replace with your GitHub username) directly

### 3. Include the following information

When reporting a vulnerability, please include:

- **Type of issue** (e.g., XSS, CSRF, injection, etc.)
- **Full paths** of source file(s) related to the vulnerability
- **Location** of the affected source code (tag/branch/commit or direct URL)
- **Special configuration** required to reproduce the issue
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the issue, including how an attacker might exploit it

### 4. Response timeline

- **Initial response**: Within 48 hours
- **Detailed response**: Within 7 days
- **Fix timeline**: Depends on severity and complexity

## Security Considerations

This Phoenix LiveView PWA includes several security-relevant components:

### Frontend Security

- **Content Security Policy (CSP)**: Configured in Phoenix endpoint
- **Service Worker**: PWA functionality with secure asset caching
- **WebSocket Security**: Phoenix Channels with CSRF protection

### Backend Security

- **Phoenix Framework**: Built-in CSRF protection and XSS prevention
- **Database**: Ecto with parameterized queries preventing SQL injection
- **Environment**: Secure configuration management

### Dependencies

- Regular dependency updates via `pnpm` and `mix`
- Security scanning of both Elixir and Node.js dependencies
- Docker container security best practices

## Security Best Practices for Contributors

When contributing to this project:

1. **Never commit secrets** (API keys, passwords, certificates)
2. **Use environment variables** for sensitive configuration
3. **Validate all inputs** in LiveView forms and API endpoints
4. **Follow Phoenix security guidelines**
5. **Keep dependencies updated**
6. **Run security audits**: `pnpm audit` and `mix deps.audit`

## Known Security Considerations

### Phoenix LiveView Specific

- **WebSocket connections**: Ensure proper authentication
- **Live navigation**: Validate routes and permissions
- **File uploads**: Implement proper validation and scanning
- **Real-time updates**: Authorize data access in mount/3 and handle_params/3

### PWA Specific

- **Service Worker scope**: Limited to application domain
- **Offline capabilities**: Sensitive data handling when offline
- **Push notifications**: Secure subscription management

## Disclosure Policy

- We follow **responsible disclosure** principles
- Security researchers will be credited (if desired)
- We aim to fix critical vulnerabilities within 30 days
- We will coordinate with researchers on disclosure timing

---

**Note**: This security policy is specific to the Phoenix LiveView PWA codebase. For security issues related to hosting infrastructure or third-party services, please contact those providers directly.
