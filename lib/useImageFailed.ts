"use client";

import { useCallback, useState } from "react";

/**
 * 이미지 주소가 있는데 **불러오기에 실패했는지**. 실패하면 화면은 "주소가 없을 때"와 같은 대체 표시로 떨어진다
 * (로고는 이름 두 글자, 커버는 해칭 무늬 등). 주소가 있다고 이미지가 있다는 보장은 없다 —
 * 저장소에서 파일이 지워졌거나, 이미지 호스트가 일시 장애이거나(로컬 시드의 picsum.photos 가 멈췄던 적이 있다),
 * 주소 자체가 잘못됐을 수 있다. 대체 표시가 없으면 브라우저의 깨진 이미지 아이콘이 그대로 보인다.
 *
 * 쓰는 법: `const { failed, imgProps } = useImageFailed(url)` → `failed` 면 대체 표시, 아니면 `<img {...imgProps} />`.
 *
 * - 실패를 "주소별로" 기억한다. 주소가 바뀌면(다른 이미지로 교체) 다시 시도한다 — effect 로 초기화할 필요가 없다.
 * - ref 콜백에서도 한 번 본다. 서버가 그린 `<img>` 는 React 가 붙기(하이드레이션) 전에 실패할 수 있고,
 *   그러면 onError 는 이미 지나간 뒤라 영영 오지 않는다. 그때는 `complete && naturalWidth === 0` 이 실패 표시다.
 *   (아직 받지 않은 lazy 이미지는 complete 가 false 라 여기 걸리지 않는다. SVG 는 업로드가 받지 않으므로
 *   "크기 없는 정상 이미지"를 실패로 오판할 일도 없다.)
 */
export function useImageFailed(url: string | null) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const markFailed = useCallback(() => {
    if (url) setFailedUrl(url);
  }, [url]);

  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && img.complete && img.naturalWidth === 0) markFailed();
    },
    [markFailed],
  );

  return {
    failed: url !== null && failedUrl === url,
    imgProps: { ref, onError: markFailed },
  };
}
