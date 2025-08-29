declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    CrazyGames: any;
  }
}

function isWithinCrazyGames(): boolean {
  return true; // force enable for now

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
    console.log("init", this.isCrazyGames, this.isInitialized);
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
