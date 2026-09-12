// Guest first, account as an upgrade — never a gate.
//
// On first visit we try to make a real anonymous auth user (a signed JWT, so
// Row Level Security can enforce "own rows only"). Creating an account later
// CONVERTS that same user, so every row already keyed to it carries over.
// If the project has anonymous sign-ins switched off, the app keeps working
// on this device only ("local") and says so.

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthStatus = "loading" | "local" | "guest" | "account";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  email: string | null;
  pendingEmail: string | null; // set when a confirmation email is on its way
  error: string | null;
}

const listeners = new Set<() => void>();
let state: AuthState = { status: supabase ? "loading" : "local", user: null, email: null, pendingEmail: null, error: null };

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function fromUser(user: User | null): Partial<AuthState> {
  if (!user) return { status: "local", user: null, email: null, pendingEmail: null };
  const confirmed = Boolean(user.email && !user.new_email);
  return {
    status: confirmed ? "account" : "guest",
    user,
    email: confirmed ? (user.email ?? null) : null,
    pendingEmail: user.new_email ?? (user.email && !confirmed ? user.email : null),
  };
}

let booted = false;
async function boot() {
  if (booted || !supabase) return;
  booted = true;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    set(fromUser(data.session.user));
  } else {
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.user) {
      // Anonymous sign-ins are off on this project: stay local, no fuss.
      set({ status: "local", user: null, email: null, error: null });
    } else {
      set(fromUser(anon.user));
    }
  }
  supabase.auth.onAuthStateChange((_evt, session) => {
    set(fromUser(session?.user ?? null));
  });
}

export function getAuth(): AuthState {
  return state;
}

export function useAuth() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    void boot();
    return () => {
      listeners.delete(l);
    };
  }, []);

  const createAccount = useCallback(async (email: string, password: string) => {
    if (!supabase) return "No database on this build.";
    set({ error: null });
    if (state.user && state.status === "guest") {
      // Convert the guest — same user id, every row carries over.
      const { data, error } = await supabase.auth.updateUser({ email, password });
      if (error) {
        set({ error: error.message });
        return error.message;
      }
      set(fromUser(data.user));
      return null;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message });
      return error.message;
    }
    if (data.user) set(fromUser(data.user));
    return null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "No database on this build.";
    set({ error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      return error.message;
    }
    set(fromUser(data.user));
    return null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Back to guest, not to a dead end.
    const { data } = await supabase.auth.signInAnonymously();
    set(fromUser(data.user ?? null));
  }, []);

  return { ...state, createAccount, signIn, signOut, enabled: Boolean(supabase) };
}
