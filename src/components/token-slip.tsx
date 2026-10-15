import { cn } from "@/lib/utils";

/**
 * The reception token slip: the system's signature element. Used for queue numbers on
 * the patient's phone, the waiting-room TV board and the desk.
 */
export function TokenSlip({
  number,
  label,
  serving = false,
  className,
}: {
  number: number | string;
  label: string;
  serving?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("token-slip", className)}
      data-state={serving ? "serving" : "waiting"}
      role="group"
      aria-label={`${label} ${number}`}
    >
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="token-number">{number}</span>
    </div>
  );
}
