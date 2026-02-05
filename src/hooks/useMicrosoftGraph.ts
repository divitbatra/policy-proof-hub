import { useState, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest, graphConfig } from "@/lib/msalConfig";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
}

export const useMicrosoftGraph = () => {
  const { instance, accounts } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (accounts.length === 0) return null;
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (e: unknown) {
      if (e instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenPopup(loginRequest);
          return response.accessToken;
        } catch {
          return null;
        }
      }
      return null;
    }
  }, [instance, accounts]);

  const callMsGraph = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("Unable to acquire access token");

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }, [getAccessToken]);

  const createWordDocument = useCallback(async (fileName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const docName = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
      const response = await callMsGraph(
        `${graphConfig.graphDriveEndpoint}/root:/${docName}:/content`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
          body: "",
        }
      );
      return { id: response.id, name: response.name, webUrl: response.webUrl };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callMsGraph]);

  const listWordDocuments = useCallback(async (): Promise<DriveItem[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await callMsGraph(
        `${graphConfig.graphDriveEndpoint}/root/search(q='.docx')?$select=id,name,webUrl`
      );
      return response.value || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list documents");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callMsGraph]);

  const signIn = useCallback(async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch {
      setError("Failed to sign in with Microsoft");
    }
  }, [instance]);

  const signOut = useCallback(async () => {
    await instance.logoutPopup();
  }, [instance]);

  return {
    isAuthenticated: accounts.length > 0,
    account: accounts[0] || null,
    isLoading,
    error,
    signIn,
    signOut,
    createWordDocument,
    listWordDocuments,
  };
};
