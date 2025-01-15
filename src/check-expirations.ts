import { checkExpirations } from "./lib/pin";
import { checkDelayedExecutions } from "./lib/scheduled-execution";

export default async function CheckExpirationsCommand() {
  await checkDelayedExecutions();
  await checkExpirations();
}
