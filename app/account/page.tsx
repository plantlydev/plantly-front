"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/SessionProvider";

const PATH = "/account";

/**
 * 내 계정. 지금은 계정 정보 확인과 회원 탈퇴 입구만 있는 최소 화면이다(정보 수정은 아직 없다).
 * 헤더의 이름을 누르면 온다. 정보는 이미 세션 컨텍스트(`GET /users/me`)에 있어 따로 부르지 않는다.
 */
export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(PATH)}`);
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="px-4 py-16 text-center text-sm text-muted sm:px-[30px]">불러오는 중…</div>;
  }

  return (
    <div className="px-4 py-12 sm:px-[30px]">
      <div className="mx-auto w-full max-w-[460px]">
        <h1 className="text-[26px] leading-tight">내 계정</h1>

        <dl className="mt-6 flex flex-col gap-3 rounded border border-line px-4 py-3.5 text-[14px]">
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-faint">이름</dt>
            <dd className="text-ink">{user.name}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-faint">이메일</dt>
            <dd className="break-all text-ink">{user.email}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-faint">가입일</dt>
            {/* LocalDateTime 문자열(2026-11-18T10:00:00)의 날짜 부분만. 시간대 변환은 하지 않는다. */}
            <dd className="text-ink">{user.createdAt.slice(0, 10)}</dd>
          </div>
        </dl>

        <div className="mt-10 border-t border-line pt-5">
          <Link href="/account/withdraw" className="text-[13px] text-muted underline">
            회원 탈퇴
          </Link>
        </div>
      </div>
    </div>
  );
}
