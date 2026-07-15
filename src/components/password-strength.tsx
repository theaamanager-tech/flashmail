import { passwordStrengthLabel, scorePassword } from "@/lib/security";

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const { label, color } = passwordStrengthLabel(score);
  const segments = 4;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 transition-colors"
            style={{
              backgroundColor: i < score ? color : "oklch(1 0 0 / 0.1)",
            }}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color }}>
          {label}
        </p>
      )}
    </div>
  );
}
