// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
"use client";

import { Button } from "@/components/ui/button";
import { getErrorDetail, toFriendlyError } from "@/lib/client-error";
import { cn } from "@/lib/utils";
import { AlertTriangle, Gamepad2, RotateCw, SearchX, ServerCrash, WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

// The game is only ever needed once something has already failed, so keep it
// out of the main bundle.
const DinoGame = dynamic(() => import("@/components/ui/dino-game").then((m) => m.DinoGame), {
  ssr: false,
  loading: () => <div className="h-[140px] w-full animate-pulse rounded-lg bg-muted/40" />,
});

const ICONS = {
  offline: WifiOff,
  database: ServerCrash,
  server: ServerCrash,
  notFound: SearchX,
  unknown: AlertTriangle,
} as const;

interface ErrorStateProps {
  /** The raw error. Used to pick the right copy — never rendered in production. */
  error?: unknown;
  /** Overrides the copy derived from `error`. */
  title?: string;
  description?: string;
  /** Called by the retry button and by the background auto-retry. */
  onRetry?: () => void;
  /** Shows a spinner on the retry button while the parent refetches. */
  isRetrying?: boolean;
  /** Offer the runner game while the request retries. Defaults to true. */
  showGame?: boolean;
  /** Keep retrying on a timer in the background. Defaults to true when `onRetry` is given. */
  autoRetry?: boolean;
  /** Seconds between automatic retries. */
  retryIntervalSeconds?: number;
  /** Stop auto-retrying after this many attempts, so a dead backend isn't hammered. */
  maxAutoRetries?: number;
  /** Dense single-row version for tables and admin panels. Never shows the game. */
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  error,
  title,
  description,
  onRetry,
  isRetrying = false,
  showGame = true,
  autoRetry = true,
  retryIntervalSeconds = 15,
  maxAutoRetries = 20,
  compact = false,
  className,
}: ErrorStateProps) {
  const friendly = toFriendlyError(error);
  const Icon = ICONS[friendly.kind];
  const heading = title ?? friendly.title;
  const body = description ?? friendly.description;

  // The game is visible from the start — there's nothing else to do on a failed
  // screen, and hiding it behind a click just adds a step.
  const [playing, setPlaying] = useState(showGame);
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(retryIntervalSeconds);

  const onRetryRef = useRef(onRetry);
  useEffect(() => {
    onRetryRef.current = onRetry;
  }, [onRetry]);

  const retryNow = useCallback(() => {
    setSecondsLeft(retryIntervalSeconds);
    setAttempts((count) => count + 1);
    onRetryRef.current?.();
  }, [retryIntervalSeconds]);

  const autoRetryActive =
    Boolean(onRetry) && autoRetry && !compact && attempts < maxAutoRetries;

  // Count down to the next background attempt. The visitor can keep playing —
  // when a retry succeeds the parent stops rendering this component.
  useEffect(() => {
    if (!autoRetryActive) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((remaining) => {
        if (remaining <= 1) {
          setAttempts((count) => count + 1);
          onRetryRef.current?.();
          return retryIntervalSeconds;
        }
        return remaining - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [autoRetryActive, retryIntervalSeconds]);

  const detail = process.env.NODE_ENV !== "production" ? getErrorDetail(error) : null;

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-6 text-center sm:flex-row sm:justify-center sm:text-left",
          className,
        )}
      >
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{heading}</p>
          <p className="text-xs text-muted-foreground">{body}</p>
        </div>
        {onRetry && (
          <Button
            onClick={retryNow}
            size="sm"
            variant="outline"
            disabled={isRetrying}
            className="shrink-0 sm:ml-2"
          >
            <RotateCw className={cn("mr-2 h-3.5 w-3.5", isRetrying && "animate-spin")} />
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "mx-auto w-full max-w-[620px] rounded-xl border-2 border-dashed border-border bg-background p-8 text-center md:p-12",
        className,
      )}
    >
      <div className="flex justify-center">
        <div className="grid size-12 place-items-center rounded-xl bg-background shadow-lg ring-1 ring-border">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
      </div>

      <h2 className="mt-6 font-medium text-foreground">{heading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button onClick={retryNow} variant="outline" disabled={isRetrying}>
            <RotateCw className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying…" : "Try again"}
          </Button>
        )}
        {showGame && (
          <Button variant="ghost" onClick={() => setPlaying((open) => !open)}>
            <Gamepad2 className="mr-2 h-4 w-4" />
            {playing ? "Hide the game" : "Play while you wait"}
          </Button>
        )}
      </div>

      {autoRetryActive && (
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {isRetrying
            ? "Checking again…"
            : `Retrying automatically in ${secondsLeft}s${attempts > 0 ? ` · attempt ${attempts}` : ""}`}
        </p>
      )}

      {showGame && playing && (
        <div className="mt-6 text-left">
          <DinoGame footnote="We'll keep checking in the background, this page updates the moment we're back." />
        </div>
      )}

      {detail && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Technical details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground">
            {detail}
          </pre>
        </details>
      )}
    </div>
  );
}

export default ErrorState;
