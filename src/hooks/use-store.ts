import { useEffect, useState } from "react";
import { subscribe } from "@/lib/mock-store";

/** Re-render on any change to the mock store. */
export function useStoreVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribe(() => setV((x) => x + 1)), []);
  return v;
}
