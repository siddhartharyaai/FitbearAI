export const APP_MODE = process.env.APP_MODE ?? process.env.NEXT_PUBLIC_APP_MODE ?? "demo";
export const isProduction = APP_MODE === "production";
export const allowMocks =
  String(process.env.ALLOW_MOCKS ?? process.env.NEXT_PUBLIC_ALLOW_MOCKS ?? "false").toLowerCase() === "true";

export function assertNoMock(reason: string) {
  if (isProduction && !allowMocks) {
    throw new Error(`Mock path blocked in production: ${reason}`);
  }
}