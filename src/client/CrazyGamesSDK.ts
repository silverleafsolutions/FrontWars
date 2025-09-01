declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    CrazyGames: any;
  }
}

function isWithinCrazyGames(): boolean {
  try {
    const urlParams = new URLSearchParams(self.location.search);
    if (urlParams.has("crazygames")) return true;
    if (window !== window.parent && document.referrer) {
      const parentOrigin = new URL(document.referrer).origin;
      return parentOrigin.includes("crazygames");
    }
  } catch {
    // no-op
  }
  return false;
}

class CrazyGamesSDKManager {
  public readonly isCrazyGames: boolean = isWithinCrazyGames();
  private isInitialized = false;

  async init(): Promise<void> {
    console.log("[CrazyGames SDK] isCrazyGames: ", this.isCrazyGames);
    if (!this.isCrazyGames || this.isInitialized) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
      script.addEventListener("load", async () => {
        try {
          await window.CrazyGames.SDK.init();
          // Request responsive banners for menu
          void CrazySDK.requestResponsiveBanner("cg-banner-left");
          void CrazySDK.requestResponsiveBanner("cg-banner-right");
          void CrazySDK.requestResponsiveBanner("cg-banner-bottom");
          this.isInitialized = true;
        } finally {
          resolve();
        }
      });
      script.addEventListener("error", () => reject(new Error("CrazyGames SDK load error")));
      document.head.appendChild(script);
    });
  }

  gameLoadComplete(): void {
    // no explicit API needed for CrazyGames on load complete
  }

  gameplayStart(): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.gameplayStart) {
        window.CrazyGames.SDK.game.gameplayStart();
      }
    } catch (error) {
      console.log("CrazyGames SDK: ", error);
    }
  }

  gameplayStop(): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.gameplayStop) {
        window.CrazyGames.SDK.game.gameplayStop();
      }
    } catch (error) {
      console.log("CrazyGames SDK: ", error);
    }
  }

  // Invite functionality
  inviteLink(params: Record<string, any>, callback: (error: any, link: string) => void): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.inviteLink) {
        window.CrazyGames.SDK.game.inviteLink(params, callback);
      } else {
        // Fallback for non-CrazyGames environment
        const url = new URL(window.location.href);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        callback(null, url.toString());
      }
    } catch (error) {
      console.log("CrazyGames inviteLink error:", error);
      callback(error, "");
    }
  }

  showInviteButton(params: Record<string, any>, callback: (error: any, link: string) => void): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.showInviteButton) {
        window.CrazyGames.SDK.game.showInviteButton(params, callback);
      } else {
        // Fallback for non-CrazyGames environment
        console.log("Invite button would show with params:", params);
        callback(null, "");
      }
    } catch (error) {
      console.log("CrazyGames showInviteButton error:", error);
      callback(error, "");
    }
  }

  hideInviteButton(): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.hideInviteButton) {
        window.CrazyGames.SDK.game.hideInviteButton();
      }
    } catch (error) {
      console.log("CrazyGames hideInviteButton error:", error);
    }
  }

  getInviteParam(param: string, callback: (error: any, value: string) => void): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.getInviteParam) {
        window.CrazyGames.SDK.game.getInviteParam(param, callback);
      } else {
        // Fallback for non-CrazyGames environment
        const urlParams = new URLSearchParams(window.location.search);
        const value = urlParams.get(param) || "";
        callback(null, value);
      }
    } catch (error) {
      console.log("CrazyGames getInviteParam error:", error);
      callback(error, "");
    }
  }

  async requestMidGameAd(callback: () => void): Promise<void> {
    if (!this.isCrazyGames || !window.CrazyGames?.SDK?.ad?.requestAd) {
      callback();
      return;
    }
    const callbacks = {
      adFinished: callback,
      adError: callback,
      adStarted: () => console.log("Start midgame ad"),
    };
    try {
      window.CrazyGames.SDK.ad.requestAd("midgame", callbacks);
    } catch {
      callback();
    }
  }

  async requestBanner(id: string, width: number, height: number): Promise<void> {
    if (!this.isCrazyGames) return;
    try {
      await window.CrazyGames.SDK.banner.requestBanner({ id, width, height });
    } catch (error) {
      console.warn("Failed to request CrazyGames banner:", id, error);
    }
  }

  async requestResponsiveBanner(id: string): Promise<void> {
    if (!this.isCrazyGames) return;
    try {
      await window.CrazyGames.SDK.banner.requestResponsiveBanner(id);
    } catch (error) {
      console.warn("Failed to request CrazyGames responsive banner:", id, error);
    }
  }

  clearBanners(): void {
    if (this.isCrazyGames) {
      window.CrazyGames.SDK.banner.clearAllBanners();
    }
  }
}

export const CrazySDK = new CrazyGamesSDKManager();
