import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { createCallerFactory, procedure, router } from "../trpc";
import { errorConversionMiddleware } from "./errorConversionMiddleware";

const testProcedure = procedure.use(errorConversionMiddleware);

const testRouter = router({
  forbidden: testProcedure.query(() => {
    throw new ErrorWithCode(ErrorCode.Forbidden, "Only team owners can delete the team");
  }),
  notFound: testProcedure.query(() => {
    throw new ErrorWithCode(ErrorCode.NotFound, "This team no longer exists");
  }),
  conflict: testProcedure.query(() => {
    throw new ErrorWithCode(ErrorCode.Conflict, "This team URL is already taken");
  }),
  trpcError: testProcedure.query(() => {
    throw new TRPCError({ code: "BAD_REQUEST", message: "already a TRPCError" });
  }),
  trpcErrorWithErrorWithCodeCause: testProcedure.query(() => {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "OAuth client with ID not found",
      cause: new ErrorWithCode(ErrorCode.Unauthorized, "unauthorized_client"),
    });
  }),
  plainError: testProcedure.query(() => {
    throw new Error("boom");
  }),
  ok: testProcedure.query(() => "fine"),
});

// The middleware never reads ctx, so an empty context is enough to exercise it.
const caller = createCallerFactory(testRouter)({} as never);

async function catchError(promise: Promise<unknown>): Promise<TRPCError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TRPCError) return error;
    throw error;
  }
  throw new Error("Expected the procedure to throw");
}

describe("errorConversionMiddleware", () => {
  it.each([
    ["forbidden", "FORBIDDEN", "Only team owners can delete the team"],
    ["notFound", "NOT_FOUND", "This team no longer exists"],
    ["conflict", "CONFLICT", "This team URL is already taken"],
  ] as const)("maps ErrorWithCode from %s to %s with its message", async (procedureName, code, message) => {
    const error = await catchError(caller[procedureName]());
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.cause).toBeInstanceOf(ErrorWithCode);
  });

  it("leaves TRPCErrors untouched", async () => {
    const error = await catchError(caller.trpcError());
    expect(error.code).toBe("BAD_REQUEST");
  });

  it("keeps a handler's own TRPCError even when its cause is an ErrorWithCode", async () => {
    const error = await catchError(caller.trpcErrorWithErrorWithCodeCause());
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("OAuth client with ID not found");
  });

  it("keeps unknown errors as internal server errors", async () => {
    const error = await catchError(caller.plainError());
    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("passes successful results through", async () => {
    await expect(caller.ok()).resolves.toBe("fine");
  });
});
