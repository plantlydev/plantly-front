/**
 * 회원 탈퇴. 다른 도메인 API 파일(lib/auth.ts 등)과 같은 모양이다.
 *
 * 탈퇴는 API 한 번으로 끝나지 않는다 — **소셜 본인 확인(재인가)을 거쳐 백엔드 콜백에서 일어난다.**
 *
 *   [탈퇴 화면] GET  /users/me/withdrawal  → 함께 지워질 기업·초안 수, 본인 확인 제공자
 *   [탈퇴 버튼] POST /users/me/withdrawal  → 백엔드가 세션에 "탈퇴 의도"를 적고(10분, 1회용) reauthUrl 을 준다
 *              → 브라우저를 reauthUrl(/oauth2/authorization/{naver|google}?withdrawal={1회용 난수})로 페이지째 이동
 *                (난수는 그대로 넘기기만 한다 — 이 인가 요청의 콜백만 탈퇴로 처리하게 백엔드가 묶는 표시다)
 *              → 제공자 확인(네이버: 비밀번호 재입력 / Google: 계정 선택) → 백엔드 콜백이 판정해서 프론트 화면으로 302:
 *                  같은 회원      → /withdrawn                 (탈퇴 완료, 로그아웃됨)
 *                                   /withdrawn?unlinkFailed=NAVER  (탈퇴는 됐고 제공자 연동 해제만 실패)
 *                  다른 회원 계정 → /login?error=WITHDRAWAL_REAUTH_MISMATCH  (탈퇴 안 함, 로그아웃됨)
 *                  그 밖         → /account/withdraw?error={코드}         (탈퇴 안 함, 로그인 유지)
 */

import { api } from "@/lib/api";
import type { SocialProvider, WithdrawalPreview, WithdrawalStartResponse } from "@/types/api";

/**
 * 탈퇴 확인 화면 정보. 탈퇴할 수 없는 회원이면 여기서 이미 403 이 온다 —
 * `ADMIN_WITHDRAWAL_NOT_ALLOWED`(관리자), `WITHDRAWAL_NOT_ALLOWED`(정지 등), `SOCIAL_ACCOUNT_REQUIRED`(소셜 연결 없음).
 * 셋 다 `ApiError.message` 를 그대로 보여 주면 된다.
 */
export function getWithdrawalPreview(signal?: AbortSignal): Promise<WithdrawalPreview> {
  return api.get<WithdrawalPreview>("/users/me/withdrawal", undefined, signal);
}

/** 탈퇴 시작. **아직 아무것도 지우지 않는다** — 응답의 reauthUrl 로 이동해 본인 확인을 마쳐야 탈퇴된다. */
export function startWithdrawal(): Promise<WithdrawalStartResponse> {
  return api.post<WithdrawalStartResponse>("/users/me/withdrawal");
}

export const PROVIDER_LABELS: Record<SocialProvider, string> = { NAVER: "네이버", GOOGLE: "Google" };

/**
 * 백엔드가 `/account/withdraw?error=` 로 넘기는 코드별 안내. 이때는 탈퇴되지 않았고 로그인도 그대로다.
 * 코드는 백엔드 WithdrawalReauthErrorCode·WithdrawalErrorCode 상수명. 모르는 코드는 FAILED 문구.
 */
const ERROR_MESSAGES: Record<string, string> = {
  WITHDRAWAL_REAUTH_MISMATCH:
    "가입할 때 사용한 계정과 다른 계정으로 확인되어 탈퇴하지 않았습니다. 가입한 계정으로 다시 확인해 주세요.",
  WITHDRAWAL_REAUTH_FAILED: "본인 확인을 마치지 못해 탈퇴하지 않았습니다. 다시 시도해 주세요.",
  WITHDRAWAL_SESSION_EXPIRED: "탈퇴를 시작한 지 10분이 지났습니다. 다시 시도해 주세요.",
  ADMIN_WITHDRAWAL_NOT_ALLOWED: "관리자 계정은 탈퇴할 수 없습니다.",
  WITHDRAWAL_NOT_ALLOWED: "탈퇴할 수 없는 계정 상태입니다. 고객센터로 문의해 주세요.",
  SOCIAL_ACCOUNT_REQUIRED: "본인 확인에 쓸 소셜 계정 연결이 없습니다. 고객센터로 문의해 주세요.",
};

export function withdrawalErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.WITHDRAWAL_REAUTH_FAILED;
}

/**
 * 연동 해제가 실패했을 때 사용자가 직접 끊을 수 있는 제공자 설정 화면.
 * 탈퇴는 이미 끝났고, 제공자 쪽에 "Plantly 에 정보 제공 동의"가 남아 있을 뿐이다(우리 쪽에 남은 개인정보는 없다).
 * 메뉴 경로는 2026-11-19 실제 키 확인(탈퇴 5단계)에서 연동 해제 뒤 목록에서 사라지는 것을 본 화면이다.
 * 제공자가 메뉴를 바꿀 수 있으니 안내가 어긋난다는 문의가 오면 다시 열어 보고 맞춘다.
 */
export const PROVIDER_CONNECTIONS: Record<SocialProvider, { url: string; path: string }> = {
  NAVER: {
    url: "https://nid.naver.com/internalToken/view/tokenList/form",
    path: "네이버ID › 이력관리 › 연결된 서비스 관리",
  },
  GOOGLE: {
    url: "https://myaccount.google.com/connections",
    path: "Google 계정 › 연결된 앱",
  },
};

/** `?unlinkFailed=NAVER,GOOGLE` 를 아는 제공자만 골라 읽는다(주소창 값이라 모르는 값은 버린다). */
export function parseUnlinkFailed(value: string | string[] | undefined): SocialProvider[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is SocialProvider => v in PROVIDER_CONNECTIONS)
    .filter((v, i, all) => all.indexOf(v) === i);
}
