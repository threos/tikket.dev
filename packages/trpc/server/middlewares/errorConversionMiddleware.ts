import { ErrorWithCode } from "@calcom/lib/errors";
import { errorWithCodeToTRPCError } from "../lib/toTRPCError";
import { middleware } from "../trpc";

/**
 * Middleware that converts ErrorWithCode thrown by other layers into a TRPCError with the matching code.
 */
export const errorConversionMiddleware = middleware(async ({ next }) => {
  const result = await next();
  if (result.ok) return result;
  const { error } = result;
  // tRPC never lets `next()` throw: it catches the error and returns `{ ok: false }`, wrapping anything
  // that isn't a TRPCError as an INTERNAL_SERVER_ERROR carrying the original message and `cause`.
  // Handlers that deliberately throw a TRPCError with an ErrorWithCode cause keep their own code/message.
  const isWrappedErrorWithCode =
    error.cause instanceof ErrorWithCode &&
    error.code === "INTERNAL_SERVER_ERROR" &&
    error.message === error.cause.message;
  if (!isWrappedErrorWithCode || !(error.cause instanceof ErrorWithCode)) return result;
  return { ...result, error: errorWithCodeToTRPCError(error.cause) };
});
