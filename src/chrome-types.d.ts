// chrome-types.d.ts
// Ensures TypeScript doesn't fail when chrome.* APIs are referenced in source
// The actual chrome global is provided by the browser at runtime.
// In development (npm start), a stub is injected instead.

declare namespace chrome {
  namespace runtime {
    function sendMessage(message: any, callback?: (response: any) => void): Promise<any>;
    function sendMessage(extensionId: string, message: any, callback?: (response: any) => void): Promise<any>;
    const onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void | Promise<boolean | void>): void;
      removeListener(callback: (...args: any[]) => any): void;
    };
    const lastError: chrome.runtime.LastError | undefined;
    interface LastError {
      message?: string;
    }
  }
  namespace tabs {
    function query(queryInfo: { active?: boolean; currentWindow?: boolean }, callback: (tabs: chrome.tabs.Tab[]) => void): void;
    function sendMessage(tabId: number, message: any, callback?: (response: any) => void): void;
    function get(tabId: number, callback?: (tab: chrome.tabs.Tab) => void): Promise<chrome.tabs.Tab>;
    function captureVisibleTab(windowId?: number | null, options?: { format?: string; quality?: number }, callback?: (dataUrl: string) => void): Promise<string> | void;
    const onActivated: {
      addListener(callback: (activeInfo: { tabId: number }) => void): void;
    };
    const onUpdated: {
      addListener(callback: (tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => void): void;
    };
    const onRemoved: {
      addListener(callback: (tabId: number, removeInfo: { windowId: number; isWindowClosing: boolean }) => void): void;
    };
    interface Tab {
      id?: number;
      url?: string;
      active: boolean;
      title?: string;
    }
  }
  namespace storage {
    const local: {
      get(keys: string | string[] | Record<string, any>): Promise<Record<string, any>>;
      set(items: Record<string, any>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
    const session: {
      get(keys: string | string[] | Record<string, any>): Promise<Record<string, any>>;
      set(items: Record<string, any>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  }
  namespace action {
    function setBadgeText(details: { text: string; tabId?: number }): void;
    function setBadgeBackgroundColor(details: { color: string; tabId?: number }): void;
  }
  namespace scripting {
    function executeScript(injection: { target: { tabId: number }; files?: string[]; func?: () => void }): Promise<any[]>;
  }
}
