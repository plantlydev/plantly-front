"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { ApiError } from "@/lib/api";
import { login } from "@/lib/auth";
import { safeNext, socialLoginErrorMessage, startSocialLogin } from "@/lib/socialLogin";

/**
 * 이메일·비밀번호 로그인 폼을 보일지. **로컬 개발 전용**(시드 계정으로 들어가기 위한 것)이다.
 * 운영은 소셜 로그인 전용이라 백엔드가 이 API 를 404 로 막는다(app.auth.local-login-enabled=false).
 * `.env.local` 에 `NEXT_PUBLIC_LOCAL_LOGIN=true` 를 넣으면 보인다. 빌드할 때 값이 박히므로 운영 빌드에는 넣지 않는다.
 */
const LOCAL_LOGIN = process.env.NEXT_PUBLIC_LOCAL_LOGIN === "true";

/**
 * 로그인 화면. 기본은 소셜 로그인 버튼 두 개(네이버·Google)다(흐름은 lib/socialLogin.ts).
 *
 * 소셜 로그인이 실패하면 백엔드가 `/login?error={코드}` 로 돌려보낸다 — 코드별 안내를 위에 띄운다.
 *
 * 인증은 세션 쿠키(JSESSIONID)라 로그인의 결과물은 화면이 들고 있는 토큰이 아니라 **쿠키**다.
 * 그래서 여기서 저장하는 건 아무것도 없고, 성공 뒤에 할 일은 두 가지뿐이다 —
 * 세션 컨텍스트를 다시 읽게 하고(헤더가 바뀐다), 원래 보던 화면으로 돌려보낸다.
 *
 * `searchParams` 를 `use()` 로 푸는 이유는 상세 화면과 같다(클라이언트에서는 await 를 못 쓴다).
 * `useSearchParams()` 훅을 쓰면 정적 프리렌더 때문에 Suspense 경계를 따로 둬야 해서 이쪽이 짧다.
 */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error: errorCode } = use(searchParams);
  const nextParam = typeof next === "string" ? next : null;
  const socialError = typeof errorCode === "string" ? socialLoginErrorMessage(errorCode) : "";

  const target = safeNext(nextParam);

  const session = useSession();

  if (session.user) {
    return (
      <div className="px-4 py-16 text-center sm:px-[30px]">
        <p className="text-sm text-muted">
          이미 <span className="text-ink">{session.user.name}</span> 님으로 로그인되어 있습니다.
        </p>
        <Link href={target} className="btn btn-secondary mt-4">
          돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-12 sm:px-[30px]">
      <div className="mx-auto w-full max-w-[380px]">
        <h1 className="text-[26px] leading-tight">로그인</h1>
        <p className="mt-2 text-[13px] text-muted">
          담당자 연락처 확인, 좋아요·즐겨찾기와 기업정보 등록은 로그인 후 사용할 수 있습니다.
        </p>

        {socialError && (
          <p role="alert" className="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            {socialError}
          </p>
        )}

        {/*
          두 버튼 모두 페이지째 이동한다(fetch 가 아니다).
          처음 온 사람도 같은 버튼이다 — 백엔드가 가입 화면(/signup/social)으로 이어 준다.
          ?next= 가 없으면(소셜 로그인이 실패해 ?error= 로 돌아온 경우 등) 출발할 때 적어 둔 값을 그대로 이어 쓴다.
        */}
        <div className="mt-6 flex flex-col gap-2.5">
          {/* 네이버 공식 색(#03C75A)과 흰 글자. */}
          <button
            type="button"
            onClick={() => startSocialLogin("NAVER", nextParam)}
            className="flex h-[44px] w-full items-center justify-center gap-2 rounded bg-[#03C75A] text-[15px] font-semibold text-white hover:bg-[#02b350]"
          >
            <span aria-hidden className="text-[17px] font-black leading-none">
              N
            </span>
            네이버로 시작하기
          </button>

          {/*
            Google 브랜딩 가이드(Sign in with Google)를 따른다 — 흰 배경·회색 테두리(#747775)·짙은 글자(#1F1F1F),
            왼쪽에 원래 색 그대로의 G 로고. 로고 색·비율은 바꾸지 않는다(동의 화면 게시 심사에서 볼 수 있다).
            문구는 가이드의 "Continue with Google" 한국어판이다.
          */}
          <button
            type="button"
            onClick={() => startSocialLogin("GOOGLE", nextParam)}
            className="flex h-[44px] w-full items-center justify-center gap-2.5 rounded border border-[#747775] bg-white text-[15px] font-medium text-[#1F1F1F] hover:bg-[#F7F8F8]"
          >
            <GoogleLogo />
            Google로 계속하기
          </button>
        </div>
        <p className="mt-3 text-[12px] text-faint">
          처음이시면 로그인 후 약관 동의 화면으로 이어져 바로 가입됩니다.
        </p>

        {LOCAL_LOGIN && <LocalLoginForm target={target} />}
      </div>
    </div>
  );
}

/** Google 표준 G 로고(4색). 브랜딩 가이드가 정한 모양 그대로다 — 색이나 비율을 바꾸지 않는다. */
function GoogleLogo() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * 이메일·비밀번호 로그인(로컬 개발 전용, LOCAL_LOGIN). 시드 계정(admin@plantly.local 등, 비밀번호 Password1!)으로 들어간다.
 */
function LocalLoginForm({ target }: { target: string }) {
  const router = useRouter();
  const session = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
      // 헤더가 곧바로 이름을 보여주도록 세션을 다시 읽는다. 이동보다 먼저 해야 새 화면이 옛 상태로 그려지지 않는다.
      await session.refresh();
      // replace 라서 뒤로 가기를 눌러도 로그인 화면으로 돌아오지 않는다.
      router.replace(target);
    } catch (e) {
      /*
       * 서버가 상태 코드마다 다른 한국어 문장을 준다 —
       * 401 자격증명 불일치 / 403 정지·탈퇴 계정 / 400 형식 위반(길이·특수문자).
       * 여기서 401 을 "로그인 필요"로 해석해 로그인 화면으로 보내면 제자리를 맴돈다.
       * 404 는 백엔드에서 자체 로그인이 꺼진 것이다(app.auth.local-login-enabled).
       */
      setError(e instanceof ApiError ? e.message : "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
      // 성공했을 때는 submitting 을 되돌리지 않는다 — 화면이 곧 바뀌는데 버튼만 잠깐 되살아난다.
    }
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <p className="font-heading text-[11px] tracking-[0.08em] text-faint">로컬 개발용 · 이메일 로그인</p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="font-heading text-[11px] tracking-[0.08em] text-faint">
            이메일
          </label>
          <input
            id="email"
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
            // 자동 채움이 끝나기 전에 커서를 옮기지 않도록 첫 칸에만 준다.
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="font-heading text-[11px] tracking-[0.08em] text-faint"
          >
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {/* 서버가 준 문장을 그대로 보여준다. role="alert" 라 스크린리더가 바뀐 순간 읽는다. */}
        {error && (
          <p role="alert" className="text-[13px] text-red-600">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-1 h-[38px]" disabled={submitting}>
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
