# Tikket permissions

This file lists the permission checks present in this repository, mapped to `resource.action` strings. A permission string names a resource and an action, for example `booking.read`. Tikket has no custom roles. A user has a permission on a team when the user holds an accepted membership in that team or in its parent team. The membership must have one of the allowed roles.

## How a permission check runs

The `TeamPermissionService` in [packages/features/teams/services/TeamPermissionService.ts](packages/features/teams/services/TeamPermissionService.ts) makes the decision. Each call site passes a permission string and the roles that grant it, in `fallbackRoles`. If a call site passes no roles, nobody has the permission.

A tRPC procedure applies the check before the handler runs:

- `createTeamPbacProcedure` in [packages/trpc/server/procedures/pbacProcedures.ts](packages/trpc/server/procedures/pbacProcedures.ts) requires the permission on the team in `input.teamId`.
- `createEventPbacProcedure` in [packages/trpc/server/routers/viewer/eventTypes/util.ts](packages/trpc/server/routers/viewer/eventTypes/util.ts) requires the permission on the team that owns the event type. For a personal event type, the user must be the owner or an assigned user.

If the user does not have the permission, the procedure stops with the tRPC error `FORBIDDEN` and the message `Permission required: <permission>`.

## Permissions by resource

### Event type permissions

| Permission string | Description | File path | Line |
|------------------|-------------|-----------|------|
| eventType.delete | Delete event types | [packages/trpc/server/routers/viewer/eventTypes/_router.ts](packages/trpc/server/routers/viewer/eventTypes/_router.ts) | 104 |

The router in [packages/trpc/server/routers/viewer/eventTypes/_router.ts](packages/trpc/server/routers/viewer/eventTypes/_router.ts) applies the `eventType.delete` check with `createEventPbacProcedure` before it calls the handler.

### Booking permissions

| Permission string | Description | File path | Line |
|------------------|-------------|-----------|------|
| booking.read | Read booking details | [packages/trpc/server/routers/viewer/bookings/get.handler.ts](packages/trpc/server/routers/viewer/bookings/get.handler.ts) | 111-119 |
| booking.readTeamBookings | Read team bookings | [packages/features/bookings/services/BookingAccessService.ts](packages/features/bookings/services/BookingAccessService.ts) | 85, 126 |
| booking.readOrgBookings | Read organization bookings | [packages/features/bookings/services/BookingAccessService.ts](packages/features/bookings/services/BookingAccessService.ts) | 113 |

### API key permissions

| Permission string | Description | File path | Line |
|------------------|-------------|-----------|------|
| apiKey.create | Create API keys | [packages/trpc/server/routers/viewer/apiKeys/create.handler.ts](packages/trpc/server/routers/viewer/apiKeys/create.handler.ts) | 25-26 |
| apiKey.findKeyOfType | Find API keys by type | [packages/trpc/server/routers/viewer/apiKeys/findKeyOfType.handler.ts](packages/trpc/server/routers/viewer/apiKeys/findKeyOfType.handler.ts) | 18-19 |

Both handlers call `checkPermissions` in [packages/trpc/server/routers/viewer/apiKeys/_auth-middleware.ts](packages/trpc/server/routers/viewer/apiKeys/_auth-middleware.ts). If the request names a team, the user must be an admin or an owner of that team.

## Roles

The `MembershipRole` enum in `packages/prisma/schema.prisma` defines the roles that a team membership can have:

```typescript
enum MembershipRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}
```
