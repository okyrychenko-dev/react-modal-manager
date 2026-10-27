import { useEffect } from "react";
import { useModalManager } from "../../useModalManager";
import { useOwnedModalHandles } from "../useOwnedModalHandles";
import type { ReactNode } from "react";

interface OwnedEffectLauncherProps {
  onOutcome: (value: unknown) => void;
}

export function OwnedEffectLauncher({
  onOutcome,
}: OwnedEffectLauncherProps): ReactNode {
  const manager = useModalManager();
  const owner = useOwnedModalHandles();

  useEffect(() => {
    const isActive = owner.captureLifetime();

    void owner
      .track(manager.confirm({ title: "Effect-owned confirmation" }))
      .then((result) => {
        if (isActive()) {
          onOutcome(result);
        }
      })
      .catch((error: unknown) => {
        if (isActive()) {
          onOutcome(error);
        }
      });
  }, [manager, owner, onOutcome]);

  return <span>Effect launcher</span>;
}
