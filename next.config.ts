import type { NextConfig } from "next";

// 백엔드(Spring)는 별도 프로세스로 8080 에서 돈다. /api/*(와 소셜 로그인 경로)를 그쪽으로 프록시해서
// 브라우저 입장에서는 모두 같은 오리진(localhost:3000)이 되게 한다.
//
// 이렇게 하면 세션 쿠키(JSESSIONID)와 CSRF 쿠키(XSRF-TOKEN)가 별도 설정 없이 그대로 붙고,
// CORS 프리플라이트도 타지 않는다. 프론트 코드에서는 항상 상대경로("/api/v1/...")만 쓴다.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
      // 소셜 로그인. API 호출이 아니라 브라우저가 페이지째 이동하는 경로다.
      //   /oauth2/authorization/{제공자} : 로그인 시작 → 백엔드가 제공자 로그인 화면으로 302
      //   /login/oauth2/code/{제공자}    : 제공자가 돌려보내는 콜백 → 백엔드가 판정 후 프론트 화면으로 302
      // 302 와 Set-Cookie 는 그대로 브라우저에 전달된다(실측). 콜백 주소가 3000 이라 네이버 개발자센터에도
      // http://localhost:3000/login/oauth2/code/naver 로 등록한다. /login 화면과는 경로가 겹치지 않는다.
      {
        source: "/oauth2/:path*",
        destination: `${BACKEND_ORIGIN}/oauth2/:path*`,
      },
      {
        source: "/login/oauth2/:path*",
        destination: `${BACKEND_ORIGIN}/login/oauth2/:path*`,
      },
    ];
  },
};

export default nextConfig;