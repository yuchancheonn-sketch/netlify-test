import { RotatePhoneIcon } from "@/components/icons";

/**
 * 폰을 가로로 눕히면 화면을 덮고 세로로 돌려 달라고 합니다.
 *
 * ★ 진짜로 방향을 잠그는 것이 아닙니다. 잠글 방법이 없어서 덮습니다.
 *
 *   manifest의 `orientation: "portrait"`는 홈 화면에 추가한 안드로이드 앱만
 *   잡아 줍니다. 브라우저 탭으로 열면 듣지 않고, 아이폰은 홈 화면 앱에서도
 *   그 값을 보지 않습니다. screen.orientation.lock()도 iOS 사파리에는 없고
 *   안드로이드에서도 전체 화면일 때만 됩니다.
 *
 * ★ 화면을 통째로 90도 돌리는 방법은 쓰지 않았습니다.
 *   position: fixed의 기준이 함께 돌지 않아 알약탭과 채팅 입력창이 엉뚱한
 *   자리에 붙고, env(safe-area-*)의 위아래도 뒤바뀝니다. 이 앱은 그 둘에
 *   많이 기대고 있어서 잃는 것이 더 큽니다.
 *
 * 보이고 안 보이고는 CSS(globals.css의 .portrait-guard)가 정합니다.
 * 자바스크립트로 방향을 재지 않는 이유는, 리액트가 켜지기 전까지 한 박자
 * 늦어 가로로 뭉개진 화면이 잠깐 스쳐 지나가기 때문입니다.
 */
export default function PortraitGuard() {
  return (
    <div
      className="portrait-guard fixed inset-0 z-[100] flex-col items-center justify-center gap-5 bg-canvas px-8 text-center"
      role="alert"
    >
      <RotatePhoneIcon className="h-12 w-12 text-brand-500" />
      <p className="text-[17px] font-bold text-ink">화면을 세로로 돌려 주세요</p>
    </div>
  );
}
