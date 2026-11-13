/**
 * 소셜 로그인 흐름 중 프론트가 맡는 부분.
 *
 * 소셜 로그인은 fetch 가 아니라 **브라우저가 페이지째 이동**하는 흐름이다.
 *
 *   [네이버로 시작] → /oauth2/authorization/naver (백엔드, next.config 프록시)
 *     → 네이버 로그인·동의 → /login/oauth2/code/naver (백엔드 콜백)
 *     → 백엔드가 판정해서 프론트 화면으로 302:
 *        연결된 회원      → /                    (로그인 완료)
 *        처음 온 사람     → /signup/social       (가입 화면 → 가입 후 다시 /oauth2/authorization/naver)
 *        그 밖           → /login?error={코드}
 *
 * 백엔드는 로그인 성공 뒤 항상 `/` 로 보낸다. "원래 보던 화면으로 돌아가기(next)"는 프론트가 한다 —
 * 출발할 때 sessionStorage 에 적어 두고, 로그인된 채 `/` 에 도착하면 꺼내서 이동한다(SocialLoginLanding).
 * sessionStorage 는 탭 단위라 네이버를 다녀오고 가입 화면을 거쳐도 같은 탭이면 남아 있다.
 */

import type { SocialProvider } from "@/types/api";

const NEXT_KEY = "plantly.loginNext";
/** 이보다 오래된 next 는 버린다 — 로그인을 포기한 뒤 한참 지나 `/` 에 왔을 때 엉뚱한 곳으로 튀지 않게 */
const NEXT_TTL_MS = 15 * 60 * 1000;

/**
 * 소셜 로그인 시작. `next` 는 로그인 뒤 돌아갈 우리 사이트 안 경로다.
 * null 이면 이미 적어 둔 값을 그대로 둔다(시각만 새로) — 소셜 로그인이 실패해 `/login?error=` 로 돌아오면
 * 백엔드는 next 를 모르므로, 그 화면에서 다시 시도할 때 처음 출발한 화면을 잃지 않게 하기 위해서다.
 */
export function startSocialLogin(provider: SocialProvider, next: string | null) {
  if (next === null) touchNext();
  else rememberNext(next);
  window.location.assign(authorizationUrl(provider));
}

/** 백엔드의 인가 시작 주소. 가입 API 응답의 loginUrl 과 같은 모양이다. */
export function authorizationUrl(provider: SocialProvider): string {
  return `/oauth2/authorization/${provider.toLowerCase()}`;
}

function rememberNext(next: string) {
  const target = safeNext(next);
  try {
    if (target === "/") {
      sessionStorage.removeItem(NEXT_KEY);
    } else {
      sessionStorage.setItem(NEXT_KEY, JSON.stringify({ next: target, at: Date.now() }));
    }
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)이면 로그인 뒤 `/` 에 머문다. 로그인 자체는 된다.
  }
}

function touchNext() {
  try {
    const raw = sessionStorage.getItem(NEXT_KEY);
    if (!raw) return;
    const { next } = JSON.parse(raw) as { next?: unknown };
    if (typeof next === "string") rememberNext(next);
  } catch {
    // 위와 같다.
  }
}

/** 적어 둔 next 를 꺼내고 지운다. 없거나 오래됐거나 안전하지 않으면 null. */
export function takeNext(): string | null {
  try {
    const raw = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    if (!raw) return null;
    const { next, at } = JSON.parse(raw) as { next?: unknown; at?: unknown };
    if (typeof next !== "string" || typeof at !== "number" || Date.now() - at > NEXT_TTL_MS) return null;
    const target = safeNext(next);
    return target === "/" ? null : target;
  } catch {
    return null;
  }
}

/**
 * 로그인 뒤 돌아갈 곳. **반드시 우리 사이트 안의 경로여야 한다.**
 *
 * `?next=` 는 주소창으로 들어오는 값이라, 그대로 믿고 이동하면 로그인 링크를 미끼로 남의 사이트에
 * 떨어뜨릴 수 있다(오픈 리다이렉트). 그래서 `/` 로 시작하는 상대경로만 통과시키고,
 * `//evil.com` 이나 `/\evil.com` 처럼 브라우저가 다른 호스트로 해석하는 형태는 막는다.
 */
export function safeNext(value: string | null | undefined): string {
  return value && /^\/(?![/\\])/.test(value) ? value : "/";
}

/**
 * 백엔드가 `/login?error=` 로 넘기는 코드별 안내. 코드는 백엔드 SocialLoginErrorCode·SocialSignupErrorCode 상수명이다.
 * 모르는 코드는 SOCIAL_LOGIN_FAILED 문구로 보여 준다.
 */
const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_SUSPENDED: "이용이 제한된 계정입니다. 문의가 필요하면 고객센터로 연락해 주세요.",
  EMAIL_IN_USE: "같은 이메일로 가입된 계정이 이미 있습니다. 처음 가입한 방법으로 로그인해 주세요.",
  SIGNUP_SESSION_EXPIRED: "가입 가능 시간이 지났습니다. 네이버 로그인부터 다시 진행해 주세요.",
  SOCIAL_LOGIN_FAILED: "네이버 로그인을 마치지 못했습니다. 다시 시도해 주세요.",
};

export function socialLoginErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.SOCIAL_LOGIN_FAILED;
}
