import { checkExpirations } from "./utils";

export default async function Command() {
  Promise.resolve(checkExpirations());
}
