import { toast } from "sonner";

/** Toast for actions that are intentionally mocked in this clone (live bot, sharing, auth…). */
export function comingSoon(feature: string) {
  toast(`${feature} is coming soon`, {
    description: "This part of Fireflies is a placeholder in this demo.",
  });
}
