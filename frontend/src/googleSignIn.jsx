import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";

/* ============================================================
   Google sign-in button
   ------------------------------------------------------------
   Renders nothing at all until the server confirms a client id is
   configured, so the sign-in page looks finished rather than broken
   on an installation that has not set GOOGLE_CLIENT_ID yet.

   Google's script draws the button itself inside our container —
   that is a requirement of Google Identity Services, which will not
   accept a button we style ourselves.
   ============================================================ */

const GIS_SRC = "https://accounts.google.com/gsi/client";

/* One shared loader, so two buttons on a page don't add two scripts. */
let scriptPromise = null;
const loadGis = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = GIS_SRC;
    tag.async = true;
    tag.defer = true;
    tag.onload = resolve;
    tag.onerror = () => reject(new Error("Could not reach Google sign-in."));
    document.head.appendChild(tag);
  });
  return scriptPromise;
};

export const GoogleSignIn = ({ onSignedIn, label = "signin_with" }) => {
  const { loginWithGoogle } = useAuth();
  const holder = useRef(null);
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* Ask the server whether Google sign-in is switched on. */
  useEffect(() => {
    let alive = true;
    apiFetch("/auth/google-config")
      .then((data) => { if (alive && data.enabled) setClientId(data.clientId); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!clientId || !holder.current) return undefined;
    let alive = true;

    loadGis()
      .then(() => {
        if (!alive || !holder.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            setBusy(true);
            setError("");
            try {
              const data = await loginWithGoogle(credential);
              onSignedIn?.(data.user, data);
            } catch (err) {
              setError(err.message);
            } finally {
              if (alive) setBusy(false);
            }
          }
        });
        window.google.accounts.id.renderButton(holder.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: label,
          width: holder.current.offsetWidth || 320
        });
      })
      .catch((err) => alive && setError(err.message));

    return () => { alive = false; };
  }, [clientId, label, loginWithGoogle, onSignedIn]);

  if (!clientId) return null;

  return (
    <div className="mt-6">
      <div className="mb-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-black/10" />
        <span className="font-ui text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">or</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>

      {/* Google draws its own button in here. */}
      <div ref={holder} className="flex min-h-[44px] w-full justify-center [color-scheme:light]" />

      {busy && <p className="mt-3 text-center font-ui text-[13px] text-muted">Signing you in…</p>}
      {error && <p className="mt-3 text-center font-ui text-[13px] font-semibold text-primary">{error}</p>}

      <p className="mt-4 text-center font-ui text-[12.5px] leading-[1.5] text-muted">
        New here? Signing in with Google creates your account automatically.
      </p>
    </div>
  );
};

export default GoogleSignIn;
