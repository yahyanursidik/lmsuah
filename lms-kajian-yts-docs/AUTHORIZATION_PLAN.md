# Authorization Plan

## Lapisan Pengamanan
1. Session authentication
2. Endpoint authorization
3. Permission middleware
4. Query ownership scoping
5. PostgreSQL role least privilege
6. Optional PostgreSQL RLS
7. Audit logging

## Query Scoping
Data personal selalu difilter berdasarkan user ID: progress, notes, enrollment, transcript progress, dan quiz attempts.

## Required Tests
Guest, owner, non-owner, contributor, reviewer, publisher, admin, IDOR, dan privilege escalation.
