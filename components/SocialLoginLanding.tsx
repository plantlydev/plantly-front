"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/SessionProvider";
import { takeNext } from "@/lib/socialLogin";

/**
 * 소셜 로그인을 마치고 `/` 에 도착했을 때, 출발하면서 적어 둔 화면(next)으로 보낸다.
 *
 * 백엔드는 로그인 성공 뒤 항상 `/` 로 보낸다(lib/socialLogin.ts 참고). 그래서 "로그인된 채 `/` 에 왔고
 * 적어 둔 next 가 있다"를 소셜 로그인 직후로 본다. 다른 화면에서는 아무것도 하지 않는다.
 * 그리는 것은 없다 — layout 이 SessionProvider 안에 한 번 둔다.
 */
export default function SocialLoginLanding() {
  const { user, loading } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || pathname !== "/") return;
    const next = takeNext();
    // replace 라서 뒤로 가기를 눌러도 거쳐 온 `/` 로 돌아오지 않는다.
    if (next) router.replace(next);
  }, [loading, user, pathname, router]);

  return null;
}
