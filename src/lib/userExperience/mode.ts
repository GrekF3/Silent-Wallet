"use client";

import { useEffect, useState } from "react";

export type CryptoExperience = "new" | "basics" | "experienced";

export type UserExperienceState = {
  onboardingComplete: boolean;
  cryptoExperience: CryptoExperience;
  beginnerMode: boolean;
};

const KEY = "silent_user_experience_v1";
const EVENT = "silent-user-experience-change";

function defaultBeginnerMode() {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_BEGINNER_MODE;
  return raw === undefined ? true : ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function fallbackState(): UserExperienceState {
  return {
    onboardingComplete: false,
    cryptoExperience: "new",
    beginnerMode: defaultBeginnerMode(),
  };
}

function normalizeExperience(value: unknown): CryptoExperience {
  return value === "basics" || value === "experienced" ? value : "new";
}

export function readUserExperience(): UserExperienceState {
  if (typeof window === "undefined") return fallbackState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallbackState();
    const parsed = JSON.parse(raw) as Partial<UserExperienceState>;
    return {
      onboardingComplete: !!parsed.onboardingComplete,
      cryptoExperience: normalizeExperience(parsed.cryptoExperience),
      beginnerMode: typeof parsed.beginnerMode === "boolean" ? parsed.beginnerMode : defaultBeginnerMode(),
    };
  } catch {
    return fallbackState();
  }
}

function writeUserExperience(state: UserExperienceState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT));
}

export function updateUserExperience(patch: Partial<UserExperienceState>) {
  writeUserExperience({ ...readUserExperience(), ...patch });
}

export function completeOnboarding(cryptoExperience: CryptoExperience, beginnerMode?: boolean) {
  const nextBeginnerMode = beginnerMode ?? cryptoExperience !== "experienced";
  writeUserExperience({
    onboardingComplete: true,
    cryptoExperience,
    beginnerMode: nextBeginnerMode,
  });
}

export function skipOnboarding() {
  writeUserExperience({ ...readUserExperience(), onboardingComplete: true });
}

export function hasCompletedOnboarding() {
  return readUserExperience().onboardingComplete;
}

export function isBeginnerModeEnabled() {
  return readUserExperience().beginnerMode;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useUserExperience() {
  const [state, setState] = useState(readUserExperience);
  useEffect(() => subscribe(() => setState(readUserExperience())), []);
  return state;
}
