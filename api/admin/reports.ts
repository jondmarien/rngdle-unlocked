import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAdmin, writeAdminAudit } from "../../server/admin.js";
import { user, userReports } from "../../server/db/schema.js";
import { createLogger } from "../../server/logger.js";
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from "../../server/rateLimit.js";
import { defineHandler } from "../../server/vercel-adapter.js";

const log = createLogger("api/admin/reports");

/**
 * GET — list reports (optional ?status=open|resolved|dismissed|all)
 * PATCH — resolve/dismiss { id, status: "resolved"|"dismissed" }
 */
export default defineHandler(async (request) => {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const { db, user: adminUser, ip } = gate;

  if (request.method === "GET") {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "open";
    const reporter = alias(user, "reporter");
    const target = alias(user, "target");

    const base = db
      .select({
        id: userReports.id,
        reason: userReports.reason,
        status: userReports.status,
        createdAt: userReports.createdAt,
        reporterId: userReports.reporterId,
        reporterUsername: reporter.username,
        reporterEmail: reporter.email,
        targetUserId: userReports.targetUserId,
        targetUsername: target.username,
        targetEmail: target.email,
      })
      .from(userReports)
      .innerJoin(reporter, eq(reporter.id, userReports.reporterId))
      .innerJoin(target, eq(target.id, userReports.targetUserId));

    const rows =
      status === "all"
        ? await base.orderBy(desc(userReports.createdAt)).limit(100)
        : await base
            .where(eq(userReports.status, status))
            .orderBy(desc(userReports.createdAt))
            .limit(100);

    return Response.json({
      reports: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
        reporter: {
          id: r.reporterId,
          username: r.reporterUsername,
          email: r.reporterEmail,
        },
        target: {
          id: r.targetUserId,
          username: r.targetUsername,
          email: r.targetEmail,
        },
      })),
    });
  }

  if (request.method === "PATCH") {
    const rl = await checkRateLimit(
      db,
      `user:${adminUser.id}:admin-reports`,
      LIMITS.adminMutatePerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, "Rate limited", true);
    }

    let body: { id?: string; status?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const id = body.id?.trim();
    const next = body.status?.trim();
    if (!id || (next !== "resolved" && next !== "dismissed")) {
      return Response.json(
        { error: "id and status (resolved|dismissed) required" },
        { status: 400 },
      );
    }

    await db
      .update(userReports)
      .set({
        status: next,
        resolvedBy: adminUser.id,
        resolvedAt: new Date(),
      })
      .where(eq(userReports.id, id));

    await writeAdminAudit(db, {
      actorUserId: adminUser.id,
      action: `report_${next}`,
      targetType: "user_report",
      targetId: id,
      ip,
    });

    log.info("report update", { id, status: next, by: adminUser.id });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
});
