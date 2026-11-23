import type { Metadata } from "next";
import Link from "next/link";
import { PROVIDER_CONNECTIONS, PROVIDER_LABELS, parseUnlinkFailed } from "@/lib/withdrawal";

export const metadata: Metadata = {
  title: "탈퇴 완료 — 플랜틀리",
};

/**
 * 탈퇴 완료 화면. 백엔드 콜백이 탈퇴를 마치고 세션을 끝낸 뒤 보내는 곳이라, 도착했을 땐 이미 로그아웃 상태다.
 * 백엔드를 부르지 않으므로 서버 컴포넌트로 둔다(주소의 searchParams 만 읽는다).
 *
 * `?unlinkFailed=NAVER` 가 붙어 오면 탈퇴는 됐지만 제공자 쪽 연동 해제가 실패한 것이다.
 * 백엔드는 재시도하지 않는다(해제에 쓴 토큰은 세션과 함께 사라진다) — 사용자가 직접 끊는 방법을 안내한다.
 */
export default async function WithdrawnPage({ searchParams }: PageProps<"/withdrawn">) {
  const { unlinkFailed } = await searchParams;
  const failed = parseUnlinkFailed(unlinkFailed);

  return (
    <div className="px-4 py-16 sm:px-[30px]">
      <div className="mx-auto w-full max-w-[460px] text-center">
        <h1 className="text-[26px] leading-tight">탈퇴가 완료되었습니다</h1>
        <p className="mt-3 text-[14px] text-muted">그동안 플랜틀리를 이용해 주셔서 감사합니다.</p>

        {failed.length > 0 && (
          <section className="mt-8 rounded border border-line px-4 py-4 text-left text-[14px]">
            <h2 className="text-[15px] font-semibold">소셜 계정 연결 해제 안내</h2>
            <p className="mt-2 text-ink">
              탈퇴는 정상적으로 처리되었지만, {failed.map((p) => PROVIDER_LABELS[p]).join("·")} 계정에서 플랜틀리
              연결을 해제하지 못했습니다. 플랜틀리에 남은 회원 정보는 없으며, 원하시면 아래에서 직접 연결을 해제할 수
              있습니다.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {failed.map((provider) => (
                <li key={provider}>
                  <a
                    href={PROVIDER_CONNECTIONS[provider].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand"
                  >
                    {PROVIDER_LABELS[provider]} 연결된 서비스 관리 열기
                  </a>
                  <span className="block text-[12px] text-faint">{PROVIDER_CONNECTIONS[provider].path}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href="/" className="btn btn-primary mt-8">
          홈으로
        </Link>
      </div>
    </div>
  );
}
