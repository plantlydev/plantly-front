"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { getPendingSocialSignup, socialSignup } from "@/lib/auth";
import { authorizationUrl } from "@/lib/socialLogin";
import type { ConsentType, PendingSocialSignup } from "@/types/api";

/** 동의 항목 문구. 항목(순서·필수 여부)은 서버가 정하고, 화면은 이름만 붙인다. 모르는 항목은 상수명 그대로 보인다 */
const CONSENT_LABELS: Record<ConsentType, string> = {
  AGE_OVER_14: "만 14세 이상입니다",
  TERMS_OF_SERVICE: "이용약관 동의",
  PRIVACY_COLLECTION: "개인정보 수집·이용 동의",
  MARKETING: "광고성 정보 수신 동의",
};

const PROVIDER_LABELS: Record<string, string> = { NAVER: "네이버", GOOGLE: "구글" };

/**
 * 소셜 가입 화면. 네이버 로그인을 했는데 연결된 회원이 없으면 백엔드가 여기로 보낸다(lib/socialLogin.ts).
 *
 * 이 화면은 로그인 상태가 아니다. 근거는 백엔드 세션의 "가입 대기 정보"(10분)이고, 없거나 만료되면
 * API 가 401 `SIGNUP_SESSION_EXPIRED` 를 준다 — 그때는 로그인 화면으로 보내 네이버 로그인부터 다시 하게 한다.
 *
 * 가입 API 는 로그인시키지 않는다. 성공하면 응답의 loginUrl(/oauth2/authorization/naver)로 페이지째 이동하고,
 * 네이버에 이미 동의한 상태라 바로 돌아오면서 이번엔 로그인된다. 출발 전 화면(next)도 그때 이어진다.
 */
export default function SocialSignupPage() {
  const router = useRouter();

  const [pending, setPending] = useState<PendingSocialSignup | null>(null);
  const [loadError, setLoadError] = useState("");
  const [agreed, setAgreed] = useState<Set<ConsentType>>(new Set());
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getPendingSocialSignup(controller.signal).then(setPending, (e: unknown) => {
      if (controller.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login?error=SIGNUP_SESSION_EXPIRED");
        return;
      }
      setLoadError(e instanceof ApiError ? e.message : "가입 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    });
    return () => controller.abort();
  }, [router]);

  if (loadError) {
    return (
      <div className="px-4 py-16 text-center sm:px-[30px]">
        <p role="alert" className="text-sm text-red-600">
          {loadError}
        </p>
      </div>
    );
  }

  if (!pending) {
    return <div className="px-4 py-16 text-center text-sm text-muted sm:px-[30px]">불러오는 중…</div>;
  }

  const provider = pending.provider;
  const needsName = pending.name === null;
  const allAgreed = pending.consents.every((c) => agreed.has(c.type));
  const requiredAgreed = pending.consents.every((c) => !c.required || agreed.has(c.type));
  const canSubmit = requiredAgreed && (!needsName || name.trim() !== "") && !submitting;

  function toggle(type: ConsentType) {
    setAgreed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleAll() {
    setAgreed(allAgreed ? new Set() : new Set(pending!.consents.map((c) => c.type)));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setSubmitting(true);
    try {
      const { loginUrl } = await socialSignup({
        agreements: [...agreed],
        ...(needsName ? { name: name.trim() } : {}),
      });
      // 페이지째 이동한다 — 백엔드 OAuth2 경로라 라우터로는 갈 수 없다.
      window.location.assign(loginUrl);
      // 성공했을 때는 submitting 을 되돌리지 않는다 — 곧 페이지가 바뀐다.
    } catch (e) {
      if (e instanceof ApiError) {
        switch (e.code) {
          case "SIGNUP_SESSION_EXPIRED":
          case "EMAIL_IN_USE":
            router.replace(`/login?error=${e.code}`);
            return;
          case "ALREADY_SIGNED_UP":
            // 같은 계정이 이미 가입됐다(버튼 연타 등). 로그인만 하면 된다.
            window.location.assign(authorizationUrl(provider));
            return;
        }
        // 필수 동의 누락·이름 규칙 위반 등. 검증 실패면 첫 위반 문구가 message 에 들어 있다.
        setError(e.message);
      } else {
        setError("가입하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-12 sm:px-[30px]">
      <div className="mx-auto w-full max-w-[420px]">
        <h1 className="text-[26px] leading-tight">회원가입</h1>
        <p className="mt-2 text-[13px] text-muted">
          {PROVIDER_LABELS[provider] ?? provider} 계정으로 가입합니다. 약관에 동의하면 가입이 완료됩니다.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
          <dl className="flex flex-col gap-3 rounded border border-line px-4 py-3.5 text-[14px]">
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 text-faint">이메일</dt>
              <dd className="break-all text-ink">{pending.email}</dd>
            </div>
            {!needsName && (
              <div className="flex gap-3">
                <dt className="w-12 shrink-0 text-faint">이름</dt>
                <dd className="text-ink">{pending.name}</dd>
              </div>
            )}
          </dl>

          {needsName && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="font-heading text-[11px] tracking-[0.08em] text-faint">
                이름
              </label>
              <input
                id="name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="한글 또는 영문 2~30자"
                maxLength={30}
                required
              />
            </div>
          )}

          <fieldset className="flex flex-col rounded border border-line py-1">
            <legend className="sr-only">약관 동의</legend>
            <ConsentRow label="전체 동의" strong checked={allAgreed} onChange={toggleAll} />
            {pending.consents.map((consent) => (
              <ConsentRow
                key={consent.type}
                label={CONSENT_LABELS[consent.type] ?? consent.type}
                tag={consent.required ? "필수" : "선택"}
                checked={agreed.has(consent.type)}
                onChange={() => toggle(consent.type)}
              />
            ))}
          </fieldset>
          {/* 약관 본문은 출시 전에 확정해 각 항목에 링크로 붙인다. */}
          <p className="-mt-2 text-[12px] text-faint">약관 본문은 준비 중입니다.</p>

          {error && (
            <p role="alert" className="text-[13px] text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary h-[42px]" disabled={!canSubmit}>
            {submitting ? "가입 중…" : "동의하고 가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 체크 줄은 패싯과 같은 .ck/.bx 를 쓴다(네이티브 체크박스는 sr-only 로 살아 있어 키보드·스크린리더는 그대로다).
function ConsentRow({
  label,
  tag,
  strong,
  checked,
  onChange,
}: {
  label: string;
  tag?: string;
  strong?: boolean;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className={`ck px-4 py-2 text-[14px] ${checked ? "on" : ""} ${strong ? "border-b border-line" : ""}`}>
      <label className="ckbody">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <span className="bx" aria-hidden>
          <CheckIcon size={9} />
        </span>
        <span className={`cktext flex-1 text-[14px] ${strong ? "font-semibold" : ""}`}>{label}</span>
        {tag && <span className={`text-[12px] ${tag === "필수" ? "text-ink" : "text-faint"}`}>({tag})</span>}
      </label>
    </div>
  );
}
