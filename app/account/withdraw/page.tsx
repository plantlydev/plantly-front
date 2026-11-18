"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { CheckIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import {
  PROVIDER_LABELS,
  getWithdrawalPreview,
  startWithdrawal,
  withdrawalErrorMessage,
} from "@/lib/withdrawal";
import type { WithdrawalPreview } from "@/types/api";

const PATH = "/account/withdraw";

/**
 * 회원 탈퇴 확인 화면. 흐름 전체는 lib/withdrawal.ts 주석.
 *
 * 이 화면의 버튼은 탈퇴하지 않는다 — 백엔드에 "탈퇴 의도"를 적고 소셜 본인 확인으로 페이지째 보낸다.
 * 탈퇴는 확인을 마치고 돌아온 백엔드 콜백에서 일어나고, 그 결과로 /withdrawn 에 도착한다.
 * 확인이 실패하면 백엔드가 `?error=` 를 붙여 이 화면으로 돌려보낸다(로그인은 그대로).
 *
 * `searchParams` 를 `use()` 로 푸는 이유는 로그인 화면과 같다.
 */
export default function WithdrawPage({ searchParams }: PageProps<"/account/withdraw">) {
  const { error: errorCode } = use(searchParams);
  const returnedError = typeof errorCode === "string" ? withdrawalErrorMessage(errorCode) : "";

  const router = useRouter();
  const { user, loading } = useSession();

  const [preview, setPreview] = useState<WithdrawalPreview | null>(null);
  // 탈퇴할 수 없는 회원(관리자·정지·소셜 연결 없음)이거나 불러오기 실패. 버튼을 그리지 않는다.
  const [blocked, setBlocked] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 비로그인이면 로그인 뒤 여기로 돌아오게 보낸다(내 기업 화면과 같은 방식).
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(PATH)}`);
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    getWithdrawalPreview(controller.signal).then(setPreview, (e: unknown) => {
      if (controller.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(PATH)}`);
        return;
      }
      setBlocked(e instanceof ApiError ? e.message : "탈퇴 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    });
    return () => controller.abort();
  }, [user, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || submitting) return;

    setError("");
    setSubmitting(true);
    try {
      const { reauthUrl } = await startWithdrawal();
      // 페이지째 이동한다 — 백엔드 OAuth2 경로라 라우터로는 갈 수 없다. 성공 시 submitting 은 되돌리지 않는다.
      window.location.assign(reauthUrl);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(PATH)}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : "탈퇴를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return <div className="px-4 py-16 text-center text-sm text-muted sm:px-[30px]">불러오는 중…</div>;
  }

  return (
    <div className="px-4 py-12 sm:px-[30px]">
      <div className="mx-auto w-full max-w-[460px]">
        <h1 className="text-[26px] leading-tight">회원 탈퇴</h1>
        <p className="mt-2 text-[13px] text-muted">
          <span className="text-ink">{user.name}</span> 님({user.email}) 계정을 탈퇴합니다.
        </p>

        {returnedError && (
          <p role="alert" className="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            {returnedError}
          </p>
        )}

        {blocked ? (
          <div className="mt-6">
            <p role="alert" className="rounded border border-line px-4 py-3.5 text-[14px] text-ink">
              {blocked}
            </p>
            <Link href="/account" className="btn btn-secondary mt-4">
              돌아가기
            </Link>
          </div>
        ) : !preview ? (
          <div className="mt-6 text-sm text-muted">불러오는 중…</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
            <section className="rounded border border-line px-4 py-3.5 text-[14px]">
              <h2 className="text-[15px] font-semibold">탈퇴하면 이렇게 됩니다</h2>
              <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-ink">
                <li>
                  등록한 기업 <strong>{preview.ownedCompanyCount}곳</strong>이 함께 삭제되어 더 이상 공개되지 않습니다.
                  기업 정보의 대표자명은 익명 처리되고 연락처는 삭제됩니다.
                </li>
                {preview.draftCount > 0 && (
                  <li>
                    작성 중인 임시저장 <strong>{preview.draftCount}건</strong>이 삭제됩니다.
                  </li>
                )}
                <li>좋아요·즐겨찾기와 이름·이메일 등 회원 정보가 삭제되며 되돌릴 수 없습니다.</li>
                <li>같은 소셜 계정으로는 24시간 뒤부터 다시 가입할 수 있습니다(새 회원으로 가입됩니다).</li>
              </ul>
            </section>

            <div className={`ck rounded border border-line px-4 py-2.5 text-[14px] ${confirmed ? "on" : ""}`}>
              <label className="ckbody">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span className="bx" aria-hidden>
                  <CheckIcon size={9} />
                </span>
                <span className="cktext flex-1 text-[14px]">위 내용을 확인했고 탈퇴에 동의합니다</span>
              </label>
            </div>

            <p className="-mt-2 text-[12px] text-faint">
              탈퇴 전에 {PROVIDER_LABELS[preview.provider]} 계정으로 본인 확인을 합니다. 확인을 마치면 바로 탈퇴됩니다.
            </p>

            {error && (
              <p role="alert" className="text-[13px] text-red-600">
                {error}
              </p>
            )}

            <div className="flex gap-2.5">
              <Link href="/account" className="btn btn-secondary h-[42px] flex-1 justify-center">
                취소
              </Link>
              <button
                type="submit"
                className="btn h-[42px] flex-1 justify-center bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={!confirmed || submitting}
              >
                {submitting ? "이동 중…" : `${PROVIDER_LABELS[preview.provider]}로 확인 후 탈퇴`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
