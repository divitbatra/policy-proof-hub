import { ReactNode } from "react";
import { MsalProvider as MsalReactProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "@/lib/msalConfig";

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as { account: Parameters<typeof msalInstance.setActiveAccount>[0] };
      msalInstance.setActiveAccount(payload.account);
    }
  });
});

export const MsalProvider = ({ children }: { children: ReactNode }) => (
  <MsalReactProvider instance={msalInstance}>{children}</MsalReactProvider>
);
